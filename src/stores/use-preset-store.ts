import { create } from 'zustand';
import { Preset, EffectState } from '@/types/preset';
import { MG30_MODELS } from '@/lib/mg30-data';

const DEFAULT_PRESET: Preset = {
  name: 'New Custom Preset',
  slot: 1,
  category: 'Clean',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'Brit 800',
  effects: [
    { id: 'wah', type: 'wah', model: 'clyde', enabled: false, parameters: { position: 0 } },
    { id: 'ng', type: 'noise-gate', model: 'gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
    { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 50, level: 50 } },
    { id: 'efx', type: 'efx', model: 'dist-ts808', enabled: true, parameters: { drive: 50, tone: 50, level: 50 } },
    { id: 'amp', type: 'amp', model: 'amp-brit800', enabled: true, parameters: { gain: 50, master: 50, bass: 50, mid: 50, treble: 50, presence: 50 } },
    { id: 'ir', type: 'ir', model: 'ir-1960a', enabled: true, parameters: { level: 50, 'low-cut': 20, 'high-cut': 80 } },
    { id: 'eq', type: 'eq', model: 'eq-10band', enabled: true, parameters: { '31Hz': 50, '62Hz': 50, '125Hz': 50, '250Hz': 50, '500Hz': 50, '1kHz': 50, '2kHz': 50, '4kHz': 50, '8kHz': 50, '16kHz': 50 } },
    { id: 'mod', type: 'modulation', model: 'mod-ce1', enabled: false, parameters: { rate: 50, depth: 50, mix: 50 } },
    { id: 'delay', type: 'delay', model: 'dly-analog', enabled: false, parameters: { time: 400, feedback: 30, mix: 30 } },
    { id: 'reverb', type: 'reverb', model: 'rvb-hall', enabled: true, parameters: { decay: 50, tone: 50, mix: 30 } }
  ]
};

interface PresetStore {
  activePreset: Preset;
  history: Preset[];
  historyIndex: number;
  
  setActivePreset: (preset: Preset) => void;
  updateParameter: (effectId: string, param: string, value: number | string) => void;
  updateModel: (effectId: string, modelId: string) => void;
  toggleEffect: (effectId: string) => void;
  updateBlockStateLocally: (blockType: string, enabled: boolean) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  activePreset: DEFAULT_PRESET,
  history: [DEFAULT_PRESET],
  historyIndex: 0,

  setActivePreset: (preset) => {
    set({ activePreset: preset });
    get().saveToHistory();
  },

  updateParameter: (effectId, param, value) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        return { ...e, parameters: { ...e.parameters, [param]: value } };
      }
      return e;
    });

    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
  },

  updateModel: (effectId, modelId) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        const modelData = MG30_MODELS[e.type].find(m => m.id === modelId);
        const defaultParams: Record<string, number | string> = {};
        modelData?.parameters.forEach(p => {
          defaultParams[p.id] = p.default;
        });
        
        return { 
          ...e, 
          model: modelId,
          parameters: defaultParams
        };
      }
      return e;
    });
    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
    get().saveToHistory();
  },

  toggleEffect: (effectId) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.id === effectId) {
        return { ...e, enabled: !e.enabled };
      }
      return e;
    });
    set({ activePreset: { ...activePreset, effects: newEffects, lastModified: new Date() } });
    get().saveToHistory();
  },

  updateBlockStateLocally: (blockType, enabled) => {
    const { activePreset } = get();
    const newEffects = activePreset.effects.map(e => {
      if (e.type === blockType) {
        return { ...e, enabled: enabled };
      }
      return e;
    });
    set({ activePreset: { ...activePreset, effects: newEffects } });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1, activePreset: history[historyIndex - 1] });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1, activePreset: history[historyIndex + 1] });
    }
  },

  saveToHistory: () => {
    const { activePreset, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(activePreset)));
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  }
}));
