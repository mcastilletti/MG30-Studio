
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

        // Auto-detect MG-30 (NUX Manufacturer ID is 00 20 6B)
        const nuxInput = Array.from(midiAccess.inputs.values()).find(i => 
          i.name?.toUpperCase().includes('NUX') || i.name?.toUpperCase().includes('MG-30')
        );
        const nuxOutput = Array.from(midiAccess.outputs.values()).find(o => 
          o.name?.toUpperCase().includes('NUX') || o.name?.toUpperCase().includes('MG-30')
        );

        if (nuxInput && nuxOutput) {
          // Setup listener for incoming messages
          nuxInput.onmidimessage = (message) => {
            // Qui gestiremo i messaggi in arrivo dalla pedaliera (es. se muovi una manopola fisica)
            console.log('MIDI Input:', message.data);
          };
          
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected' });
        } else {
          set({ status: 'disconnected' });
        }
      };

      midiAccess.onstatechange = updateDevices;
      updateDevices();

    } catch (err) {
      set({ status: 'error', lastError: 'Permesso negato o errore MIDI' });
    }
  },

  sendControlChange: (cc, value) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      // Standard CC: [Status, Controller, Value]
      // Per MG-30 molti parametri usano CC o SysEx. Usiamo CC come fallback.
      output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
    }
  },

  sendProgramChange: (pc) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      // Program Change: [0xCn, ProgramNumber] (n = MIDI Channel, 0-indexed)
      // MG-30 slot 1-56 mappati su 0-55
      output.send([0xC0, pc]);
      console.log(`Sending PC: ${pc} (Slot ${pc + 1})`);
    }
  },

  sendSysEx: (data) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      // NUX SysEx format: F0 [00 20 6B] ... F7
      output.send([0xF0, 0x00, 0x20, 0x6B, ...data, 0xF7]);
    }
  },

  refreshDevices: () => {
    get().initialize();
  }
}));
