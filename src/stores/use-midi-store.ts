
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';

// Costanti Protocollo NUX MG-30
const NUX_HEADER = [0x00, 0x20, 0x6B];
const DEVICE_ID = 0x01; // Solitamente 0x01 per MG-30

// Mappatura Blocchi per SysEx (ID approssimativi basati su protocollo standard)
const BLOCK_IDS = {
  'noise-gate': 0x01,
  'compressor': 0x02,
  'efx': 0x03,
  'amp': 0x04,
  'eq': 0x05,
  'modulation': 0x06,
  'delay': 0x07,
  'reverb': 0x08
};

// Mappatura CC per Bypass (standard MG-30)
const BYPASS_CC = {
  'efx': 36,
  'amp': 37,
  'noise-gate': 38,
  'eq': 39,
  'modulation': 40,
  'delay': 41,
  'reverb': 42
};

interface MidiStore {
  status: MidiConnectionStatus;
  input: MIDIInput | null;
  output: MIDIOutput | null;
  availableDevices: { inputs: MidiDevice[], outputs: MidiDevice[] };
  devicePresets: Preset[];
  isSyncing: boolean;
  syncProgress: number;
  lastError: string | null;
  
  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number) => void;
  sendParameter: (blockId: string, paramId: number, value: number) => void;
  toggleBlock: (blockType: string, enabled: boolean) => void;
  refreshDevices: () => void;
  syncPresets: () => Promise<void>;
  updatePresetName: (slot: number, newName: string) => void;
}

export const useMidiStore = create<MidiStore>((set, get) => ({
  status: 'disconnected',
  input: null,
  output: null,
  availableDevices: { inputs: [], outputs: [] },
  devicePresets: [],
  isSyncing: false,
  syncProgress: 0,
  lastError: null,

  initialize: async () => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      set({ status: 'error', lastError: 'Web MIDI API non supportata' });
      return;
    }

    set({ status: 'connecting' });

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
          nuxInput.onmidimessage = (message) => {
            const data = message.data;
            if (data[0] === 0xF0) {
              const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
              console.log("%c[MG-30 IN]", "color: #8E24AA", hexString);
            }
          };
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected' });
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

  sendControlChange: (cc, value) => {
    const { output } = get();
    if (output) output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
  },

  sendProgramChange: (pc) => {
    const { output } = get();
    if (output) output.send([0xC0, pc]);
  },

  sendParameter: (blockType, paramId, value) => {
    const { output } = get();
    if (!output) return;
    const blockId = BLOCK_IDS[blockType as keyof typeof BLOCK_IDS] || 0x01;
    // Protocollo SysEx NUX per parametro: F0 [Header] [Device] [MsgType] [Block] [Param] [Value] F7
    const msg = [0xF0, ...NUX_HEADER, DEVICE_ID, 0x01, blockId, paramId, value, 0xF7];
    output.send(msg);
    console.log(`%c[MG-30 OUT] Param Set: ${blockType} P:${paramId} V:${value}`, "color: #2196F3");
  },

  toggleBlock: (blockType, enabled) => {
    const cc = BYPASS_CC[blockType as keyof typeof BYPASS_CC];
    if (cc) {
      get().sendControlChange(cc, enabled ? 127 : 0);
    }
  },

  syncPresets: async () => {
    const { output } = get();
    if (!output) return;
    set({ isSyncing: true, syncProgress: 0 });
    
    // Richiesta nomi preset (Protocollo NUX: F0 00 20 6B 01 01 01 ... )
    for (let i = 1; i <= 56; i++) {
      output.send([0xF0, ...NUX_HEADER, DEVICE_ID, 0x01, 0x00, i, 0xF7]);
      set({ syncProgress: Math.round((i / 56) * 100) });
      await new Promise(r => setTimeout(r, 100));
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
