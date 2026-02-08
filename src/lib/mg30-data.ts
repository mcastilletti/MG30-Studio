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

const P1 = (id: string, name: string, def = 50) => ({ id, name, min: 0, max: 100, step: 1, default: def });
const P1MS = (id: string, name: string, def = 400) => ({ id, name, min: 40, max: 2000, step: 1, default: def, unit: 'ms' });

const AMP_STD = [
  P1('gain', 'Gain', 40), P1('master', 'Master', 50), P1('bass', 'Bass', 50), P1('mid', 'Middle', 50),
  P1('treble', 'Treble', 50), P1('presence', 'Presence', 50), P1('bias', 'Bias', 50), P1('level', 'Level', 50)
];

const AMP_NO_PRES = [
  P1('gain', 'Gain', 40), P1('master', 'Master', 50), P1('bass', 'Bass', 50), P1('mid', 'Middle', 50),
  P1('treble', 'Treble', 50), P1('bias', 'Bias', 50), P1('level', 'Level', 50)
];

const AMP_VOX = [
  P1('gain', 'Gain', 40), P1('master', 'Master', 50), P1('cut', 'Cut', 50), P1('bass', 'Bass', 50),
  P1('treble', 'Treble', 50), P1('level', 'Level', 50)
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
    { id: 'rose', name: 'Rose Comp', fullName: 'Keeley Compressor', parameters: [P1('sustain', 'Sustain'), P1('level', 'Level')] },
    { id: 'kcomp', name: 'K Comp', fullName: 'Korg Compressor', parameters: [P1('sustain', 'Sustain'), P1('clipping', 'Clipping'), P1('level', 'Level')] },
    { id: 'studiocomp', name: 'Studio Comp', fullName: 'Urei 1176 Compressor', parameters: [P1('threshold', 'Threshold'), P1('ratio', 'Ratio'), P1('attack', 'Attack'), P1('level', 'Level')] }
  ],
  'efx': [
    { id: 'distplus', name: 'DIST PLUS', fullName: 'MXR DISTORTION+', parameters: [P1('output', 'Output'), P1('sensitivity', 'Sensitivity')] },
    { id: 'rcboost', name: 'RC BOOST', fullName: 'Xotic RC BOOSTER', parameters: [P1('gain', 'Gain'), P1('vol', 'Vol'), P1('bass', 'Bass'), P1('treble', 'Treble')] },
    { id: 'acboost', name: 'AC BOOST', fullName: 'Xotic AC BOOSTER', parameters: [P1('gain', 'Gain'), P1('vol', 'Vol'), P1('bass', 'Bass'), P1('treble', 'Treble')] },
    { id: 'distone', name: 'DIST ONE', fullName: 'Boss DS-1 DISTORTION', parameters: [P1('level', 'Level'), P1('tone', 'Tone'), P1('drive', 'Drive')] },
    { id: 'tscream', name: 'T SCREAM', fullName: 'Ibanez TUBE SCREAMER', parameters: [P1('drive', 'Drive'), P1('tone', 'Tone'), P1('level', 'Level')] },
    { id: 'bluesdrv', name: 'BLUES DRV', fullName: 'Boss BLUES DRIVER', parameters: [P1('level', 'Level'), P1('tone', 'Tone'), P1('gain', 'Gain')] },
    { id: 'morningdrv', name: 'MORNING DRV', fullName: 'JHS Morning Glory', parameters: [P1('volume', 'Volume'), P1('drive', 'Drive'), P1('tone', 'Tone')] },
    { id: 'eatdist', name: 'EAT DIST', fullName: 'PROCO RAT', parameters: [P1('distortion', 'Distortion'), P1('filter', 'Filter'), P1('volume', 'Volume')] },
    { id: 'reddirt', name: 'RED DIRT', fullName: 'KEELY RED DIRT', parameters: [P1('drive', 'Drive'), P1('tone', 'Tone'), P1('level', 'Level')] },
    { id: 'crunch', name: 'CRUNCH', fullName: 'JHS Angry Charlie', parameters: [P1('volume', 'Volume'), P1('tone', 'Tone'), P1('gain', 'Gain')] },
    { id: 'mufffuzz', name: 'MUFF FUZZ', fullName: 'EHX BIG MUFF PI', parameters: [P1('volume', 'Volume'), P1('tone', 'Tone'), P1('sustain', 'Sustain')] },
    { id: 'katana', name: 'KATANA', fullName: 'KEELY KATANA CLEAN BOOST', parameters: [P1('boostsw', 'Boost SW', 0), P1('volume', 'Volume')] }
  ],
  'amp': [
    { id: 'jazzclean', name: 'JAZZ CLEAN', fullName: 'Roland JC-120', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('bright', 'Bright SW', 0), P1('level', 'Level')] },
    { id: 'deluxervb', name: 'DELUXE RVB', fullName: '64 Fender Deluxe Reverb', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'bassmate', name: 'BASS MATE', fullName: '59 Fender Bassman', parameters: AMP_STD },
    { id: 'tweedy', name: 'TWEEDY', fullName: '57 Fender Tweed Deluxe', parameters: [P1('gain', 'Gain'), P1('tone', 'Tone'), P1('master', 'Master'), P1('level', 'Level')] },
    { id: 'twinrvb', name: 'TWIN RVB', fullName: '65 Fender Twin Reverb', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('bright', 'Bright SW', 0), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'hiwire', name: 'HIWIRE', fullName: '1969 HIWATT', parameters: AMP_STD },
    { id: 'calicrunch', name: 'CALI CRUNCH', fullName: '1978 Mesa Boogie MK1', parameters: AMP_STD },
    { id: 'classa15', name: 'CLASS A 15', fullName: 'VOX AC15', parameters: AMP_VOX },
    { id: 'classa30', name: 'CLASS A 30', fullName: 'VOX AC30', parameters: AMP_VOX },
    { id: 'plexi100w', name: 'PLEXI 100W', fullName: '68 Marshall Plexi 100W', parameters: AMP_STD },
    { id: 'plexi45', name: 'PLEXI 45', fullName: '67 Marshall Plexi 45W', parameters: AMP_STD },
    { id: 'brit800', name: 'BRIT 800', fullName: '1977 Marshall JCM800', parameters: AMP_STD },
    { id: '1987x50w', name: '1987 X 50W', fullName: '1989 Marshall 1987 X 50W', parameters: AMP_STD },
    { id: 'slo100', name: 'SLO 100', fullName: '1980 Soldano SLO 100', parameters: AMP_STD },
    { id: 'firemanhbe', name: 'FIREMAN HBE', fullName: '2005 Friedman HBE', parameters: AMP_STD },
    { id: 'dualrect', name: 'DUAL RECT', fullName: '1985 Mesa Dual Rectifier', parameters: AMP_STD },
    { id: 'dievh4', name: 'DIE VH4', fullName: '1999 DEIZEL VH4', parameters: AMP_STD },
    { id: 'vibroking', name: 'VIBRO KING', fullName: '1990 Fender Vibro King', parameters: AMP_STD },
    { id: 'budda', name: 'BUDDA', fullName: 'BUDDA', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'mrz38', name: 'MR Z 38', fullName: '2001 DR Z MAZ 38', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'superrvb', name: 'SUPER RVB', fullName: '2008 Fender Supersonic', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('bright', 'Bright SW', 0), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'britblues', name: 'BRIT BLUES', fullName: '1967 Marshall JTM45', parameters: AMP_STD },
    { id: 'match', name: 'MATCH', fullName: '1986 Matchless  DC30', parameters: AMP_VOX },
    { id: 'brit2000', name: 'BRIT 2000', fullName: 'Marshall JTM2000', parameters: AMP_STD },
    { id: 'uber', name: 'UBER', fullName: 'Bognar Uberschall ', parameters: AMP_STD },
    { id: 'agl', name: 'AGL', fullName: 'Aguilar Tone Hammer AMP', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('mfreq', 'M FREQ'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'bassguy', name: 'BASSGUY', fullName: 'BASSMAN 100', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('presence', 'Presence'), P1('level', 'Level')] },
    { id: 'mld', name: 'MLD', fullName: 'NUX Melvin Lee Davis AMP', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('mfreq', 'M FREQ'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'optimair', name: 'OPTIMA AIR', fullName: 'NUX OPTIMA AIR', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'stageman', name: 'STAGEMAN', fullName: 'NUX STAGEMAN ACOUSTIC', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] }
  ],
  'ir': [
    { id: 'ir-1960a', name: '1960A 4x12', fullName: 'Marshall 1960A', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] },
    { id: 'ir-1960b', name: '1960B 4x12', fullName: 'Marshall 1960B', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] },
    { id: 'ir-green', name: 'Green 4x12', fullName: 'Marshall Greenback', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] },
    { id: 'ir-v30', name: 'V30 4x12', fullName: 'Celestion V30', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] },
    { id: 'ir-brit65', name: 'Brit 65 4x12', fullName: 'Marshall G12-65', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] },
    { id: 'ir-t75', name: 'T75 4x12', fullName: 'Marshall G12-T75', parameters: [P1('level', 'Level'), P1('lowcut', 'Low Cut', 20), P1('highcut', 'High Cut', 80)] }
  ],
  'eq': [
    { id: 'eq-7band', name: '7-Band EQ', fullName: 'Standard 7-Band Graphic EQ', parameters: [P1('62Hz', '62.5Hz'), P1('125Hz', '125Hz'), P1('250Hz', '250Hz'), P1('500Hz', '500Hz'), P1('1kHz', '1kHz'), P1('2kHz', '2kHz'), P1('4kHz', '4kHz')] },
    { id: 'eq-10band', name: '10-Band EQ', fullName: 'Standard 10-Band Graphic EQ', parameters: [P1('31Hz', '31.25Hz'), P1('62Hz', '62.5Hz'), P1('125Hz', '125Hz'), P1('250Hz', '250Hz'), P1('500Hz', '500Hz'), P1('1kHz', '1kHz'), P1('2kHz', '2kHz'), P1('4kHz', '4kHz'), P1('8kHz', '8kHz'), P1('16kHz', '16kHz')] }
  ],
  'modulation': [
    { id: 'mod-ce1', name: 'CE-1', fullName: 'Boss CE-1', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), P1('mix', 'Mix')] },
    { id: 'mod-ce2', name: 'CE-2', fullName: 'Boss CE-2', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), P1('mix', 'Mix')] },
    { id: 'mod-stchorus', name: 'ST Chorus', fullName: 'MXR Stereo Chorus', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), P1('mix', 'Mix')] },
    { id: 'mod-vibrato', name: 'Vibrato', fullName: 'Boss VB-2', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth')] },
    { id: 'mod-detune', name: 'Detune', fullName: 'DigiTech Detune', parameters: [P1('tune', 'Tune'), P1('mix', 'Mix')] },
    { id: 'mod-flanger', name: 'Flanger', fullName: 'MXR Flanger', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), P1('regen', 'Regen'), P1('width', 'Width')] },
    { id: 'mod-phase90', name: 'Phase 90', fullName: 'MXR Phase 90', parameters: [P1('speed', 'Speed'), P1('mix', 'Mix')] },
    { id: 'mod-phase100', name: 'Phase 100', fullName: 'MXR Phase 100', parameters: [P1('speed', 'Speed'), P1('intensity', 'Intensity')] },
    { id: 'mod-chorusplus', name: 'Chorus +', fullName: 'TC Electronic Chorus+', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), P1('mix', 'Mix')] },
    { id: 'mod-uvibe', name: 'U-Vibe', fullName: 'Univox Univibe', parameters: [P1('speed', 'Speed'), P1('intensity', 'Intensity'), P1('mode', 'Mode', 0)] },
    { id: 'mod-tremolo', name: 'Tremolo', fullName: 'Boss TR-2', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth')] },
    { id: 'mod-rotary', name: 'Rotary', fullName: 'Leslie Rotary Speaker', parameters: [P1('speed', 'Speed'), P1('intensity', 'Intensity')] }
  ],
  'delay': [
    { id: 'dly-analog', name: 'Analog', fullName: 'NUX Analog Delay', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix')] },
    { id: 'dly-digital', name: 'Digital', fullName: 'NUX Digital Delay', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix')] },
    { id: 'dly-moddelay', name: 'Mod Delay', fullName: 'NUX Modulation Delay', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix'), P1('rate', 'Rate')] },
    { id: 'dly-tapeecho', name: 'Tape Echo', fullName: 'NUX Tape Echo', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix')] },
    { id: 'dly-reverse', name: 'Reverse', fullName: 'NUX Reverse Delay', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix')] },
    { id: 'dly-pan', name: 'Pan', fullName: 'NUX Pan Delay', parameters: [P1MS('time', 'Time'), P1('feedback', 'Feedback'), P1('mix', 'Mix')] }
  ],
  'reverb': [
    { id: 'rvb-room', name: 'Room', fullName: 'NUX Room Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-hall', name: 'Hall', fullName: 'NUX Hall Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-plate', name: 'Plate', fullName: 'NUX Plate Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-spring', name: 'Spring', fullName: 'NUX Spring Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-shimmer', name: 'Shimmer', fullName: 'NUX Shimmer Reverb', parameters: [P1('decay', 'Decay'), P1('mix', 'Mix')] }
  ]
};