"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, LayoutGrid, List, MoreVertical, RefreshCw, Loader2, Edit2, Check, Sparkles, Wand2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMidiStore } from '@/stores/use-midi-store';
import { usePresetStore } from '@/stores/use-preset-store';
import { useToast } from '@/hooks/use-toast';
import { Preset } from '@/types/preset';
import { generateMG30Preset } from '@/ai/flows/mg30-preset-gen';

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
  
  // AI States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { sendProgramChange, status, devicePresets, syncPresets, isSyncing, syncProgress, updatePresetName } = useMidiStore();
  const { setActivePreset } = usePresetStore();
  const { toast } = useToast();

  const filteredPresets = devicePresets.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    formatSlotLabel(p.slot).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAndEdit = (preset: Preset) => {
    if (status === 'connected') {
      sendProgramChange(preset.slot - 1);
    }
    setActivePreset(preset);
    router.push('/editor');
  };

  const handleGenerateAiPreset = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const result = await generateMG30Preset({ prompt: aiPrompt });
      
      const newPreset: Preset = {
        name: result.name,
        slot: 1, // Default to first for preview
        category: 'AI Generated',
        tags: ['AI'],
        favorite: false,
        rating: 5,
        lastModified: new Date(),
        ampModel: result.ampModel,
        effects: result.effects as any
      };

      setActivePreset(newPreset);
      setIsAiModalOpen(false);
      setAiPrompt('');
      toast({
        title: "Preset Generato!",
        description: `L'AI "Nux MG-30 preset" ha creato: ${result.name}`,
      });
      router.push('/editor');
    } catch (error) {
      toast({
        title: "Errore generazione",
        description: "Non è stato possibile generare il preset. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
      toast({ title: "Nome aggiornato" });
    }
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
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                  <Sparkles className="w-4 h-4" /> AI Magic Gen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-primary" /> 
                    Nux MG-30 Preset Generator
                  </DialogTitle>
                  <DialogDescription>
                    Descrivi il suono che desideri e l'agente AI configurerà per te amplificatori ed effetti.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Textarea 
                    placeholder="Esempio: Un tono lead Marshall anni '70 con molto sustain e un riverbero a molla..." 
                    className="h-32 bg-secondary/20"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest bg-secondary/30 p-2 rounded border border-border">
                    <span className="font-bold text-primary">Suggerimento:</span> Prova a citare generi musicali, chitarristi famosi o canzoni specifiche.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>Annulla</Button>
                  <Button 
                    className="gap-2 bg-primary" 
                    onClick={handleGenerateAiPreset}
                    disabled={isGenerating || !aiPrompt.trim()}
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGenerating ? 'Generazione...' : 'Crea Preset'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={() => syncPresets()} 
              variant={isSyncing ? "secondary" : "outline"} 
              className="gap-2"
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Hardware
            </Button>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuovo</Button>
          </div>
        </header>

        {isSyncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Syncing with hardware...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cerca tra i preset..." 
              className="pl-10 bg-background/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
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
          <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center opacity-60">
            <h3 className="text-xl font-bold">Nessun Preset trovato</h3>
          </Card>
        ) : (
          view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPresets.map((preset) => (
                <Card 
                  key={preset.slot} 
                  className="group overflow-hidden hover:border-primary/50 transition-all cursor-pointer bg-card/40"
                  onClick={() => handleSelectAndEdit(preset)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                        SLOT {formatSlotLabel(preset.slot)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectAndEdit(preset); }}>Modifica</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => startEditingName(e as any, preset)}>Rinomina</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {editingSlot === preset.slot ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="icon" className="h-8 w-8" onClick={saveName}><Check className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <CardTitle className="text-lg mt-2 truncate">
                        {preset.name}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="pb-4">
                     <div className="flex flex-col gap-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Amplificatore</div>
                        <div className="text-sm font-medium">{preset.ampModel}</div>
                     </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">PC: {preset.slot - 1}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] font-bold uppercase tracking-widest hover:bg-primary"
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
                      <th className="p-4 font-bold uppercase text-[11px] w-20 text-center">Slot</th>
                      <th className="p-4 font-bold uppercase text-[11px]">Nome</th>
                      <th className="p-4 font-bold uppercase text-[11px]">Amp</th>
                      <th className="p-4 font-bold uppercase text-[11px] text-right">Azioni</th>
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
                        <td className="p-4 font-semibold">
                          {preset.name}
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-[10px]">{preset.ampModel}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase">Modifica</Button>
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
