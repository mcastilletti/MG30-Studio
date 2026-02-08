import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';
import { usePresetStore } from './use-preset-store';
import { MG30_MODELS } from '@/lib/mg30-data';

// Mappatura Bypass CC fornita dall'utente
const BYPASS_CC: Record<string, number> = {
  'wah': 0,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'noise-gate': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9,
  's-r': 10
};

// Valori ON/OFF (NUX standard: 1-63 = ON, 64-127 = OFF)
// Usiamo valori medi per sicurezza
const BYPASS_VALS: Record<string, { on: number; off: number }> = {
  'wah': { on: 1, off: 68 },
  'compressor': { on: 1, off: 65 },
  'efx': { on: 2, off: 66 },
  'amp': { on: 3, off: 67 },
  'eq': { on: 4, off: 68 },
  'noise-gate': { on: 5, off: 69 },
  'modulation': { on: 6, off: 70 },
  'delay': { on: 7, off: 71 },
  'reverb': { on: 8, off: 72 },
  'ir': { on: 9, off: 73 },
  's-r': { on: 10, off: 74 }
};

// Mappatura manopole fisiche e pedale d'espressione
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'wah': [79], // CC 79 = Wah Position
  'compressor': [13, 14, 15, 90],
  'efx': [17, 18, 19, 20, 21],
  'amp': [22, 23, 24, 25, 26, 27, 28, 29],
  'eq': [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
  'noise-gate': [42, 43, 44, 45],
  'modulation': [46, 47, 48, 49, 50, 51],
  'delay': [52, 53, 54, 55, 56, 57, 58, 59],
  'reverb': [60, 61, 62, 63],
  'ir': [64, 65, 66, 67, 68, 69]
};

// CC 78 per spostare il focus dello schermo dell'MG-30
const SELECT_BLOCK_CC = 78;

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
  'wah': 9,
  's-r': 10
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
  syncBlockParameters: (blockType: string, parameters: Record<string, any>) => void;
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
      
      // 1. Gestione Bypass (On/Off) basata su CC Mapping
      const blockTypeForBypass = Object.keys(BYPASS_CC).find(key => BYPASS_CC[key] === cc);
      if (blockTypeForBypass) {
        const isEnabled = val < 64;
        usePresetStore.getState().updateBlockStateLocally(blockTypeForBypass, isEnabled);
      }

      // 2. Gestione Parametri Real-time (incluso CC 79 Wah Position)
      for (const [type, ccs] of Object.entries(BLOCK_PARAM_CCS)) {
        const knobIndex = ccs.indexOf(cc);
        if (knobIndex !== -1) {
          const presetState = usePresetStore.getState().activePreset;
          const effect = presetState.effects.find(e => e.type === type);
          if (effect) {
             const modelData = MG30_MODELS[effect.type as any]?.find(m => m.id === effect.model);
             const paramDef = modelData?.parameters[knobIndex];
             if (paramDef) {
               usePresetStore.getState().updateParameter(effect.id, paramDef.id, val);
             }
          }
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
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) {
      get().sendControlChange(SELECT_BLOCK_CC, index);
    }
  },

  syncBlockParameters: (blockType, parameters) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (!ccs) return;

    const presetState = usePresetStore.getState().activePreset;
    const effect = presetState.effects.find(e => e.type === blockType);
    if (!effect) return;

    const modelData = MG30_MODELS[effect.type as any]?.find(m => m.id === effect.model);
    if (!modelData) return;

    modelData.parameters.forEach((param, index) => {
      const val = Number(parameters[param.id] ?? param.default);
      if (ccs[index] !== undefined) {
        get().sendControlChange(ccs[index], Math.round(val));
      }
    });
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
