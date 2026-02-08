import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';
import { usePresetStore } from './use-preset-store';

// Mappatura Bypass basata sulla colonna NEW MIDI CC della tabella utente
const BYPASS_CC: Record<string, number> = {
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'noise-gate': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9,
  'wah': 10 // Aggiunto Wah
};

// Valori specifici di ON/OFF catturati precedentemente dall'utente per la stabilità del segnale
const BYPASS_VALS: Record<string, { on: number; off: number }> = {
  'compressor': { on: 1, off: 65 },
  'efx': { on: 1, off: 65 },
  'amp': { on: 13, off: 77 },
  'eq': { on: 1, off: 65 },
  'noise-gate': { on: 1, off: 65 },
  'modulation': { on: 6, off: 70 },
  'delay': { on: 7, off: 71 },
  'reverb': { on: 1, off: 65 },
  'ir': { on: 7, off: 71 },
  'wah': { on: 1, off: 65 }
};

// Mappatura manopole fisiche basata sulla colonna NEW MIDI CC
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'compressor': [13, 14, 15, 90], // Knob 1-4 (ID 14-17)
  'efx': [17, 18, 19, 20, 21],    // Knob 1-5 (ID 18-22)
  'amp': [22, 23, 24, 25, 26, 27, 28, 29], // Knob 1-8 (ID 23-30)
  'eq': [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41], // Knob 1-12 (ID 31-42)
  'noise-gate': [42, 43, 44, 45], // Knob 1-4 (ID 43-46)
  'modulation': [46, 47, 48, 49, 50, 51], // Knob 1-6 (ID 47-52)
  'delay': [52, 53, 54, 55, 56, 57, 58, 59], // Knob 1-8 (ID 53-60)
  'reverb': [60, 61, 62, 63], // Knob 1-4 (ID 61-64)
  'ir': [64, 65, 66, 67, 68, 69], // Knob 1-6 (ID 65-70)
  'wah': [79] // CC 79 catturato dal log dell'utente per la posizione Wah
};

// ID 74: CURRENT BLOCK -> New CC 73
const SELECT_BLOCK_CC = 73;

const BLOCK_INDEX_MAP: Record<string, number> = {
  'noise-gate': 0,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'ir': 4,
  'eq': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'wah': 9
};

const formatSlotLabel = (slot: number) => {
  const bank = Math.floor((slot - 1) / 4) + 1;
  const sub = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(bank).padStart(2, '0')}${sub}`;
};

const INITIAL_PRESETS: Preset[] = Array.from({ length: 128 }, (_, i) => ({
  slot: i + 1,
  name: `Preset ${formatSlotLabel(i + 1)}`,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX MG-30',
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
  sendKnobParameter: (blockType: string, knobIndex: number, value: number) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  selectBlock: (blockType: string) => void;
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

    if (data[0] === 0xB0) {
      const cc = data[1];
      const val = data[2];
      
      const blockType = Object.keys(BYPASS_CC).find(key => BYPASS_CC[key] === cc);
      if (blockType) {
        const vals = BYPASS_VALS[blockType];
        if (vals) {
          const isEnabled = val === vals.on;
          usePresetStore.getState().updateBlockStateLocally(blockType, isEnabled);
        }
      }
    }

    if (data.length > 10) {
      let foundName = "";
      let tempName = "";
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        if (byte >= 32 && byte <= 126) {
          tempName += String.fromCharCode(byte);
        } else {
          if (tempName.trim().length >= 4) {
            const candidate = tempName.trim();
            if (!["NUX", "MG-30", "VER", "HDR", "EDIT"].includes(candidate.toUpperCase())) {
              foundName = candidate;
              break; 
            }
          }
          tempName = "";
        }
      }
      if (foundName && currentSyncSlot !== null) {
        updatePresetName(currentSyncSlot, foundName);
      }
    }
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) {
      output.send([0xB0, cc, value]);
    }
  },

  sendProgramChange: (pc) => {
    const { output } = get();
    if (output) {
      output.send([0xC0, pc]);
    }
  },

  sendKnobParameter: (blockType, knobIndex, value) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (ccs && ccs[knobIndex] !== undefined) {
      get().sendControlChange(ccs[knobIndex], Math.round(value));
    }
  },

  toggleBlock: (blockType, enabled) => {
    const cc = BYPASS_CC[blockType];
    const vals = BYPASS_VALS[blockType];
    if (cc !== undefined && vals) {
      const val = enabled ? vals.on : vals.off;
      get().sendControlChange(cc, val);
    }
  },

  selectBlock: (blockType) => {
    const value = BLOCK_INDEX_MAP[blockType];
    if (value !== undefined) {
      get().sendControlChange(SELECT_BLOCK_CC, value);
    }
  },

  syncPresets: async () => {
    const { output, sendProgramChange } = get();
    if (!output) return;
    
    set({ isSyncing: true, syncProgress: 0 });
    
    for (let i = 1; i <= 128; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 128) * 100) });
      sendProgramChange(i - 1);
      
      get().output?.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7]);
      get().output?.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x00, 0x01, 0xF7]);
      
      await new Promise(r => setTimeout(r, 450));
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
