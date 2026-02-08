"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Undo2, Redo2, Save, Power, LayoutGrid, ChevronLeft, ChevronRight, Settings2, Sparkles, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MG30_MODELS } from '@/lib/mg30-data';
import { generateMG30Preset, MG30PresetOutput } from '@/ai/flows/mg30-preset-gen';
import { useToast } from '@/hooks/use-toast';

const getBlockColorVar = (type: string) => {
  switch(type) {
    case 'wah': return 'var(--block-wah)';
    case 'noise-gate': return 'var(--block-gate)';
    case 'compressor': return 'var(--block-cmp)';
    case 'efx': return 'var(--block-efx)';
    case 'amp': return 'var(--block-amp)';
    case 'ir': return 'var(--block-ir)';
    case 'sr': return 'var(--block-sr)';
    case 'modulation': return 'var(--block-mod)';
    case 'delay': return 'var(--block-dly)';
    case 'reverb': return 'var(--block-rvb)';
    case 'vol': return 'var(--block-vol)';
    case 'eq': return 'var(--block-eq)';
    default: return 'var(--primary)';
  }
};

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

export default function EditorPage() {
  const { activePreset, updateParameter, updateModel, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendProgramChange, sendKnobParameter, toggleBlock, selectBlock, syncBlockParameters, isEditorSyncing, syncActivePreset } = useMidiStore();
  const { toast } = useToast();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposedPreset, setProposedPreset] = useState<MG30PresetOutput | null>(null);

  const selectedEffect = useMemo(() => 
    activePreset.effects.find(e => e.id === selectedBlockId),
    [activePreset.effects, selectedBlockId]
  );

  const currentModelData = useMemo(() => {
    if (!selectedEffect) return null;
    return MG30_MODELS[selectedEffect.type as any]?.find(m => m.id === selectedEffect.model) || MG30_MODELS[selectedEffect.type as any]?.[0];
  }, [selectedEffect]);

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const handleParamChange = (effectType: string, paramId: string, value: number, index: number) => {
    updateParameter(selectedBlockId, paramId, value);
    if (status === 'connected') {
      sendKnobParameter(selectedBlockId, index, value);
    }
  };

  const handleToggleBlock = (e: React.MouseEvent, effectId: string, type: string, enabled: boolean) => {
    e.stopPropagation();
    toggleEffect(effectId);
    if (status === 'connected') {
      toggleBlock(type, !enabled);
    }
  };

  const handleSelectBlock = (effectId: string, type: string) => {
    setSelectedBlockId(effectId);
    if (status === 'connected') {
      selectBlock(type);
      const effect = activePreset.effects.find(e => e.id === effectId);
      if (effect) syncBlockParameters(type, effect.parameters);
    }
  };

  const handleSlotChange = (direction: 'next' | 'prev') => {
    let nextSlot = activePreset.slot + (direction === 'next' ? 1 : -1);
    if (nextSlot < 1) nextSlot = 128;
    if (nextSlot > 128) nextSlot = 1;
    sendProgramChange(nextSlot - 1);
    setActivePreset({ ...activePreset, slot: nextSlot });
  };

  const handleAiModeGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setProposedPreset(null);
    try {
      const result = await generateMG30Preset({ description: aiPrompt });
      setProposedPreset(result);
    } catch (error: any) {
      toast({ title: "Errore AI", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyProposedPreset = () => {
    if (!proposedPreset) return;
    
    // Mappatura della proposta sui blocchi esistenti dello store
    const updatedEffects = activePreset.effects.map(effect => {
      const propEffect = proposedPreset.effects.find(pe => pe.type === effect.type);
      if (propEffect) {
        return {
          ...effect,
          model: propEffect.model,
          enabled: propEffect.enabled,
          parameters: { ...effect.parameters, ...propEffect.parameters }
        };
      }
      return effect;
    });

    const newPreset = {
      ...activePreset,
      name: proposedPreset.name,
      effects: updatedEffects,
      lastModified: new Date()
    };

    setActivePreset(newPreset);
    
    // Sincronizzazione hardware se connesso
    if (status === 'connected') {
      updatedEffects.forEach(e => {
        toggleBlock(e.type, e.enabled);
        syncBlockParameters(e.type, e.parameters);
      });
    }

    toast({ title: "AI Mode Applicato", description: `Preset "${proposedPreset.name}" caricato con successo.` });
    setProposedPreset(null);
    setIsAiModalOpen(false);
    setAiPrompt('');
  };

  const availableModels = selectedEffect ? MG30_MODELS[selectedEffect.type as any] || [] : [];
  const currentBlockColor = selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'hsl(var(--primary))';

  return (
    <AppShell>
      <div className="space-y-6 relative">
        {isEditorSyncing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
            <Card className="p-8 flex flex-col items-center gap-4 shadow-2xl border-primary/40 bg-card">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-bold">Hardware Sync...</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Lettura Chain in corso</p>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('prev')} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
              <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-xl text-primary border border-primary/20">{formatSlotLabel(activePreset.slot)}</div>
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('next')} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div>
              <h3 className="text-xl font-bold">{activePreset.name}</h3>
              <Badge variant="outline" className="text-[10px] mt-1">MIDI {status.toUpperCase()}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/50 text-primary">
                  <Sparkles className="w-4 h-4" /> AI Mode
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                {!proposedPreset ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Assistant</DialogTitle>
                      <DialogDescription>Descrivi il tipo di suono che desideri ottenere e l'AI configurerà la catena per te.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Textarea 
                        placeholder="Esempio: Un suono lead cremoso alla Pink Floyd con molto sustain e delay..." 
                        value={aiPrompt} 
                        onChange={(e) => setAiPrompt(e.target.value)} 
                        className="min-h-[120px] bg-secondary/20"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAiModeGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Genera Configurazione
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Proposta AI: {proposedPreset.name}</DialogTitle>
                      <DialogDescription>L'AI ha elaborato questa configurazione. Puoi approvarla per applicare i parametri al preset attuale.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs leading-relaxed italic">
                        "{proposedPreset.explanation}"
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Cambiamenti proposti</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {proposedPreset.effects.filter(e => e.enabled).map(e => (
                             <div key={e.type} className="flex items-center gap-2 p-2 rounded border bg-card/50 text-[10px]">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${getBlockColorVar(e.type)})` }} />
                               <span className="font-bold uppercase">{e.type}:</span>
                               <span className="truncate opacity-70">{e.model}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="ghost" onClick={() => setProposedPreset(null)} className="gap-2"><XCircle className="w-4 h-4" /> Scarta</Button>
                      <Button onClick={applyProposedPreset} className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-1"><Save className="w-4 h-4" /> Approva e Salva</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" size="icon" onClick={() => syncActivePreset()}><RefreshCw className={cn("w-4 h-4", isEditorSyncing && "animate-spin")} /></Button>
            <Button variant="outline" size="icon" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <Button className="gap-2" onClick={() => toast({ title: "Salvataggio locale eseguito" })}><Save className="w-4 h-4" /> Save</Button>
          </div>
        </div>

        <Card className="border-border bg-background/50 overflow-hidden shadow-lg">
          <CardHeader className="py-3 border-b border-border bg-secondary/20">
             <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Signal Chain</CardTitle>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-6xl mx-auto overflow-x-auto gap-4 pb-2 px-4">
              {activePreset.effects.map((effect, idx) => {
                const isSelected = selectedBlockId === effect.id;
                return (
                  <React.Fragment key={effect.id}>
                    <div 
                      onClick={() => handleSelectBlock(effect.id, effect.type)}
                      className={cn(
                        "relative cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-shrink-0",
                        "bg-secondary/40",
                        isSelected ? "border-primary/50 shadow-md" : "border-border/40",
                        !effect.enabled && "opacity-60"
                      )}
                      style={{ borderColor: isSelected ? `hsl(${getBlockColorVar(effect.type)})` : '' }}
                    >
                      <div className="w-10 h-10 rounded-md flex items-center justify-center mb-1 bg-background/60 border border-border/50">
                        <Power className="w-5 h-5" style={{ color: effect.enabled ? `hsl(${getBlockColorVar(effect.type)})` : 'gray' }} onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)} />
                      </div>
                      <span className="text-[9px] font-bold uppercase truncate" style={{ color: effect.enabled ? `hsl(${getBlockColorVar(effect.type)})` : 'gray' }}>
                        {effect.type === 'noise-gate' ? 'GATE' : effect.type === 'compressor' ? 'COMP' : effect.type === 'sr' ? 'S/R' : effect.type === 'vol' ? 'VOL' : effect.type}
                      </span>
                    </div>
                    {idx < activePreset.effects.length - 1 && <div className="flex-1 min-w-[20px] h-[2px] bg-border/40" />}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl" style={{ borderColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` : '' }}>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 gap-4">
              <div className="flex items-center gap-4">
                <Settings2 className="w-5 h-5" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : '' }} />
                <CardTitle className="text-lg uppercase" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : '' }}>
                  {selectedEffect?.type} <Badge variant="outline" className="text-[10px] ml-2">{selectedEffect?.model}</Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <Select value={selectedEffect?.model} onValueChange={(val) => updateModel(selectedEffect!.id, val)}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Model" /></SelectTrigger>
                  <SelectContent>{availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <Switch checked={selectedEffect?.enabled} onCheckedChange={() => toggleEffect(selectedEffect!.id)} />
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {selectedEffect && currentModelData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-8 justify-items-center">
                  {currentModelData.parameters.map((param, index) => (
                    <RotaryKnob key={param.id} label={param.name} value={Number(selectedEffect.parameters[param.id] ?? param.default)} min={param.min} max={param.max} step={param.step} onChange={(v) => handleParamChange(selectedEffect.type, param.id, v, index)} color={currentBlockColor} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </AppShell>
  );
}
