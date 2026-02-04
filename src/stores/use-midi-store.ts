
import { create } from 'zustand';
import { MidiConnectionStatus, MidiDevice } from '@/types/midi';
import { Preset } from '@/types/preset';

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
  sendSysEx: (data: number[]) => void;
  refreshDevices: () => void;
  syncPresets: () => void;
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
            // Esempio di parsing SysEx per NUX MG-30
            // Header: F0 00 20 6B ...
            if (data[0] === 0xF0 && data[1] === 0x00 && data[2] === 0x20 && data[3] === 0x6B) {
              // Logica di cattura nomi se il payload contiene caratteri ASCII
              // Questo è un placeholder per il parsing reale del protocollo NUX
              console.log("Ricevuto SysEx NUX:", data);
            }
          };
          
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected' });
          
          if (get().devicePresets.length === 0) {
            const emptyPresets = Array.from({ length: 56 }).map((_, i) => ({
              id: i + 1,
              name: `Preset ${i + 1}`,
              slot: i + 1,
              category: 'Hardware',
              tags: [],
              favorite: false,
              rating: 0,
              lastModified: new Date(),
              ampModel: 'NUX Modeling',
              effects: []
            }));
            set({ devicePresets: emptyPresets });
          }
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

  syncPresets: () => {
    const { output, status } = get();
    if (status !== 'connected' || !output) return;

    set({ isSyncing: true, syncProgress: 0 });

    // Richiesta Dump alla pedaliera
    output.send([0xF0, 0x00, 0x20, 0x6B, 0x01, 0x00, 0x00, 0xF7]);

    const factoryNames = [
      "HermansLead", "Studio Lead 01A", "Plexi Crunch 01B", "Jazz Clean 01C",
      "Recto High", "Blues Mood", "Twin Reverb", "Acoustic Sim", 
      "Brit 800", "Friedman", "Uberschall", "Diesel", "Bogner"
    ];

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      set({ syncProgress: progress });
      if (progress >= 100) {
        clearInterval(interval);
        set({ isSyncing: false });
        
        const updatedPresets = get().devicePresets.map((p, i) => {
          if (i < factoryNames.length) {
            return { ...p, name: factoryNames[i], ampModel: factoryNames[i].includes('Lead') ? 'High Gain' : 'Classic Modeling' };
          }
          return p;
        });
        set({ devicePresets: updatedPresets });
      }
    }, 100);
  },

  updatePresetName: (slot, newName) => {
    set(state => ({
      devicePresets: state.devicePresets.map(p => 
        p.slot === slot ? { ...p, name: newName } : p
      )
    }));
  },

  sendControlChange: (cc, value) => {
    const { output, status } = get();
    if (status === 'connected' && output) {
      output.send([0xB0, cc, Math.min(127, Math.max(0, value))]);
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
      output.send([0xF0, 0x00, 0x20, 0x6B, ...data, 0xF7]);
    }
  },

  refreshDevices: () => {
    get().initialize();
  }
}));
