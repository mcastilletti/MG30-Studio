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
import { Undo2, Redo2, Save, Power, LayoutGrid, ChevronLeft, ChevronRight, Settings2, Sparkles, Loader2, RefreshCw, CheckCircle2, XCircle, Layout, X } from 'lucide-react';
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
  const { status, sendProgramChange, sendKnobParameter, toggleBlock, selectBlock, enterBlockEditor, exitBlockEditor, resetToPresetView, isEditorSyncing, syncActivePreset, syncBlockParameters } = useMidiStore();
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

  const handleBlockClick = (effectId: string, type: string, currentEnabled: boolean) => {
    toggleEffect(effectId);
    setSelectedBlockId(effectId);
    
    if (status === 'connected') {
      toggleBlock(type, !currentEnabled);
      selectBlock(type);
      // Forzo l'aggiornamento se siamo già in visualizzazione parametri
      if (selectedBlockId) {
        enterBlockEditor(type);
      }
    }
  };

  const handleAreaParamClick = () => {
    if (selectedEffect && status === 'connected') {
      enterBlockEditor(selectedEffect.type);
    }
  };

  const handlePresetAreaClick = () => {
    resetToPresetView();
  };

  const handleExitEditor = () => {
    setSelectedBlockId('');
    if (status === 'connected') {
      exitBlockEditor();
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
    
    const updatedEffects = activePreset.effects.map(effect => {
      const propEffect = proposedPreset.effects.find(pe => pe.type === effect.type);
      
      if (propEffect) {
        const paramRecord: Record<string, number> = {};
        if (propEffect.parameters) {
          propEffect.parameters.forEach(p => {
            paramRecord[p.name.toLowerCase()] = p.value;
          });
        }

        return {
          ...effect,
          model: propEffect.model || effect.model,
          enabled: propEffect.enabled ?? effect.enabled,
          parameters: { ...effect.parameters, ...paramRecord }
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
    
    if (status === 'connected') {
      updatedEffects.forEach(e => {
        toggleBlock(e.type, e.enabled);
        syncBlockParameters(e.type, e.parameters);
      });
    }

    toast({ title: "AI Mode Applicato", description: `Il preset '${proposedPreset.name}' è ora attivo.` });
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
          <div 
            className="flex items-center gap-4 cursor-pointer hover:bg-secondary/20 p-2 rounded-lg transition-colors group"
            onClick={handlePresetAreaClick}
          >
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleSlotChange('prev'); }} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-xl text-primary border border-primary/20 group-hover:border-primary/50">{formatSlotLabel(activePreset.slot)}</div>
              <button onClick={(e) => { e.stopPropagation(); handleSlotChange('next'); }} className="p-2 hover:bg-secondary rounded-full transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{activePreset.name}</h3>
                <Layout className="w-4 h-4 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
              </div>
              <Badge variant="outline" className="text-[10px] mt-1">TORNA ALLA VISTA COMPLESSIVA</Badge>
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
                      <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Mode: Tone Designer</DialogTitle>
                      <DialogDescription>Descrivi il suono o incolla un JSON tecnico. L'AI configurerà ogni singolo parametro.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Textarea 
                        placeholder="Incolla qui le tue specifiche tecniche o scrivi: Crea un suono lead tipo Pink Floyd..." 
                        value={aiPrompt} 
                        onChange={(e) => setAiPrompt(e.target.value)} 
                        className="min-h-[150px] bg-secondary/20"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAiModeGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Genera Preset
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Preset Generato: {proposedPreset.name}</DialogTitle>
                      <DialogDescription>L'AI ha mappato tutti i blocchi. Ecco l'analisi:</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border text-xs leading-relaxed italic">
                        "{proposedPreset.explanation}"
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                         <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Anteprima Blocchi</h4>
                         <div className="grid grid-cols-1 gap-2">
                           {proposedPreset.effects.map(e => (
                             <div key={e.type} className="flex flex-col gap-1 p-2 rounded border bg-card/50 text-[10px]">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <div className={cn("w-2 h-2 rounded-full", !e.enabled && "opacity-30")} style={{ backgroundColor: `hsl(${getBlockColorVar(e.type)})` }} />
                                   <span className="font-bold uppercase">{e.type}:</span>
                                   <span className="truncate opacity-70">{e.model}</span>
                                 </div>
                                 <Badge variant={e.enabled ? "default" : "outline"} className="text-[8px] h-4">{e.enabled ? "ON" : "OFF"}</Badge>
                               </div>
                               <div className="grid grid-cols-3 gap-x-2 gap-y-1 mt-1 opacity-60">
                                 {e.parameters?.slice(0, 6).map(p => (
                                   <div key={p.name} className="flex justify-between border-b border-border/20">
                                      <span>{p.name}</span>
                                      <span className="font-bold text-primary">{p.value}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="ghost" onClick={() => setProposedPreset(null)} className="gap-2"><XCircle className="w-4 h-4" /> Scarta</Button>
                      <Button onClick={applyProposedPreset} className="gap-2 bg-green-600 hover:bg-green-700 text-white flex-1"><Save className="w-4 h-4" /> Applica Settaggi</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" size="icon" onClick={() => syncActivePreset()} title="Sincronizza Hardware"><RefreshCw className={cn("w-4 h-4", isEditorSyncing && "animate-spin")} /></Button>
            <Button variant="outline" size="icon" onClick={undo} title="Annulla"><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo} title="Ripristina"><Redo2 className="w-4 h-4" /></Button>
            <Button className="gap-2" onClick={() => toast({ title: "Preset salvato in locale" })}><Save className="w-4 h-4" /> Save</Button>
          </div>
        </div>

        <Card className="border-border bg-background/50 overflow-hidden shadow-lg">
          <CardHeader className="py-3 border-b border-border bg-secondary/20 flex flex-row items-center justify-between">
             <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> Signal Chain</CardTitle>
             <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-bold gap-2 text-destructive" onClick={handleExitEditor}><X className="w-3 h-3" /> Chiudi Parametri</Button>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-6xl mx-auto overflow-x-auto gap-4 pb-2 px-4">
              {activePreset.effects.map((effect, idx) => {
                const isSelected = selectedBlockId === effect.id;
                return (
                  <React.Fragment key={effect.id}>
                    <div 
                      onClick={() => handleBlockClick(effect.id, effect.type, effect.enabled)}
                      className={cn(
                        "relative cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-shrink-0 select-none touch-none",
                        "bg-secondary/40",
                        isSelected ? "border-primary shadow-md scale-105" : "border-border/40",
                        !effect.enabled && "opacity-60"
                      )}
                      style={{ borderColor: isSelected ? `hsl(${getBlockColorVar(effect.type)})` : '' }}
                    >
                      <div className="w-10 h-10 rounded-md flex items-center justify-center mb-1 bg-background/60 border border-border/50">
                        <Power className="w-5 h-5" style={{ color: effect.enabled ? `hsl(${getBlockColorVar(effect.type)})` : 'gray' }} />
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

        {selectedEffect && (
          <Card 
            className="shadow-xl cursor-pointer hover:border-primary/30 transition-colors" 
            style={{ borderColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` : '' }}
            onClick={handleAreaParamClick}
          >
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 gap-4">
                <div className="flex items-center gap-4">
                  <Settings2 className="w-5 h-5" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : '' }} />
                  <CardTitle className="text-lg uppercase" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : '' }}>
                    {selectedEffect?.type} <Badge variant="outline" className="text-[10px] ml-2">{selectedEffect?.model}</Badge>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <Select value={selectedEffect?.model} onValueChange={(val) => updateModel(selectedEffect!.id, val)}>
                    <SelectTrigger className="w-[200px]" onClick={(e) => e.stopPropagation()}><SelectValue placeholder="Model" /></SelectTrigger>
                    <SelectContent>{availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch checked={selectedEffect?.enabled} onCheckedChange={() => handleBlockClick(selectedEffect!.id, selectedEffect!.type, selectedEffect!.enabled)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                {currentModelData && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-8 justify-items-center">
                    {currentModelData.parameters.map((param, index) => (
                      <div key={param.id} onClick={(e) => e.stopPropagation()}>
                        <RotaryKnob label={param.name} value={Number(selectedEffect.parameters[param.id.toLowerCase()] ?? param.default)} min={param.min} max={param.max} step={param.step} onChange={(v) => handleParamChange(selectedEffect.type, param.id, v, index)} color={currentBlockColor} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        )}
      </div>
    </AppShell>
  );
}
