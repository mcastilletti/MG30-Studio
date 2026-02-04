import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';

interface MidiStore {
  status: MidiConnectionStatus;
  input: MIDIInput | null;
  output: MIDIOutput | null;
  availableDevices: { inputs: MidiDevice[], outputs: MidiDevice[] };
  lastError: string | null;
  
  initialize: () => Promise<void>;
  sendControlChange: (cc: number, value: number) => void;
  sendProgramChange: (pc: number) => void;
  sendSysEx: (data: number[]) => void;
  refreshDevices: () => void;
}

export const useMidiStore = create<MidiStore>((set, get) => ({
  status: 'disconnected',
  input: null,
  output: null,
  availableDevices: { inputs: [], outputs: [] },
  lastError: null,

  initialize: async () => {
    if (typeof window === 'undefined' || !navigator.requestMIDIAccess) {
      set({ status: 'error', lastError: 'Web MIDI API not supported' });
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

        // Auto-detect MG-30
        const nuxInput = Array.from(midiAccess.inputs.values()).find(i => i.name?.includes('NUX') || i.name?.includes('MG-30'));
        const nuxOutput = Array.from(midiAccess.outputs.values()).find(o => o.name?.includes('NUX') || o.name?.includes('MG-30'));

        if (nuxInput && nuxOutput) {
          set({ input: nuxInput, output: nuxOutput, status: 'connected' });
          console.log('NUX MG-30 Detected & Connected');
        } else {
          set({ status: 'disconnected' });
        }
      };

      midiAccess.onstatechange = updateDevices;
      updateDevices();

    } catch (err) {
      set({ status: 'error', lastError: 'Permission denied or MIDI failure' });
    }
  },

  sendControlChange: (cc, value) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      output.send([0xB0, cc, value]);
    }
  },

  sendProgramChange: (pc) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      output.send([0xC0, pc]);
    }
  },

  sendSysEx: (data) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      output.send([0xF0, ...data, 0xF7]);
    }
  },

  refreshDevices: () => {
    get().initialize();
  }
}));
