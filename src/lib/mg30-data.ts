import { EffectType } from '@/types/preset';

export interface MG30Parameter {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface MG30Model {
  id: string;
  name: string;
  parameters: MG30Parameter[];
}

export const MG30_MODELS: Record<EffectType, MG30Model[]> = {
  'noise-gate': [
    { 
      id: 'gate', 
      name: 'Noise Gate',
      parameters: [
        { id: 'threshold', name: 'Threshold', min: 0, max: 100, step: 1, default: 20 },
        { id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'compressor': [
    { 
      id: 'vca', 
      name: 'VCA',
      parameters: [
        { id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'attack', name: 'Attack', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 },
        { id: 'clipping', name: 'Clipping', min: 0, max: 100, step: 1, default: 0 }
      ]
    },
    { 
      id: 'blue', 
      name: 'Blue Comp',
      parameters: [
        { id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'attack', name: 'Attack', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'red', 
      name: 'Red Comp',
      parameters: [
        { id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'efx': [
    { 
      id: 'ts', 
      name: 'T Screamer',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'blues', 
      name: 'Blues Drv',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'morning', 
      name: 'Morning Drv',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'rat', 
      name: 'Rat',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'filter', name: 'Filter', min: 0, max: 100, step: 1, default: 50 },
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'amp': [
    { 
      id: 'brit800', 
      name: 'Brit 800',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'master', name: 'Master', min: 0, max: 100, step: 1, default: 50 },
        { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mid', name: 'Middle', min: 0, max: 100, step: 1, default: 50 },
        { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 },
        { id: 'presence', name: 'Presence', min: 0, max: 100, step: 1, default: 50 },
        { id: 'sag', name: 'Sag', min: 0, max: 100, step: 1, default: 50 },
        { id: 'bias', name: 'Bias', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'plexi100', 
      name: 'Plexi 100',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'master', name: 'Master', min: 0, max: 100, step: 1, default: 50 },
        { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mid', name: 'Middle', min: 0, max: 100, step: 1, default: 50 },
        { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 },
        { id: 'presence', name: 'Presence', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'deluxe', 
      name: 'Deluxe Rvb',
      parameters: [
        { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 },
        { id: 'master', name: 'Master', min: 0, max: 100, step: 1, default: 50 },
        { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mid', name: 'Middle', min: 0, max: 100, step: 1, default: 50 },
        { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'ir': [
    { 
      id: '1960a', 
      name: '1960A 4x12',
      parameters: [
        { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 },
        { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 },
        { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }
      ]
    }
  ],
  'eq': [
    { 
      id: '10band', 
      name: '10-Band EQ',
      parameters: [
        { id: '31Hz', name: '31.25Hz', min: 0, max: 100, step: 1, default: 50 },
        { id: '62Hz', name: '62.5Hz', min: 0, max: 100, step: 1, default: 50 },
        { id: '125Hz', name: '125Hz', min: 0, max: 100, step: 1, default: 50 },
        { id: '250Hz', name: '250Hz', min: 0, max: 100, step: 1, default: 50 },
        { id: '500Hz', name: '500Hz', min: 0, max: 100, step: 1, default: 50 },
        { id: '1kHz', name: '1kHz', min: 0, max: 100, step: 1, default: 50 },
        { id: '2kHz', name: '2kHz', min: 0, max: 100, step: 1, default: 50 },
        { id: '4kHz', name: '4kHz', min: 0, max: 100, step: 1, default: 50 },
        { id: '8kHz', name: '8kHz', min: 0, max: 100, step: 1, default: 50 },
        { id: '16kHz', name: '16kHz', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'modulation': [
    { 
      id: 'ce1', 
      name: 'CE-1',
      parameters: [
        { id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 },
        { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }
      ]
    },
    { 
      id: 'phase90', 
      name: 'Phase 90',
      parameters: [
        { id: 'speed', name: 'Speed', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'delay': [
    { 
      id: 'analog', 
      name: 'Analog',
      parameters: [
        { id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' },
        { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 },
        { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }
      ]
    }
  ],
  'reverb': [
    { 
      id: 'hall', 
      name: 'Hall',
      parameters: [
        { id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 },
        { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 },
        { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }
      ]
    }
  ]
};
