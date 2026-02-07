
import { create } from 'zustand';
import { Preset, EffectState } from '@/types/preset';

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
    { id: 'ng', type: 'noise-gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
    { id: 'cmp', type: 'compressor', enabled: false, parameters: { sustain: 40, attack: 50, level: 50, clipping: 0 } },
    { id: 'efx', type: 'efx', enabled: true, parameters: { gain: 30, tone: 50, level: 50, bass: 50, extra: 0 } },
    { id: 'amp', type: 'amp', enabled: true, parameters: { gain: 45, master: 60, bass: 50, mid: 50, treble: 50, presence: 50, sag: 50, bias: 50 } },
    { id: 'ir', type: 'ir', enabled: true, parameters: { level: 50, 'low-cut': 20, 'high-cut': 80, distance: 0 } },
    { id: 'eq', type: 'eq', enabled: true, parameters: { '31Hz': 50, '62Hz': 50, '125Hz': 50, '250Hz': 50, '500Hz': 50, '1kHz': 50, '2kHz': 50, '4kHz': 50 } },
    { id: 'mod', type: 'modulation', enabled: false, parameters: { rate: 30, depth: 50, width: 50, regen: 20, mix: 50 } },
    { id: 'delay', type: 'delay', enabled: false, parameters: { time: 400, feedback: 30, mix: 20, level: 50, tone: 50, mod: 50, rate: 50, width: 50 } },
    { id: 'reverb', type: 'reverb', enabled: true, parameters: { decay: 2.5, tone: 50, mix: 15, level: 50 } }
  ]
};

interface PresetStore {
  activePreset: Preset;
  history: Preset[];
  historyIndex: number;
  
  setActivePreset: (preset: Preset) => void;
  updateParameter: (effectId: string, param: string, value: number | string) => void;
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
