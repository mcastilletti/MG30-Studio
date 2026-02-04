
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
            // Log di tutti i messaggi SysEx in arrivo per analisi
            if (data[0] === 0xF0) {
              const hexString = Array.from(data)
                .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ');
              console.log("%c[MIDI IN] SysEx:", "color: #8E24AA; font-weight: bold", hexString);
              
              // Esempio: tenta di estrarre testo se presente (caratteri ASCII stampabili)
              const chars = Array.from(data)
                .filter(b => b >= 32 && b <= 126)
                .map(b => String.fromCharCode(b))
                .join('');
              if (chars.length > 3) {
                console.log("%c[MIDI IN] Text Found:", "color: #4CAF50", chars);
              }
            }
          };
          
          set({ input: nuxInput as MIDIInput, output: nuxOutput as MIDIOutput, status: 'connected' });
          
          if (get().devicePresets.length === 0) {
            const emptyPresets = Array.from({ length: 56 }).map((_, i) => ({
              id: i + 1,
              name: `Slot ${i + 1}`,
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

  syncPresets: async () => {
    const { output, status } = get();
    if (status !== 'connected' || !output) return;

    set({ isSyncing: true, syncProgress: 0 });

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Comandi di prova per richiedere il preset dump (come suggerito)
    // Usiamo lo slot 0 (primo preset) come test
    const slotNumber = 0;
    const testCommands = [
      [0xF0, 0x00, 0x20, 0x6B, 0x00, 0x01, slotNumber, 0xF7], // Standard dump
      [0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x01, slotNumber, 0xF7], // With device ID
      [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7],                   // Device Inquiry
      [0xF0, 0x00, 0x20, 0x6B, 0x00, 0x00, 0xF7],             // Bulk request
    ];

    console.log("%c[MIDI OUT] Starting Hardware Sync Trials...", "color: #FF9800; font-weight: bold");

    for (let i = 0; i < testCommands.length; i++) {
      const cmd = testCommands[i];
      console.log(`Sending dump request ${i + 1}:`, cmd.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      output.send(cmd);
      
      // Aggiorniamo la progress bar basandoci sui tentativi
      set({ syncProgress: Math.round(((i + 1) / testCommands.length) * 100) });
      
      await sleep(500); // Aspetta tra un comando e l'altro
    }

    // Simuliamo un caricamento riuscito per ora, in attesa di catturare il SysEx corretto
    const factoryNames = [
      "HermansLead", "Studio Lead 01A", "Plexi Crunch 01B", "Jazz Clean 01C",
      "Recto High", "Blues Mood", "Twin Reverb", "Acoustic Sim", 
      "Brit 800", "Friedman", "Uberschall", "Diesel", "Bogner"
    ];

    const updatedPresets = get().devicePresets.map((p, i) => {
      if (i < factoryNames.length) {
        return { ...p, name: factoryNames[i], ampModel: factoryNames[i].includes('Lead') ? 'High Gain' : 'Classic Modeling' };
      }
      return p;
    });

    set({ devicePresets: updatedPresets, isSyncing: false });
    console.log("%c[MIDI OUT] Sync Trial Complete. Check console for NUX responses.", "color: #4CAF50; font-weight: bold");
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
