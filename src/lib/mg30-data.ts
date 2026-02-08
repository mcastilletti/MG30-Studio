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
const SUBDIV = { id: 'subdiv', name: 'Sub Div', min: 0, max: 6, step: 1, default: 2 }; // 1/4., 1/8D, 1/8, 1/4T, 1/16, 1/8T, 1/32

const AMP_STD_PARAMS = [
  P1('gain', 'Gain', 40), P1('master', 'Master', 50), P1('bass', 'Bass', 50), P1('mid', 'Middle', 50),
  P1('treble', 'Treble', 50), P1('presence', 'Presence', 50), P1('bias', 'Bias', 50), P1('level', 'Level', 50)
];

const IR_GUITAR_PARAMS = [
  { id: 'mic', name: 'Mic', min: 0, max: 7, step: 1, default: 1 }, // DYN421, S57, U87, R122, R121, C414, C3000, B52
  { id: 'axis', name: 'Axis', min: 0, max: 2, step: 1, default: 0 }, // CENTER, MIDDLE, EDGE
  { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50, unit: 'dB' },
  { id: 'lowcut', name: 'Lo Cut', min: 20, max: 1000, step: 1, default: 20, unit: 'Hz' },
  { id: 'highcut', name: 'Hi Cut', min: 5000, max: 20000, step: 1, default: 20000, unit: 'Hz' }
];

