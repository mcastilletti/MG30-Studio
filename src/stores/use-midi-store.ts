
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';
import { usePresetStore } from './use-preset-store';

// Mappatura Bypass Definitiva (1=ON, 65=OFF)
const BYPASS_CC: Record<string, number> = {
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'modulation': 5,
  'noise-gate': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9
};

// Mappatura Parametri specifica per ogni blocco basata sulla tabella fornita
const BLOCK_PARAM_CCS: Record<string, number[]> = {
  'compressor': [14, 15, 16, 17],
  'efx': [18, 19, 20, 21, 22],
  'amp': [24, 25, 26, 27, 28, 29, 30, 31],
  'eq': [32, 33, 34, 35, 36, 37, 38, 39],
  'noise-gate': [44, 45],
  'modulation': [48, 49, 50, 51, 52],
  'delay': [54, 55, 56, 57, 58, 59, 60, 61],
  'reverb': [62, 63, 64, 65],
  'ir': [66, 67, 68, 69]
};

const SELECT_BLOCK_CC = 78;
const BLOCK_INDEX_MAP: Record<string, number> = {
  'compressor': 0,
  'efx': 1,
  'amp': 2,
  'eq': 3,
  'modulation': 4,
  'noise-gate': 5,
  'delay': 6,
  'reverb': 7,
  'ir': 8
};

const VAL_ON = 1;
const VAL_OFF = 65;
const CC_VOLUME = 11;

const INITIAL_PRESETS: Preset[] = Array.from({ length: 56 }, (_, i) => ({
  slot: i + 1,
  name: `Slot ${String(i + 1).padStart(2, '0')}`,
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
          console.log('%c[MIDI] Connesso a NUX MG-30', 'color: #4CAF50; font-weight: bold');
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

    // Log per debug (viola per messaggi in ingresso)
    console.log(`%c[MIDI IN] Len:${data.length} | ${Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`, 'color: #9C27B0');

    // Bypass sync da hardware
    if (data[0] === 0xB0) {
      const cc = data[1];
      const val = data[2];
      
      const blockType = Object.keys(BYPASS_CC).find(key => BYPASS_CC[key] === cc);
      if (blockType) {
        const isEnabled = val === VAL_ON;
        usePresetStore.getState().updateBlockStateLocally(blockType, isEnabled);
      }
    }

    // Parsing Nomi Preset dai dati dump
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
        console.log(`%c[MG-30] Nome Preset Trovato: ${foundName}`, 'color: #4CAF50; font-weight: bold; background: #E8F5E9; padding: 2px 5px; border-radius: 3px');
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
      console.log(`%c[MIDI OUT] Program Change: ${pc}`, 'color: #2196F3');
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
    if (cc !== undefined) {
      const val = enabled ? VAL_ON : VAL_OFF;
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
    
    console.log('%c[MG-30] Inizio Sincronizzazione Avanzata...', 'color: #FF9800; font-weight: bold');
    set({ isSyncing: true, syncProgress: 0 });
    
    for (let i = 1; i <= 56; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 56) * 100) });
      sendProgramChange(i - 1);
      
      // Richiesta Dump specifica per NUX
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
