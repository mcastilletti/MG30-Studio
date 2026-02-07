
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';

// Costanti Protocollo NUX MG-30
const NUX_HEADER = [0x00, 0x20, 0x6B];
const DEVICE_ID = 0x01;

// Mappatura Blocchi per SysEx
const BLOCK_IDS = {
  'noise-gate': 0x01,
  'compressor': 0x02,
  'efx': 0x03,
  'amp': 0x04,
  'eq': 0x05,
  'modulation': 0x06,
  'delay': 0x07,
  'reverb': 0x08
};

const BYPASS_CC = {
  'efx': 36,
  'amp': 37,
  'noise-gate': 38,
  'eq': 39,
  'modulation': 40,
  'delay': 41,
  'reverb': 42
};

const INITIAL_PRESETS: Preset[] = Array.from({ length: 56 }, (_, i) => ({
  slot: i + 1,
  name: `Slot ${String(i + 1).padStart(2, '0')}`,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX Modeling',
  effects: []
}));

interface MidiStore {
  status: MidiConnectionStatus;
  input: MIDIInput | null;
  output: MIDIOutput | null;
  availableDevices: { inputs: MidiDevice[], outputs: MidiDevice[] };
  devicePresets: Preset[];
  isSyncing: boolean;
  syncProgress: number;
  lastError: string | null;
  currentSyncSlot: number | null;
  
  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number) => void;
  sendParameter: (blockId: string, paramId: number, value: number) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  refreshDevices: () => void;
  syncPresets: () => Promise<void>;
  updatePresetName: (slot: number, newName: string) => void;
  handleIncomingMidi: (message: MIDIMessageEvent) => void;
}

export const useMidiStore = create<MidiStore>((set, get) => ({
  status: 'disconnected',
  input: null,
  output: null,
  availableDevices: { inputs: [], outputs: [] },
  devicePresets: INITIAL_PRESETS,
  isSyncing: false,
  syncProgress: 0,
  lastError: null,
  currentSyncSlot: null,

  initialize: async () => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      set({ status: 'error', lastError: 'Web MIDI API non supportata' });
      return;
    }

    set({ status: 'connecting' });

    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      
      const updateDevices = () => {
        const inputs: MidiDevice[] = [];
        const outputs: MidiDevice[] = [];
        
        midiAccess.inputs.forEach(port => {
          inputs.push({
            id: port.id,
            name: port.name || 'Unknown',
            manufacturer: port.manufacturer || 'Unknown',
            version: port.version || 'Unknown',
            state: port.state,
            connection: port.connection
          });
        });

        midiAccess.outputs.forEach(port => {
          outputs.push({
            id: port.id,
            name: port.name || 'Unknown',
            manufacturer: port.manufacturer || 'Unknown',
            version: port.version || 'Unknown',
            state: port.state,
            connection: port.connection
          });
        });

        set({ availableDevices: { inputs, outputs } });

        const nuxInput = Array.from(midiAccess.inputs.values()).find(i => 
          i.name?.toUpperCase().includes('NUX') || i.name?.toUpperCase().includes('MG-30')
        );
        const nuxOutput = Array.from(midiAccess.outputs.values()).find(o => 
          o.name?.toUpperCase().includes('NUX') || o.name?.toUpperCase().includes('MG-30')
        );

        if (nuxInput && nuxOutput) {
          nuxInput.onmidimessage = (msg) => get().handleIncomingMidi(msg);
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected' });
          console.log("%c[MIDI] Connesso a NUX MG-30", "color: #4CAF50; font-weight: bold;");
        } else {
          set({ status: 'disconnected' });
        }
      };

      midiAccess.onstatechange = updateDevices;
      updateDevices();

    } catch (err) {
      set({ status: 'error', lastError: 'Errore accesso MIDI' });
    }
  },

  handleIncomingMidi: (message) => {
    const data = message.data;
    const { currentSyncSlot, updatePresetName } = get();

    // Log completo per debugging dei dati in arrivo
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    console.log(`%c[MIDI IN] Len:${data.length} | ${hex}`, "color: #9C27B0; font-size: 10px;");
    
    // Cerchiamo stringhe ASCII nei messaggi (solitamente i dati preset sono > 50 byte)
    if (data.length > 20) {
      let foundName = "";
      let tempName = "";
      
      // Scansione per trovare sequenze di caratteri stampabili
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        if (byte >= 32 && byte <= 126) {
          tempName += String.fromCharCode(byte);
        } else {
          if (tempName.trim().length >= 4) {
            // Filtriamo nomi tecnici e header
            const candidate = tempName.trim();
            if (!["NUX", "MG-30", "VER", "HDR"].includes(candidate.toUpperCase())) {
              foundName = candidate;
              break; 
            }
          }
          tempName = "";
        }
      }

      if (foundName && currentSyncSlot !== null) {
        console.log(`%c[MG-30] NOME TROVATO: "${foundName}" per lo slot ${currentSyncSlot}`, "color: #00E676; font-weight: bold; padding: 2px; border: 1px solid #00E676;");
        updatePresetName(currentSyncSlot, foundName);
      }
    }
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
  },

  sendProgramChange: (pc) => {
    const { output } = get();
    if (output) {
      console.log(`[MIDI OUT] Program Change: ${pc}`);
      output.send([0xC0, pc]);
    }
  },

  sendParameter: (blockType, paramId, value) => {
    const { output } = get();
    if (!output) return;
    const blockId = BLOCK_IDS[blockType as keyof typeof BLOCK_IDS] || 0x01;
    const msg = [0xF0, ...NUX_HEADER, DEVICE_ID, 0x01, blockId, paramId, value, 0xF7];
    output.send(msg);
  },

  toggleBlock: (blockType, enabled) => {
    const cc = BYPASS_CC[blockType as keyof typeof BYPASS_CC];
    if (cc) {
      get().sendControlChange(cc, enabled ? 127 : 0);
    }
  },

  syncPresets: async () => {
    const { output, sendProgramChange } = get();
    if (!output) return;
    
    set({ isSyncing: true, syncProgress: 0 });
    console.log("%c[MG-30] Inizio Sincronizzazione Avanzata...", "color: #FFEA00; font-weight: bold;");
    
    for (let i = 1; i <= 56; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 56) * 100) });
      
      // 1. Cambio Slot
      sendProgramChange(i - 1);
      
      // 2. Attesa caricamento hardware (molto importante)
      await new Promise(r => setTimeout(r, 400));
      
      // 3. Richiesta Dump Preset Corrente (standard MG-30)
      // Proviamo sia con Device ID 01 che con 7F (broadcast)
      output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x40, 0x00, 0xF7]);
      await new Promise(r => setTimeout(r, 100));
      output.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x40, 0x00, 0xF7]);
      
      // 4. Pausa per evitare saturazione buffer
      await new Promise(r => setTimeout(r, 300)); 
    }
    
    set({ isSyncing: false, currentSyncSlot: null });
    console.log("%c[MG-30] Sincronizzazione terminata.", "color: #00E676; font-weight: bold;");
  },

  updatePresetName: (slot, newName) => {
    set(state => ({
      devicePresets: state.devicePresets.map(p => p.slot === slot ? { ...p, name: newName } : p)
    }));
  },

  refreshDevices: () => get().initialize()
}));