const IR_BASS_PARAMS = [
  { id: 'level', name: 'Level', min: 0, max: 100, step: 1, default: 50, unit: 'dB' },
  { id: 'lowcut', name: 'Lo Cut', min: 20, max: 1000, step: 1, default: 20, unit: 'Hz' },
  { id: 'highcut', name: 'Hi Cut', min: 5000, max: 20000, step: 1, default: 20000, unit: 'Hz' }
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
    { id: 'jazzclean', name: 'JAZZ CLEAN', fullName: 'Roland JC-120', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('brightsw', 'Bright SW', 0), P1('level', 'Level')] },
    { id: 'deluxervb', name: 'DELUXE RVB', fullName: '64 Fender Deluxe Reverb', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'bassmate', name: 'BASS MATE', fullName: '59 Fender Bassman', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('presence', 'Presence'), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'tweedy', name: 'TWEEDY', fullName: '57 Fender Tweed Deluxe', parameters: [P1('gain', 'Gain'), P1('tone', 'Tone'), P1('master', 'Master'), P1('level', 'Level')] },
    { id: 'twinrvb', name: 'TWIN RVB', fullName: '65 Fender Twin Reverb', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('brightsw', 'Bright SW', 0), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'hiwire', name: 'HIWIRE', fullName: '1969 HIWATT', parameters: AMP_STD_PARAMS },
    { id: 'calicrunch', name: 'CALI CRUNCH', fullName: '1978 Mesa Boogie MK1', parameters: AMP_STD_PARAMS },
    { id: 'classa15', name: 'CLASS A 15', fullName: 'VOX AC15', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'classa30', name: 'CLASS A 30', fullName: 'VOX AC30', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'plexi100w', name: 'PLEXI 100W', fullName: '68 Marshall Plexi 100W', parameters: AMP_STD_PARAMS },
    { id: 'plexi45', name: 'PLEXI 45', fullName: '67 Marshall Plexi 45W', parameters: AMP_STD_PARAMS },
    { id: 'brit800', name: 'BRIT 800', fullName: '1977 Marshall JCM800', parameters: AMP_STD_PARAMS },
    { id: '1987x50w', name: '1987 X 50W', fullName: '1989 Marshall 1987 X 50W', parameters: AMP_STD_PARAMS },
    { id: 'slo100', name: 'SLO 100', fullName: '1980 Soldano SLO 100', parameters: AMP_STD_PARAMS },
    { id: 'firemanhbe', name: 'FIREMAN HBE', fullName: '2005 Friedman HBE', parameters: AMP_STD_PARAMS },
    { id: 'dualrect', name: 'DUAL RECT', fullName: '1985 Mesa Dual Rectifier', parameters: AMP_STD_PARAMS },
    { id: 'dievh4', name: 'DIE VH4', fullName: '1999 DEIZEL VH4', parameters: AMP_STD_PARAMS },
    { id: 'vibroking', name: 'VIBRO KING', fullName: '1990 Fender Vibro King', parameters: AMP_STD_PARAMS },
    { id: 'budda', name: 'BUDDA', fullName: 'BUDDA', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'mrz38', name: 'MR Z 38', fullName: '2001 DR Z MAZ 38', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'superrvb', name: 'SUPER RVB', fullName: '2008 Fender Supersonic', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('brightsw', 'Bright SW', 0), P1('bias', 'Bias'), P1('level', 'Level')] },
    { id: 'britblues', name: 'BRIT BLUES', fullName: '1967 Marshall JTM45', parameters: AMP_STD_PARAMS },
    { id: 'match', name: 'MATCH', fullName: '1986 Matchless DC30', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('cut', 'Cut'), P1('bass', 'Bass'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'brit2000', name: 'BRIT 2000', fullName: 'Marshall JTM2000', parameters: AMP_STD_PARAMS },
    { id: 'uber', name: 'UBER', fullName: 'Bognar Uberschall', parameters: AMP_STD_PARAMS },
    { id: 'agl', name: 'AGL', fullName: 'Aguilar Tone Hammer AMP', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), { id: 'mfreq', name: 'M FREQ', min: 0, max: 100, step: 1, default: 50 }, P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'bassguy', name: 'BASSGUY', fullName: 'BASSMAN 100', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('presence', 'Presence'), P1('level', 'Level')] },
    { id: 'mld', name: 'MLD', fullName: 'NUX Melvin Lee Davis AMP', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), { id: 'mfreq', name: 'M FREQ', min: 0, max: 100, step: 1, default: 50 }, P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'optimair', name: 'OPTIMA AIR', fullName: 'NUX OPTIMA AIR', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] },
    { id: 'stageman', name: 'STAGEMAN', fullName: 'NUX STAGEMAN ACOUSTIC', parameters: [P1('gain', 'Gain'), P1('master', 'Master'), P1('bass', 'Bass'), P1('mid', 'Middle'), P1('treble', 'Treble'), P1('level', 'Level')] }
  ],
  'ir': [
    { id: 'ir-jz120', name: 'JZ 120', fullName: 'ROLAND JC120', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-dr112', name: 'DR112', fullName: '64 DELUXE REVERB', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-bs410', name: 'BS410', fullName: '59 BASSMAN', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-a212', name: 'A212', fullName: 'VOX AC30', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-tr212', name: 'TR212', fullName: '65 TWIN REVERB', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-1960', name: '1960', fullName: 'MARSHALL 4X12', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-gb412', name: 'GB412', fullName: 'MARSHALL GREENBACK 4X12', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-v412', name: 'V412', fullName: 'MARSHALL VINTAGE 30 4X12', parameters: IR_GUITAR_PARAMS },
    { id: 'ir-agldb810', name: 'AGL DB810', fullName: 'AGL 8X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-sv810', name: 'AMP SV810', fullName: 'AMPEG SVT 8X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-sv410', name: 'AMP SV410', fullName: 'AMPEG SVT 4X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-sv212', name: 'AMP SV212', fullName: 'AMPEG SVT 2X12', parameters: IR_BASS_PARAMS },
    { id: 'ir-mkb410', name: 'MKB 410', fullName: 'MARK BASS 4X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-trc410', name: 'TRC 410', fullName: 'TRACE ELIIOT 410', parameters: IR_BASS_PARAMS },
    { id: 'ir-eden410', name: 'EDEN 410', fullName: 'EDEN 4X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-bassguy410', name: 'BASSGUY 410', fullName: 'FENDER BASSMAN 4X10', parameters: IR_BASS_PARAMS },
    { id: 'ir-md45', name: 'M-D45', fullName: 'MARTIN D45 (ACOUSTIC)', parameters: IR_BASS_PARAMS },
    { id: 'ir-ghbird', name: 'G-HBIRD', fullName: 'GIBSON HUMMINGBIRD (ACOUSTIC)', parameters: IR_BASS_PARAMS },
    { id: 'ir-gj15', name: 'G-J15', fullName: 'GIBSON J-15 (ACOUSTIC)', parameters: IR_BASS_PARAMS },
    { id: 'ir-user', name: 'USER IR CAB', fullName: 'USER IR CAB', parameters: IR_BASS_PARAMS }
  ],
  'eq': [
    { 
      id: 'eq-ge6', 
      name: '6-BAND EQ', 
      fullName: 'BOSS GE-6', 
      parameters: [
        P1('100hz', '100Hz'), P1('220hz', '220Hz'), P1('500hz', '500Hz'), 
        P1('1.2khz', '1.2kHz'), P1('2.6khz', '2.6kHz'), P1('6.4khz', '6.4kHz'), P1('level', 'Level')
      ] 
    },
    { 
      id: 'eq-align', 
      name: 'ALIGN EQ', 
      fullName: 'ALIGN EQ', 
      parameters: [
        { id: 'hpf', name: 'HPF', min: 0, max: 2, step: 1, default: 0 },
        P1('110hz', '110Hz'), P1('340hz', '340Hz'), P1('660hz', '660Hz'), 
        P1('1300hz', '1300Hz'), P1('2600hz', '2600Hz'), P1('5000hz', '5000Hz'), P1('volume', 'Volume')
      ] 
    },
    { 
      id: 'eq-10band', 
      name: '10-BAND EQ', 
      fullName: 'MXR 10 BAND', 
      parameters: [
        P1('vol', 'VOL'), P1('31.25hz', '31.25Hz'), P1('62.5hz', '62.5Hz'), P1('125hz', '125Hz'),
        P1('250hz', '250Hz'), P1('500hz', '500Hz'), P1('1khz', '1KHz'), P1('2khz', '2KHz'),
        P1('4khz', '4KHz'), P1('8khz', '8KHz'), P1('16khz', '16KHz'), P1('gain', 'GAIN')
      ] 
    },
    { 
      id: 'eq-para', 
      name: 'PARA EQ', 
      fullName: 'PARA EQ', 
      parameters: [
        P1('b1freq', 'Band1 Freq'), P1('b1gain', 'Band1 Gain'), P1('b1q', 'Band1 Q'),
        P1('b2freq', 'Band2 Freq'), P1('b2gain', 'Band2 Gain'), P1('b2q', 'Band2 Q'),
        P1('b3freq', 'Band3 Freq'), P1('b3gain', 'Band3 Gain'), P1('b3q', 'Band3 Q')
      ] 
    }
  ],
  'modulation': [
    { id: 'mod-ce1', name: 'CE-1', fullName: 'ROLAND CE-1 CHORUS', parameters: [P1('intensity', 'Intensity'), P1('depth', 'Depth'), P1('rate', 'Rate'), SUBDIV] },
    { id: 'mod-ce2', name: 'CE-2', fullName: 'ROLAND CE-2 CHORUS', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), SUBDIV] },
    { id: 'mod-stereo', name: 'STEREO CHORUS', fullName: 'MXR STEREO CHORUS', parameters: [P1('intensity', 'Intensity'), P1('width', 'Width'), P1('rate', 'Rate'), SUBDIV] },
    { id: 'mod-vibrator', name: 'VIBRATOR', fullName: 'BOSS VB-2 Vibrato', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), SUBDIV] },
    { id: 'mod-detune', name: 'DETUNE', fullName: 'Stereo DETUNE', parameters: [P1('shift_l', 'Shift L'), P1('mix', 'Mix'), P1('shift_r', 'Shift R'), P1('mix_r', 'Mix R')] },
    { id: 'mod-flanger', name: 'FLANGER', fullName: 'BOSS BF-2 Flanger', parameters: [P1('level', 'Level'), P1('rate', 'Rate'), P1('width', 'Width'), P1('fback', 'F.Back'), SUBDIV] },
    { id: 'mod-ph90', name: 'PH 90', fullName: 'MXR PHASE 90', parameters: [P1('speed', 'Speed'), SUBDIV] },
    { id: 'mod-ph100', name: 'PHASE 100', fullName: 'MXR PHASE 100', parameters: [P1('intensity', 'Intensity'), P1('speed', 'Speed'), SUBDIV] },
    { id: 'mod-scf', name: 'S.C.F.', fullName: 'TC CHORUS', parameters: [P1('speed', 'Speed'), P1('width', 'Width'), { id: 'mode', name: 'Mode', min: 0, max: 2, step: 1, default: 0 }, P1('intensity', 'Intensity'), SUBDIV] },
    { id: 'mod-uvibe', name: 'U-VIBE', fullName: 'DUNLOP UNIVIBE', parameters: [P1('speed', 'Speed'), P1('volume', 'Volume'), P1('intensity', 'Intensity'), { id: 'mode', name: 'Mode', min: 0, max: 1, step: 1, default: 0 }, SUBDIV] },
    { id: 'mod-tremolo', name: 'TREMOLO', fullName: 'BOSS TR-3 TREMOLO', parameters: [P1('rate', 'Rate'), P1('depth', 'Depth'), SUBDIV] },
    { id: 'mod-rty', name: 'RTY SPK', fullName: 'ROTARY SPEAKER', parameters: [P1('balance', 'Balance'), P1('speed', 'Speed'), SUBDIV] },
    { id: 'mod-harmony', name: 'HARMONY', fullName: 'MXR HARMONIZER', parameters: [{ id: 'key', name: 'Key', min: 0, max: 11, step: 1, default: 0 }, { id: 'scale', name: 'Scale', min: 0, max: 1, step: 1, default: 0 }, { id: 'harm', name: 'Harm', min: 0, max: 9, step: 1, default: 5 }, P1('blend', 'Blend')] }
  ],
  'delay': [
    { id: 'dly-analog', name: 'ANALOG DELAY', fullName: 'Boss DM-2 Analog Delay', parameters: [P1('repeat', 'Repeat'), P1('echo', 'Echo'), P1('intensity', 'Intensity'), SUBDIV] },
    { id: 'dly-digital', name: 'DIGI DELAY', fullName: 'Boss DD-2 Digital Delay', parameters: [P1('level', 'Effect Level'), P1('feedback', 'Feedback'), P1('time', 'Delay Time'), SUBDIV] },
    { id: 'dly-mod', name: 'MODULATION', fullName: 'Ibanez DML Modulation Delay', parameters: [P1('time', 'Time'), P1('level', 'Level'), P1('mod', 'Modulation'), P1('repeat', 'Repeat'), SUBDIV] },
    { id: 'dly-tape', name: 'TAPE ECHO', fullName: 'Maestro EchoPlex EP-4', parameters: [P1('time', 'Time'), P1('level', 'Level'), P1('repeat', 'Repeat'), SUBDIV] },
    { id: 'dly-reverse', name: 'REVERSE DELAY', fullName: 'Boss DD8 Reverse Delay', parameters: [P1('time', 'Time'), P1('mix', 'Mix'), P1('feedback', 'Feedback'), SUBDIV] },
    { id: 'dly-pan', name: 'PAN DELAY', fullName: 'Ibanez DPL10 Stereo Pan Delay', parameters: [P1('time', 'Time'), P1('repeat', 'Repeat'), P1('level', 'Delay Level'), SUBDIV] },
    { 
      id: 'dly-duo', 
      name: 'DUOTIME', 
      fullName: 'NUX DUOTIME', 
      parameters: [
        P1('level', 'Level'), 
        P1('time1', 'Time1'), { id: 'subdiv1', name: 'Sub Div1', min: 0, max: 6, step: 1, default: 2 }, P1('repeat1', 'Repeat1'),
        P1('time2', 'Time2'), { id: 'subdiv2', name: 'Sub Div2', min: 0, max: 6, step: 1, default: 2 }, P1('repeat2', 'Repeat2'),
        P1('para', 'Para')
      ] 
    }
  ],
  'reverb': [
    { id: 'rvb-room', name: 'Room', fullName: 'NUX Room Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-hall', name: 'Hall', fullName: 'NUX Hall Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-plate', name: 'Plate', fullName: 'NUX Plate Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] },
    { id: 'rvb-spring', name: 'Spring', fullName: 'NUX Spring Reverb', parameters: [P1('decay', 'Decay'), P1('tone', 'Tone'), P1('mix', 'Mix')] }
  ]
};