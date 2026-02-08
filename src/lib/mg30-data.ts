import { EffectType } from '@/types/preset';

export interface MG30Model {
  id: string;
  name: string;
}

export const MG30_MODELS: Record<EffectType, MG30Model[]> = {
  'noise-gate': [
    { id: 'gate', name: 'Noise Gate' }
  ],
  'compressor': [
    { id: 'vca', name: 'VCA' },
    { id: 'blue', name: 'Blue Comp' },
    { id: 'red', name: 'Red Comp' },
    { id: 'gc', name: 'GC Comp' },
    { id: 'squeeze', name: 'Squeeze' }
  ],
  'efx': [
    { id: 'rose', name: 'Rose Comp' },
    { id: 'kcomp', name: 'K Comp' },
    { id: 'katana', name: 'Katana' },
    { id: 'rcboost', name: 'RC Boost' },
    { id: 'acboost', name: 'AC Boost' },
    { id: 'ts', name: 'T Screamer' },
    { id: 'blues', name: 'Blues Drv' },
    { id: 'morning', name: 'Morning Drv' },
    { id: 'reddirt', name: 'Red Dirt' },
    { id: 'crunch', name: 'Crunch' },
    { id: 'dist1', name: 'Dist 1' },
    { id: 'dist2', name: 'Dist 2' },
    { id: 'modern', name: 'Modern' },
    { id: 'rat', name: 'Rat' },
    { id: 'muff', name: 'Muff' }
  ],
  'amp': [
    { id: 'jazz', name: 'Jazz Clean' },
    { id: 'deluxe', name: 'Deluxe Rvb' },
    { id: 'twin', name: 'Twin Rvb' },
    { id: 'classa15', name: 'Class A 15' },
    { id: 'classa30', name: 'Class A 30' },
    { id: 'plexi100', name: 'Plexi 100' },
    { id: 'plexi50', name: 'Plexi 50' },
    { id: 'brit800', name: 'Brit 800' },
    { id: '1987x', name: '1987 X 50W' },
    { id: 'slo100', name: 'Slo 100' },
    { id: 'dualrect', name: 'Dual Rect' },
    { id: 'die', name: 'Die v4' },
    { id: 'fireman', name: 'Fireman' },
    { id: 'netbe', name: 'Netbe' },
    { id: 'uber', name: 'Uber' },
    { id: 'vh4', name: 'VH4' }
  ],
  'ir': [
    { id: '1960a', name: '1960A 4x12' },
    { id: '1960b', name: '1960B 4x12' },
    { id: 'green', name: 'Green 4x12' },
    { id: 'vintage', name: 'Vintage 4x12' },
    { id: 't75', name: 'T75 4x12' },
    { id: 'v30', name: 'V30 4x12' },
    { id: 'bogner', name: 'Bogner 4x12' }
  ],
  'eq': [
    { id: '6band', name: '6-Band EQ' },
    { id: '10band', name: '10-Band EQ' }
  ],
  'modulation': [
    { id: 'ce1', name: 'CE-1' },
    { id: 'ce2', name: 'CE-2' },
    { id: 'stchorus', name: 'ST Chorus' },
    { id: 'vibrato', name: 'Vibrato' },
    { id: 'detune', name: 'Detune' },
    { id: 'flanger', name: 'Flanger' },
    { id: 'phase90', name: 'Phase 90' },
    { id: 'phase100', name: 'Phase 100' },
    { id: 'scf', name: 'S.C.F.' },
    { id: 'tremolo', name: 'Tremolo' },
    { id: 'rotary', name: 'Rotary' }
  ],
  'delay': [
    { id: 'analog', name: 'Analog' },
    { id: 'digital', name: 'Digital' },
    { id: 'mod', name: 'Modulation' },
    { id: 'tape', name: 'Tape' },
    { id: 'reverse', name: 'Reverse' },
    { id: 'pan', name: 'Pan' }
  ],
  'reverb': [
    { id: 'room', name: 'Room' },
    { id: 'hall', name: 'Hall' },
    { id: 'plate', name: 'Plate' },
    { id: 'spring', name: 'Spring' },
    { id: 'shimmer', name: 'Shimmer' }
  ]
};
