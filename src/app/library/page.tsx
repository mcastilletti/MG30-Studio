
"use client"

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, LayoutGrid, List, Star, MoreVertical, RefreshCw, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';
import { Preset } from '@/types/preset';

export default function LibraryPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const { sendProgramChange, status, devicePresets, syncPresets, isSyncing, syncProgress } = useMidiStore();
  const { setActivePreset } = usePresetStore();
  const { toast } = useToast();

  const filteredPresets = devicePresets.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleLoadPreset = (preset: Preset) => {
    if (status !== 'connected') {
      toast({
        title: "Dispositivo non connesso",
        description: "Collega l'MG-30 via USB per cambiare preset.",
        variant: "destructive"
      });
      return;
    }

    sendProgramChange(preset.slot - 1);
    
    setActivePreset({
      ...preset,
      effects: preset.effects.length > 0 ? preset.effects : [
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
            <p className="text-muted-foreground">Sincronizza e gestisci gli slot della tua pedaliera MG-30.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSync} 
              variant={isSyncing ? "secondary" : "outline"} 
              className="gap-2 min-w-[180px]"
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
              placeholder="Cerca tra i preset sincronizzati..." 
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
            <RefreshCw className="w-12 h-12 mb-4 text-muted-foreground animate-pulse-fast" />
            <h3 className="text-xl font-bold">Nessun Preset Sincronizzato</h3>
            <p className="max-w-xs mx-auto mt-2 text-sm">
              Collega l'MG-30 e clicca su "Sincronizza Hardware" per scaricare i nomi dei preset dalla pedaliera.
            </p>
          </Card>
        ) : (
          view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPresets.map((preset) => (
                <Card 
                  key={preset.id} 
                  className={`group overflow-hidden hover:border-primary/50 transition-all bg-card/40 backdrop-blur-sm cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-border/50`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary bg-primary/5">
                        SLOT {preset.slot.toString().padStart(2, '0')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {preset.favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleLoadPreset(preset)}>Carica su MG-30</DropdownMenuItem>
                            <DropdownMenuItem>Salva Backup Locale</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Reset Slot</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors truncate">{preset.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                     <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Hardware Model</div>
                        <div className="text-sm font-medium opacity-80">{preset.ampModel === 'Unknown' ? 'NUX Modeling' : preset.ampModel}</div>
                     </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/30 bg-secondary/5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">MIDI PC: {preset.slot - 1}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 font-bold uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">Modifica</Button>
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
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Nome Preset Hardware</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Tipo</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredPresets.map((preset) => (
                      <tr 
                        key={preset.id} 
                        className="hover:bg-primary/5 transition-colors group cursor-pointer" 
                        onClick={() => handleLoadPreset(preset)}
                      >
                        <td className="p-4 font-mono font-bold text-primary text-center">
                          {preset.slot.toString().padStart(2, '0')}
                        </td>
                        <td className="p-4 font-semibold group-hover:text-primary transition-colors">
                          {preset.name}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="bg-secondary/50 text-[10px] uppercase">{preset.category}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase tracking-widest" onClick={() => handleLoadPreset(preset)}>Load</Button>
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
