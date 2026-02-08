
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, LayoutGrid, List, MoreVertical, RefreshCw, Loader2, Edit2, Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';
import { Preset } from '@/types/preset';

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

export default function LibraryPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  
  const { sendProgramChange, status, devicePresets, syncPresets, isSyncing, syncProgress, updatePresetName } = useMidiStore();
  const { setActivePreset } = usePresetStore();
  const { toast } = useToast();

  const filteredPresets = devicePresets.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    formatSlotLabel(p.slot).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAndEdit = (preset: Preset) => {
    // 1. Invia MIDI Program Change se connesso
    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    } else {
      toast({
        title: "Dispositivo non connesso",
        description: "Caricamento locale. Collega l'MG-30 per il sync hardware.",
        variant: "destructive"
      });
    }

    // 2. Prepara il preset con una catena di default se vuota (per evitare editor vuoto)
    const presetToLoad = {
      ...preset,
      effects: preset.effects.length > 0 ? preset.effects : [
        { id: 'ng', type: 'noise-gate', model: 'gate', enabled: true, parameters: { threshold: 20, decay: 50 } },
        { id: 'cmp', type: 'compressor', model: 'rose', enabled: false, parameters: { sustain: 40, level: 50 } },
        { id: 'efx', type: 'efx', model: 'tscream', enabled: true, parameters: { drive: 30, tone: 50, level: 50 } },
        { id: 'amp', type: 'amp', model: 'jazzclean', enabled: true, parameters: { gain: 45, master: 60, bass: 50, mid: 50, treble: 50, level: 50 } },
        { id: 'ir', type: 'ir', model: 'ir-jz120', enabled: true, parameters: { level: 50, lowcut: 20, highcut: 20000, mic: 1, axis: 0 } },
        { id: 'eq', type: 'eq', model: 'eq-ge6', enabled: true, parameters: { '100hz': 50, '220hz': 50, '500hz': 50, '1.2khz': 50, '2.6khz': 50, '6.4khz': 50, level: 50 } },
        { id: 'mod', type: 'modulation', model: 'mod-ce1', enabled: false, parameters: { intensity: 30, depth: 50, rate: 50, subdiv: 2 } },
        { id: 'delay', type: 'delay', model: 'dly-analog', enabled: false, parameters: { repeat: 40, echo: 30, intensity: 20, subdiv: 2 } },
        { id: 'reverb', type: 'reverb', model: 'room', enabled: true, parameters: { decay: 2.5, tone: 50, level: 50 } }
      ]
    };

    // 3. Imposta come preset attivo nello store
    setActivePreset(presetToLoad);

    // 4. Naviga alla pagina Editor
    router.push('/editor');
  };

  const startEditingName = (e: React.MouseEvent, preset: Preset) => {
    e.stopPropagation();
    setEditingSlot(preset.slot);
    setEditName(preset.name);
  };

  const saveName = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingSlot) {
      updatePresetName(editingSlot, editName);
      setEditingSlot(null);
      toast({ title: "Nome aggiornato", description: "Il nome del preset è stato salvato localmente." });
    }
  };

  const handleSync = () => {
    if (status !== 'connected') {
      toast({
        title: "Errore",
        description: "Impossibile sincronizzare: dispositivo non connesso.",
        variant: "destructive"
      });
      return;
    }
    syncPresets();
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Libreria Preset</h2>
            <p className="text-muted-foreground">Sincronizza e gestisci i 128 slot (01A-32D) della tua pedaliera MG-30.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSync} 
              variant={isSyncing ? "secondary" : "outline"} 
              className="gap-2 min-w-[200px]"
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isSyncing ? `Sincronizzazione ${syncProgress}%` : 'Sincronizza Hardware'}
            </Button>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuovo Preset</Button>
          </div>
        </header>

        {isSyncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-widest">
              <span>Recupero nomi preset dall'MG-30...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border shadow-inner">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cerca tra i preset..." 
              className="pl-10 bg-background/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="border-border/50"><Filter className="w-4 h-4" /></Button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <div className="flex rounded-md border border-border p-1 bg-background/50">
              <Button 
                variant={view === 'grid' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button 
                variant={view === 'list' ? 'secondary' : 'ghost'} 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setView('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredPresets.length === 0 ? (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center text-center opacity-60">
            <RefreshCw className="w-12 h-12 mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold">Nessun Preset trovato</h3>
            <p className="max-w-xs mx-auto mt-2 text-sm">
              I preset dovrebbero apparire automaticamente. Sincronizza l'hardware per iniziare.
            </p>
          </Card>
        ) : (
          view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPresets.map((preset) => (
                <Card 
                  key={preset.slot} 
                  className={`group overflow-hidden hover:border-primary/50 transition-all bg-card/40 backdrop-blur-sm cursor-pointer hover:shadow-xl border-border/50`}
                  onClick={() => handleSelectAndEdit(preset)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary bg-primary/5">
                        SLOT {formatSlotLabel(preset.slot)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={(e) => startEditingName(e, preset)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectAndEdit(preset); }}>Modifica Parametri</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => startEditingName(e as any, preset)}>Rinomina</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {editingSlot === preset.slot ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="icon" className="h-8 w-8" onClick={saveName}><Check className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors truncate">
                        {preset.name}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pb-4">
                     <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Modello Amp</div>
                        <div className="text-sm font-medium opacity-80">{preset.ampModel}</div>
                     </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/30 bg-secondary/5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">MIDI PC: {preset.slot - 1}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] px-2 font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground"
                    >
                      Modifica
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/50">
                    <tr className="text-left">
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest w-20 text-center">Slot</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Nome Preset</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Modello Amp</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredPresets.map((preset) => (
                      <tr 
                        key={preset.slot} 
                        className="hover:bg-primary/5 transition-colors group cursor-pointer" 
                        onClick={() => handleSelectAndEdit(preset)}
                      >
                        <td className="p-4 font-mono font-bold text-primary text-center">
                          {formatSlotLabel(preset.slot)}
                        </td>
                        <td className="p-4 font-semibold group-hover:text-primary transition-colors">
                          {editingSlot === preset.slot ? (
                            <div className="flex items-center gap-2">
                              <Input 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 text-sm max-w-[200px]"
                              />
                              <Button size="icon" className="h-8 w-8" onClick={saveName}><Check className="w-4 h-4" /></Button>
                            </div>
                          ) : (
                            preset.name
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="bg-secondary/50 text-[10px] uppercase">{preset.ampModel}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase" onClick={(e) => startEditingName(e as any, preset)}>Rinomina</Button>
                             <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase">Modifica</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        )}
      </div>
    </AppShell>
  );
}
