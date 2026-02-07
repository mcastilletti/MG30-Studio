
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';

// Costanti Protocollo NUX MG-30
const NUX_HEADER = [0x00, 0x20, 0x6B];
const DEVICE_ID = 0x01;

// Mappatura Blocchi per SysEx (Basata sullo schema MG-30)
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

    // Riconoscimento SysEx NUX (Header F0 00 20 6B)
    if (data[0] === 0xF0 && data[1] === 0x00 && data[2] === 0x20 && data[3] === 0x6B) {
      // Parser avanzato: Cerchiamo una stringa ASCII di almeno 3 caratteri nel payload
      let foundName = "";
      for (let i = 4; i < data.length - 3; i++) {
        let potential = "";
        let j = i;
        // Un nome preset NUX MG-30 è lungo tipicamente 16 caratteri
        while (j < data.length && data[j] >= 32 && data[j] <= 126 && potential.length < 16) {
          potential += String.fromCharCode(data[j]);
          j++;
        }
        
        const trimmed = potential.trim();
        if (trimmed.length >= 3) {
          foundName = trimmed;
          break;
        }
      }

      if (foundName && currentSyncSlot !== null) {
        console.log(`%c[MG-30] Slot ${currentSyncSlot}: Nome rilevato -> ${foundName}`, "color: #8E24AA; font-weight: bold;");
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
    if (output) output.send([0xC0, pc]);
  },

  sendParameter: (blockType, paramId, value) => {
    const { output } = get();
    if (!output) return;
    const blockId = BLOCK_IDS[blockType as keyof typeof BLOCK_IDS] || 0x01;
    // Messaggio SysEx per cambio parametro singolo
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
    
    // Iteriamo su tutti i 56 slot
    for (let i = 1; i <= 56; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 56) * 100) });
      
      // Metodo più affidabile per l'MG-30:
      // 1. Cambiamo slot (Program Change)
      sendProgramChange(i - 1);
      
      // 2. Chiediamo il dump dell'edit buffer (che ora contiene il preset i)
      // Comando: F0 00 20 6B 01 40 00 F7
      const dumpRequest = [0xF0, 0x00, 0x20, 0x6B, 0x01, 0x40, 0x00, 0xF7];
      output.send(dumpRequest);
      
      // Aspettiamo che l'hardware risponda ed elabori
      await new Promise(r => setTimeout(r, 150)); 
    }
    
    set({ isSyncing: false, currentSyncSlot: null });
  },

  updatePresetName: (slot, newName) => {
    set(state => ({
      devicePresets: state.devicePresets.map(p => p.slot === slot ? { ...p, name: newName } : p)
    }));
  },

  refreshDevices: () => get().initialize()
}));
