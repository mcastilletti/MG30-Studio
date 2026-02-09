
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset, EffectState } from '@/types/preset';
import { usePresetStore } from './use-preset-store';
import { MG30_MODELS } from '@/lib/mg30-data';

// Tabella Bypass CC e Valori basata sulle specifiche utente
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
  'sr': 10 // Send Return
};

const BYPASS_VALS: Record<string, { on: number; off: number }> = {
  'wah': { on: 1, off: 65 },
  'compressor': { on: 2, off: 66 },
  'efx': { on: 5, off: 69 },
  'amp': { on: 13, off: 77 },
  'eq': { on: 1, off: 65 },
  'noise-gate': { on: 5, off: 69 },
  'modulation': { on: 6, off: 70 },
  'delay': { on: 7, off: 71 },
  'reverb': { on: 1, off: 65 },
  'ir': { on: 7, off: 71 },
  'sr': { on: 1, off: 65 }
};

// CC per la selezione del MODELLO (Basati su mappatura hardware MG-30)
const BLOCK_MODEL_CC: Record<string, number> = {
  'wah': 11,
  'compressor': 13,
  'efx': 17,
  'amp': 23,
  'eq': 31,
  'noise-gate': 43,
  'modulation': 47,
  'delay': 53,
  'reverb': 61,
  'ir': 65,
  'sr': 71,
  'vol': 73
};

// CC per i parametri dei blocchi (Knobs)
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'wah': [12],
  'compressor': [14, 15, 16],
  'efx': [18, 19, 20, 21, 22],
  'amp': [24, 25, 26, 27, 28, 29, 30],
  'eq': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
  'noise-gate': [44, 45],
  'modulation': [48, 49, 50, 51, 52],
  'delay': [54, 55, 56, 57, 58, 59, 60],
  'reverb': [62, 63, 64],
  'ir': [66, 67, 68, 69, 70],
  'sr': [72],
  'vol': [74]
};

// Mappatura indici per CC 75 (Highlight/Focus)
const BLOCK_INDEX_MAP: Record<string, number> = {
  'wah': 0,
  'noise-gate': 5,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'ir': 9,
  'sr': 10,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'vol': 11,
  'eq': 4
};

const SELECT_BLOCK_CC = 75; // CURRENT BLOCK FOCUS
const ENTER_EDITOR_CC = 78; // ENTER PEDAL EDITOR VIEW
const PEDAL_CC = 76; // EXP PEDAL POSITION

