
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';
import { usePresetStore } from './use-preset-store';

const NUX_HEADER = [0x00, 0x20, 0x6B];
const DEVICE_ID = 0x01;

// Mappatura CC definitiva basata sui test dell'utente
// Valori: ON = 1, OFF = 65
const BYPASS_CC: Record<string, number> = {
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'noise-gate': 5,
  'modulation': 6,
  'delay': 7,
  'reverb': 8,
  'ir': 9
};

// Mappatura per CC 78 (Selezione Blocco / Edit Mode)
const SELECT_BLOCK_CC = 78;
const BLOCK_INDEX_MAP: Record<string, number> = {
  'noise-gate': 0,
  'compressor': 1,
  'efx': 2,
  'amp': 3,
  'eq': 4,
  'modulation': 5,
  'delay': 6,
  'reverb': 7,
  'ir': 8
};

const VAL_ON = 1;
const VAL_OFF = 65;

const INITIAL_PRESETS: Preset[] = Array.from({ length: 56 }, (_, i) => ({
  slot: i + 1,
  name: `Slot ${String(i + 1).padStart(2, '0')}`,
  category: 'User',
  tags: [],
  favorite: false,
  rating: 0,
  lastModified: new Date(),
  ampModel: 'NUX Modeling',
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
  sendParameter: (blockId: string, paramId: number, value: number) => void;
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
          console.log("%c[MIDI] Connesso a NUX MG-30", "color: #4CAF50; font-weight: bold;");
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

    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    // Log per messaggi CC in arrivo (ascolto cambiamenti hardware)
    if (data[0] === 0xB0) {
      const cc = data[1];
      const val = data[2];
      
      // Bypass detection
      const blockType = Object.keys(BYPASS_CC).find(key => BYPASS_CC[key] === cc);
      if (blockType) {
        const isEnabled = val === VAL_ON;
        usePresetStore.getState().updateBlockStateLocally(blockType, isEnabled);
      }
    }

    // Parsing SysEx per nomi (Scansione ASCII)
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
        console.log(`%c[MIDI] Trovato Nome Preset: ${foundName}`, "color: #00E676; font-weight: bold;");
        updatePresetName(currentSyncSlot, foundName);
      }
    }
  },

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) {
      console.log(`%c[MIDI OUT] CC: ${cc} | Val: ${value}`, "color: #2196F3;");
      output.send([0xB0, cc, value]);
    }
  },

  sendProgramChange: (pc) => {
    const { output } = get();
    if (output) {
      console.log(`%c[MIDI OUT] Program Change: ${pc}`, "color: #FF9800;");
      output.send([0xC0, pc]);
    }
  },

  sendParameter: (blockType, paramId, value) => {
    const { output } = get();
    if (!output) return;
    const blockMap: Record<string, number> = { 'noise-gate': 0x01, 'compressor': 0x02, 'efx': 0x03, 'amp': 0x04, 'ir': 0x09, 'eq': 0x05, 'modulation': 0x06, 'delay': 0x07, 'reverb': 0x08 };
    const blockId = blockMap[blockType] || 0x01;
    const msg = [0xF0, ...NUX_HEADER, DEVICE_ID, 0x01, blockId, paramId, value, 0xF7];
    output.send(msg);
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
      console.log(`%c[MIDI OUT] Select Block (CC 78): ${blockType} (Val: ${value})`, "color: #9C27B0; font-weight: bold;");
      get().sendControlChange(SELECT_BLOCK_CC, value);
    }
  },

  syncPresets: async () => {
    const { output, sendProgramChange } = get();
    if (!output) return;
    
    set({ isSyncing: true, syncProgress: 0 });
    console.log("%c[MG-30] Inizio Sincronizzazione Avanzata...", "color: #00BCD4; font-weight: bold;");
    
    for (let i = 1; i <= 56; i++) {
      set({ currentSyncSlot: i, syncProgress: Math.round((i / 56) * 100) });
      sendProgramChange(i - 1);
      
      await new Promise(r => setTimeout(r, 450));
      // Richiesta dump nomi
      output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x01, 0xF7]);
      await new Promise(r => setTimeout(r, 100));
      output.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x40, 0x00, 0xF7]);
      await new Promise(r => setTimeout(r, 300)); 
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
