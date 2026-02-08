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
  name: string; // Colonna D (Short Name)
  fullName: string; // Colonna C (Full Name)
  parameters: MG30Parameter[];
}

const AMP_PARAMS_STANDARD: MG30Parameter[] = [
  { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 40 },
  { id: 'master', name: 'Master', min: 0, max: 100, step: 1, default: 50 },
  { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 },
  { id: 'mid', name: 'Middle', min: 0, max: 100, step: 1, default: 50 },
  { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 },
  { id: 'presence', name: 'Presence', min: 0, max: 100, step: 1, default: 50 },
  { id: 'sag', name: 'Sag', min: 0, max: 100, step: 1, default: 50 },
  { id: 'bias', name: 'Bias', min: 0, max: 100, step: 1, default: 50 }
];

export const MG30_MODELS: Record<EffectType, MG30Model[]> = {
  'noise-gate': [
    { 
      id: 'gate', 
      name: 'NG',
      fullName: 'NUX Noise Gate',
      parameters: [
        { id: 'threshold', name: 'Threshold', min: 0, max: 100, step: 1, default: 20 },
        { id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }
      ]
    }
  ],
  'compressor': [
    { id: 'rose', name: 'Rose Comp', fullName: 'Keeley Compressor', parameters: [{ id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 }, { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'kcomp', name: 'K Comp', fullName: 'Korg Compressor', parameters: [{ id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 }, { id: 'clipping', name: 'Clipping', min: 0, max: 100, step: 1, default: 50 }, { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'studiocomp', name: 'Studio Comp', fullName: 'Urei 1176 Compressor', parameters: [{ id: 'threshold', name: 'Threshold', min: 0, max: 100, step: 1, default: 50 }, { id: 'ratio', name: 'Ratio', min: 0, max: 100, step: 1, default: 50 }, { id: 'attack', name: 'Attack', min: 0, max: 100, step: 1, default: 50 }, { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }] }
  ],
  'efx': [
    { id: 'distplus', name: 'DISTORTION+', fullName: 'MXR DISTORTION+', parameters: [{ id: 'output', name: 'Output', min: 0, max: 100, step: 1, default: 50 }, { id: 'sensitivity', name: 'Sensitivity', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'rcboost', name: 'RC BOOST', fullName: 'Xotic RC BOOSTER', parameters: [{ id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 }, { id: 'vol', name: 'Vol', min: 0, max: 100, step: 1, default: 50 }, { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 }, { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'acboost', name: 'AC BOOST', fullName: 'Xotic AC BOOSTER', parameters: [{ id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 }, { id: 'vol', name: 'Vol', min: 0, max: 100, step: 1, default: 50 }, { id: 'bass', name: 'Bass', min: 0, max: 100, step: 1, default: 50 }, { id: 'treble', name: 'Treble', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'distone', name: 'DIST ONE', fullName: 'Boss DS-1 DISTORTION', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'drive', name: 'Drive', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'tscream', name: 'T SCREAM', fullName: 'Ibanez TUBE SCREAMER', parameters: [{ id: 'drive', name: 'Drive', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'bluesdrv', name: 'BLUES DRV', fullName: 'Boss BLUES DRIVER', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'morningdrv', name: 'MORNING DRV', fullName: 'JHS Morning Glory', parameters: [{ id: 'volume', name: 'Volume', min: 0, max: 100, step: 1, default: 50 }, { id: 'drive', name: 'Drive', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'eatdist', name: 'EAT DIST', fullName: 'PROCO RAT', parameters: [{ id: 'distortion', name: 'Distortion', min: 0, max: 100, step: 1, default: 50 }, { id: 'filter', name: 'Filter', min: 0, max: 100, step: 1, default: 50 }, { id: 'volume', name: 'Volume', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'reddirt', name: 'RED DIRT', fullName: 'KEELY RED DIRT', parameters: [{ id: 'drive', name: 'Drive', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'crunch', name: 'CRUNCH', fullName: 'JHS Angry Charlie', parameters: [{ id: 'volume', name: 'Volume', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'gain', name: 'Gain', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mufffuzz', name: 'MUFF FUZZ', fullName: 'EHX BIG MUFF PI', parameters: [{ id: 'volume', name: 'Volume', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'sustain', name: 'Sustain', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'katana', name: 'KATANA', fullName: 'KEELY KATANA CLEAN BOOST', parameters: [{ id: 'boostsw', name: 'Boost SW', min: 0, max: 100, step: 1, default: 0 }, { id: 'volume', name: 'Volume', min: 0, max: 100, step: 1, default: 50 }] }
  ],
  'amp': [
    { id: 'amp-jazzclean', name: 'Jazz Clean', fullName: 'Roland JC-120', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-deluxerev', name: 'Deluxe Rev', fullName: 'Fender Deluxe Reverb', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-twinrev', name: 'Twin Rev', fullName: 'Fender Twin Reverb', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-superrev', name: 'Super Rev', fullName: 'Fender Super Reverb', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-classa15', name: 'Class A15', fullName: 'Vox AC-15', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-classa30', name: 'Class A30', fullName: 'Vox AC-30', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-plexi100', name: 'Plexi 100', fullName: 'Marshall Plexi 100', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-brit800', name: 'Brit 800', fullName: 'Marshall JCM-800', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-1987x', name: '1987 X 50W', fullName: 'Marshall 1987x', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-slo100', name: 'Slo 100', fullName: 'Soldano SLO-100', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-fireman', name: 'Fireman', fullName: 'Friedman BE-100', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-dualrect', name: 'Dual Rect', fullName: 'Mesa Dual Rectifier', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-die-vh4', name: 'Die VH4', fullName: 'Diezel VH4', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-viberking', name: 'Viber King', fullName: 'Fender Vibro-King', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-budda', name: 'Budda', fullName: 'Budda Superdrive 30', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-mrz', name: 'Mr. Z', fullName: 'Dr. Z Maz 38', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-superlead', name: 'Super Lead', fullName: 'Marshall Super Lead', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-f-man', name: 'F-Man', fullName: 'Friedman Brown Eye', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-bassguy', name: 'Bassguy', fullName: 'Fender Bassman', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-m212', name: 'M-212', fullName: 'Matchless DC30', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-gibo', name: 'Gibo', fullName: 'Gibson EH-185', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-rviber', name: 'R-Viber', fullName: 'Orange Rockerverb', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-brit2000', name: 'Brit 2000', fullName: 'Marshall JCM2000', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-uber', name: 'Uber', fullName: 'Bogner Uberschall', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-pv5150', name: 'PV 5150', fullName: 'Peavey 5150', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-angl', name: 'Angl', fullName: 'ENGL Savage', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-bassclean', name: 'Bass Clean', fullName: 'Bass Clean Preamp', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-bass500', name: 'Bass 500', fullName: 'Aguilar DB751', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-bass100', name: 'Bass 100', fullName: 'Ampeg SVT-100', parameters: AMP_PARAMS_STANDARD },
    { id: 'amp-ag50', name: 'AG-50', fullName: 'Acoustic AG-50', parameters: AMP_PARAMS_STANDARD }
  ],
  'ir': [
    { id: 'ir-1960a', name: '1960A 4x12', fullName: 'Marshall 1960A', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] },
    { id: 'ir-1960b', name: '1960B 4x12', fullName: 'Marshall 1960B', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] },
    { id: 'ir-green', name: 'Green 4x12', fullName: 'Marshall Greenback', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] },
    { id: 'ir-v30', name: 'V30 4x12', fullName: 'Celestion V30', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] },
    { id: 'ir-brit65', name: 'Brit 65 4x12', fullName: 'Marshall G12-65', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] },
    { id: 'ir-t75', name: 'T75 4x12', fullName: 'Marshall G12-T75', parameters: [{ id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50 }, { id: 'low-cut', name: 'Low Cut', min: 0, max: 100, step: 1, default: 20 }, { id: 'high-cut', name: 'High Cut', min: 0, max: 100, step: 1, default: 80 }] }
  ],
  'eq': [
    { id: 'eq-7band', name: '7-Band EQ', fullName: 'Standard 7-Band Graphic EQ', parameters: [{ id: '62Hz', name: '62.5Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '125Hz', name: '125Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '250Hz', name: '250Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '500Hz', name: '500Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '1kHz', name: '1kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '2kHz', name: '2kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '4kHz', name: '4kHz', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'eq-10band', name: '10-Band EQ', fullName: 'Standard 10-Band Graphic EQ', parameters: [{ id: '31Hz', name: '31.25Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '62Hz', name: '62.5Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '125Hz', name: '125Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '250Hz', name: '250Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '500Hz', name: '500Hz', min: 0, max: 100, step: 1, default: 50 }, { id: '1kHz', name: '1kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '2kHz', name: '2kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '4kHz', name: '4kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '8kHz', name: '8kHz', min: 0, max: 100, step: 1, default: 50 }, { id: '16kHz', name: '16kHz', min: 0, max: 100, step: 1, default: 50 }] }
  ],
  'modulation': [
    { id: 'mod-ce1', name: 'CE-1', fullName: 'Boss CE-1', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-ce2', name: 'CE-2', fullName: 'Boss CE-2', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-stchorus', name: 'ST Chorus', fullName: 'MXR Stereo Chorus', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-vibrato', name: 'Vibrato', fullName: 'Boss VB-2', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-detune', name: 'Detune', fullName: 'DigiTech Detune', parameters: [{ id: 'tune', name: 'Tune', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-flanger', name: 'Flanger', fullName: 'MXR Flanger', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }, { id: 'regen', name: 'Regen', min: 0, max: 100, step: 1, default: 50 }, { id: 'width', name: 'Width', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-phase90', name: 'Phase 90', fullName: 'MXR Phase 90', parameters: [{ id: 'speed', name: 'Speed', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-phase100', name: 'Phase 100', fullName: 'MXR Phase 100', parameters: [{ id: 'speed', name: 'Speed', min: 0, max: 100, step: 1, default: 50 }, { id: 'intensity', name: 'Intensity', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-chorusplus', name: 'Chorus +', fullName: 'TC Electronic Chorus+', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-uvibe', name: 'U-Vibe', fullName: 'Univox Univibe', parameters: [{ id: 'speed', name: 'Speed', min: 0, max: 100, step: 1, default: 50 }, { id: 'intensity', name: 'Intensity', min: 0, max: 100, step: 1, default: 50 }, { id: 'mode', name: 'Mode', min: 0, max: 1, step: 1, default: 0 }] },
    { id: 'mod-tremolo', name: 'Tremolo', fullName: 'Boss TR-2', parameters: [{ id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }, { id: 'depth', name: 'Depth', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'mod-rotary', name: 'Rotary', fullName: 'Leslie Rotary Speaker', parameters: [{ id: 'speed', name: 'Speed', min: 0, max: 100, step: 1, default: 50 }, { id: 'intensity', name: 'Intensity', min: 0, max: 100, step: 1, default: 50 }] }
  ],
  'delay': [
    { id: 'dly-analog', name: 'Analog', fullName: 'NUX Analog Delay', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'dly-digital', name: 'Digital', fullName: 'NUX Digital Delay', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'dly-moddelay', name: 'Mod Delay', fullName: 'NUX Modulation Delay', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }, { id: 'rate', name: 'Rate', min: 0, max: 100, step: 1, default: 50 }] },
    { id: 'dly-tapeecho', name: 'Tape Echo', fullName: 'NUX Tape Echo', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'dly-reverse', name: 'Reverse', fullName: 'NUX Reverse Delay', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'dly-pan', name: 'Pan', fullName: 'NUX Pan Delay', parameters: [{ id: 'time', name: 'Time', min: 40, max: 2000, step: 1, default: 400, unit: 'ms' }, { id: 'feedback', name: 'Feedback', min: 0, max: 100, step: 1, default: 30 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] }
  ],
  'reverb': [
    { id: 'rvb-room', name: 'Room', fullName: 'NUX Room Reverb', parameters: [{ id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'rvb-hall', name: 'Hall', fullName: 'NUX Hall Reverb', parameters: [{ id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'rvb-plate', name: 'Plate', fullName: 'NUX Plate Reverb', parameters: [{ id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'rvb-spring', name: 'Spring', fullName: 'NUX Spring Reverb', parameters: [{ id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }, { id: 'tone', name: 'Tone', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] },
    { id: 'rvb-shimmer', name: 'Shimmer', fullName: 'NUX Shimmer Reverb', parameters: [{ id: 'decay', name: 'Decay', min: 0, max: 100, step: 1, default: 50 }, { id: 'mix', name: 'Mix', min: 0, max: 100, step: 1, default: 30 }] }
  ]
};