const formatSlotLabel = (slot: number) => {
  const bank = Math.floor((slot - 1) / 4) + 1;
  const sub = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(bank).padStart(2, '0')}${sub}`;
};

const createDefaultEffects = (): EffectState[] => [
  { id: 'wah', type: 'wah', model: 'clyde', enabled: false, parameters: { position: 0 } },
  { id: 'ng', type: 'noise-gate', model: 'gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
  { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 50, level: 50 } },
  { id: 'efx', type: 'efx', model: 'tscream', enabled: false, parameters: { drive: 50, tone: 50, level: 50 } },
  { id: 'amp', type: 'amp', model: 'plexi100w', enabled: true, parameters: { gain: 50, master: 50, bass: 50, mid: 50, treble: 50, presence: 50 } },
  { id: 'ir', type: 'ir', model: 'ir-jz120', enabled: true, parameters: { level: 0, lowcut: 20, highcut: 20000 } },
  { id: 'sr', type: 'sr', model: 'send-return', enabled: false, parameters: { send: 100, return: 100 } },
  { id: 'mod', type: 'modulation', model: 'mod-ce1', enabled: false, parameters: { intensity: 50, depth: 50, rate: 50 } },
  { id: 'delay', type: 'delay', model: 'dly-analog', enabled: false, parameters: { repeat: 30, echo: 30, intensity: 30 } },
  { id: 'reverb', type: 'reverb', model: 'room', enabled: true, parameters: { decay: 50, tone: 50, level: 30 } },
  { id: 'vol', type: 'vol', model: 'patch-vol', enabled: true, parameters: { level: 100 } }
];

const INITIAL_PRESETS: Preset[] = Array.from({ length: 128 }, (_, i) => ({
  slot: i + 1,
  name: `Preset ${formatSlotLabel(i + 1)}`,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX MG-30',
  effects: createDefaultEffects()
}));

interface MidiStore {
  status: MidiConnectionStatus;
  input: MIDIInput | null;
  output: MIDIOutput | null;
  availableDevices: { inputs: MidiDevice[], outputs: MidiDevice[] };
  devicePresets: Preset[];
  isSyncing: boolean;
  isEditorSyncing: boolean;
  syncProgress: number;
  lastError: string | null;
  currentSyncSlot: number | null;
  
  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number) => void;
  sendKnobParameter: (blockType: string, knobIndex: number, value: number) => void;
  sendModelChange: (blockType: string, modelId: string) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  selectBlock: (blockType: string) => void;
  enterBlockEditor: (blockType: string) => void;
  exitBlockEditor: () => void;
  resetToPresetView: () => void;
  syncBlockParameters: (blockType: string, parameters: Record<string, any>) => void;
  syncFullPreset: (preset: Preset) => void;
  refreshDevices: () => void;
  syncPresets: (force?: boolean) => Promise<void>;
  syncActivePreset: () => void;
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
  isEditorSyncing: false,
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
          get().syncActivePreset();
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
    if (!data) return;

    const statusByte = data[0] & 0xF0;

    if (statusByte === 0xC0) {
      const pc = data[1];
      const slot = pc + 1;
      const activePreset = usePresetStore.getState().activePreset;
      const existingPreset = get().devicePresets.find(p => p.slot === slot);
      usePresetStore.getState().setActivePreset(existingPreset || { ...activePreset, slot });
      setTimeout(() => get().syncActivePreset(), 50);
      return;
    }

    if (statusByte === 0xB0) {
      const cc = data[1];
      const val = data[2];
      
      if (cc === PEDAL_CC) {
        usePresetStore.getState().updateParameter('wah', 'position', val);
        return;
      }

      const blockTypeForBypass = Object.keys(BYPASS_CC).find(key => BYPASS_CC[key] === cc);
      if (blockTypeForBypass) {
        const vals = BYPASS_VALS[blockTypeForBypass];
        const isEnabled = val === vals.on;
        usePresetStore.getState().updateBlockStateLocally(blockTypeForBypass, isEnabled);
      }
    }

    if (data[0] === 0xF0 && data[data.length - 1] === 0xF7) {
      let tempName = "";
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        if (byte >= 32 && byte <= 126) tempName += String.fromCharCode(byte);
        else {
          if (tempName.trim().length >= 3) {
            const candidate = tempName.trim();
            if (!["NUX", "MG-30", "VER", "HDR", "EDIT", "PRESET"].includes(candidate.toUpperCase())) {
              const activePreset = usePresetStore.getState().activePreset;
              get().updatePresetName(activePreset.slot, candidate);
              usePresetStore.getState().setActivePreset({ ...activePreset, name: candidate });
              break; 
            }
          }
          tempName = "";
        }
      }
    }
  },

  syncActivePreset: () => {
    const { output } = get();
    if (!output) return;
    set({ isEditorSyncing: true });
    output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7]);
    output.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x00, 0x01, 0xF7]);
    setTimeout(() => set({ isEditorSyncing: false }), 1200);
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
  },

  sendProgramChange: (pc) => {
    const { output } = get();
    if (output) {
      output.send([0xC0, pc]);
      setTimeout(() => get().syncActivePreset(), 100);
    }
  },

  sendKnobParameter: (blockType, knobIndex, value) => {
    const ccs = BLOCK_PARAM_CCS[blockType];
    if (ccs && ccs[knobIndex] !== undefined) {
      get().sendControlChange(ccs[knobIndex], value);
    }
  },

  sendModelChange: (blockType, modelId) => {
    const { output, sendControlChange, selectBlock } = get();
    if (!output) return;

    const cc = BLOCK_MODEL_CC[blockType];
    const index = BLOCK_INDEX_MAP[blockType];
    if (cc === undefined || index === undefined) return;

    const models = MG30_MODELS[blockType as any];
    const modelIndex = models?.findIndex(m => m.id === modelId);

    if (modelIndex !== undefined && modelIndex !== -1) {
      // 1. Forza il focus del blocco (CC 75)
      sendControlChange(SELECT_BLOCK_CC, index);
      
      // 2. Invia SysEx di "Edit Mode" per sbloccare la pedaliera
      output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7]);

      setTimeout(() => {
        // 3. Invia il cambio modello effettivo
        sendControlChange(cc, modelIndex);
        
        // 4. Forza il refresh del display hardware
        setTimeout(() => {
          output.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x00, 0x01, 0xF7]);
        }, 150);
      }, 150);
    }
  },

  toggleBlock: (blockType, enabled) => {
    const cc = BYPASS_CC[blockType];
    const vals = BYPASS_VALS[blockType];
    if (cc !== undefined && vals) {
      get().sendControlChange(cc, enabled ? vals.on : vals.off);
    }
  },

  selectBlock: (blockType) => {
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) {
      get().sendControlChange(SELECT_BLOCK_CC, index);
    }
  },

  enterBlockEditor: (blockType) => {
    const index = BLOCK_INDEX_MAP[blockType];
    if (index !== undefined) {
      get().sendControlChange(SELECT_BLOCK_CC, index);
      setTimeout(() => {
        get().sendControlChange(ENTER_EDITOR_CC, index);
      }, 150);
    }
  },

  exitBlockEditor: () => {
    get().sendControlChange(ENTER_EDITOR_CC, 127);
  },

  resetToPresetView: () => {
    const { output } = get();
    if (!output) return;
    const pc = usePresetStore.getState().activePreset.slot - 1;
    output.send([0xC0, pc]);
    const s1 = [0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7];
    const s2 = [0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x00, 0x01, 0xF7];
    setTimeout(() => {
      output.send(s1); output.send(s2);
      output.send(s1); output.send(s2);
    }, 150);
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
        setTimeout(() => {
          get().sendControlChange(ccs[index], Math.round(val));
        }, index * 40);
      }
    });
  },

  syncFullPreset: (preset) => {
    const { toggleBlock, syncBlockParameters, sendModelChange } = get();
    
    preset.effects.forEach((e, idx) => {
      setTimeout(() => {
        sendModelChange(e.type, e.model);
        
        setTimeout(() => {
          toggleBlock(e.type, e.enabled);
          
          setTimeout(() => {
            syncBlockParameters(e.type, e.parameters);
          }, 150);
        }, 200);
      }, idx * 700);
    });
  },

  syncPresets: async () => {
    const { output, sendProgramChange } = get();
    if (!output) return;
    set({ isSyncing: true, syncProgress: 0 });
    for (let i = 1; i <= 128; i++) {
      set({ syncProgress: Math.round((i / 128) * 100) });
      sendProgramChange(i - 1);
      await new Promise(r => setTimeout(r, 450));
    }
    set({ isSyncing: false });
  },

  updatePresetName: (slot, newName) => {
    set(state => ({
      devicePresets: state.devicePresets.map(p => p.slot === slot ? { ...p, name: newName } : p)
    }));
  },

  refreshDevices: () => get().initialize()
}));
