
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
  name: `Preset ${String(i + 1).padStart(2, '0')}`,
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

    // Riconoscimento SysEx NUX
    if (data[0] === 0xF0 && data[1] === NUX_HEADER[0] && data[2] === NUX_HEADER[1] && data[3] === NUX_HEADER[2]) {
      // Tenta di estrarre il nome (solitamente stringhe ASCII nei dati dump)
      const asciiChars: string[] = [];
      for (let i = 4; i < data.length - 1; i++) {
        if (data[i] >= 32 && data[i] <= 126) {
          asciiChars.push(String.fromCharCode(data[i]));
        } else if (asciiChars.length > 0) {
          // Se troviamo un carattere non ASCII dopo una sequenza, fermiamoci
          break;
        }
      }

      const extractedName = asciiChars.join('').trim();
      if (extractedName.length >= 3 && currentSyncSlot !== null) {
        console.log(`%c[MG-30] Preset ${currentSyncSlot} Name Found: ${extractedName}`, "color: #4CAF50; font-weight: bold");
        updatePresetName(currentSyncSlot, extractedName);
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
    const { output } = get();
    if (!output) return;
    
    set({ isSyncing: true, syncProgress: 0 });
    
    for (let i = 1; i <= 56; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 56) * 100) });
      
      // Comando ufficiale per richiedere il dump dello slot specifico (NUX MG-30 Protocol)
      const cmd = [0xF0, ...NUX_HEADER, 0x00, 0x01, i - 1, 0xF7];
      output.send(cmd);
      
      // Aspetta che la pedaliera risponda prima di passare al prossimo slot
      await new Promise(r => setTimeout(r, 60)); 
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
