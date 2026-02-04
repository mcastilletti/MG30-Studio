
"use client"

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, LayoutGrid, List, Star, MoreVertical, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';

const MOCK_PRESETS = Array.from({ length: 56 }).map((_, i) => ({
  id: i + 1,
  name: i === 0 ? "Purple Rain Lead" : `Slot ${i + 1}`,
  slot: i + 1,
  category: ['Clean', 'Crunch', 'High Gain', 'Lead', 'Ambient'][i % 5],
  favorite: i % 10 === 0,
  amp: "NUX MG-30 Model",
  lastUsed: new Date()
}));

export default function LibraryPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const { sendProgramChange, status } = useMidiStore();
  const { setActivePreset } = usePresetStore();
  const { toast } = useToast();

  const handleLoadPreset = (preset: any) => {
    if (status !== 'connected') {
      toast({
        title: "Dispositivo non connesso",
        description: "Collega l'MG-30 via USB per cambiare preset.",
        variant: "destructive"
      });
      return;
    }

    // Invia Program Change (0-55 per slot 1-56)
    sendProgramChange(preset.slot - 1);
    
    // Aggiorna lo stato locale dell'editor
    setActivePreset({
      ...preset,
      effects: [
        { id: 'amp', type: 'amp', enabled: true, parameters: { gain: 50, volume: 50, bass: 50, mid: 50, treble: 50 } },
        { id: 'delay', type: 'delay', enabled: false, parameters: { time: 400, feedback: 30, mix: 20 } },
        { id: 'reverb', type: 'reverb', enabled: true, parameters: { decay: 2.5, mix: 15 } }
      ]
    });

    toast({
      title: "Preset caricato",
      description: `Caricato ${preset.name} nello slot ${preset.slot}`
    });
  };

  const handleSync = () => {
    toast({
      title: "Sincronizzazione...",
      description: "Richiesta dati preset dall'MG-30 avviata via SysEx."
    });
    // Qui andrebbe inviato il SysEx per richiedere il dump dei nomi preset
    // sendSysEx([0x01, 0x00, 0x01]); // Esempio comando dump nomi
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Libreria Preset</h2>
            <p className="text-muted-foreground">Gestisci i tuoi suoni e gli slot dell'MG-30.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSync} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Sincronizza Device
            </Button>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuovo Preset</Button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cerca per nome, amp o tag..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <div className="flex rounded-md border border-border p-1">
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

        {view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_PRESETS.map((preset) => (
              <Card 
                key={preset.id} 
                className={`group overflow-hidden hover:border-primary/50 transition-all bg-card/50 cursor-pointer`}
                onClick={() => handleLoadPreset(preset)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">SLOT {preset.slot.toString().padStart(2, '0')}</Badge>
                    <div className="flex items-center gap-1">
                      {preset.favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleLoadPreset(preset)}>Carica su MG-30</DropdownMenuItem>
                          <DropdownMenuItem>Modifica Nome</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Elimina</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                   <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Modello Amp</div>
                      <div className="text-sm font-medium">{preset.amp}</div>
                   </div>
                   <div className="flex gap-1 mt-3">
                      <Badge variant="secondary" className="text-[9px] h-4">{preset.category}</Badge>
                      <Badge variant="outline" className="text-[9px] h-4">FX</Badge>
                   </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/50 bg-secondary/10 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">MIDI PC: {preset.slot - 1}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 font-bold uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">Modifica Suono</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 border-b border-border">
                  <tr className="text-left">
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest w-20">Slot</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Nome</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Categoria</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_PRESETS.map((preset) => (
                    <tr key={preset.id} className="hover:bg-primary/5 transition-colors group cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                      <td className="p-4 font-mono font-bold text-primary">{preset.slot.toString().padStart(2, '0')}</td>
                      <td className="p-4 font-semibold">{preset.name}</td>
                      <td className="p-4"><Badge variant="secondary">{preset.category}</Badge></td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleLoadPreset(preset)}>Carica</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
