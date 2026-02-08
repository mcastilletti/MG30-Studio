
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
import { Undo2, Redo2, Save, Share2, Power, LayoutGrid, ChevronLeft, ChevronRight, Settings2, Sparkles, Wand2, Loader2, CheckCircle2, RotateCcw, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MG30_MODELS } from '@/lib/mg30-data';
import { generateMG30Preset, MG30PresetOutput } from '@/ai/flows/mg30-preset-gen';
import { useToast } from '@/hooks/use-toast';
import { EffectState } from '@/types/preset';

const formatSlotLabel = (slot: number) => {
  const group = Math.floor((slot - 1) / 4) + 1;
  const letter = ['A', 'B', 'C', 'D'][(slot - 1) % 4];
  return `${String(group).padStart(2, '0')}${letter}`;
};

const getBlockColorVar = (type: string) => {
  switch(type) {
    case 'wah': return 'var(--block-wah)';
    case 'noise-gate': return 'var(--block-gate)';
    case 'compressor': return 'var(--block-cmp)';
    case 'efx': return 'var(--block-efx)';
    case 'amp': return 'var(--block-amp)';
    case 'ir': return 'var(--block-ir)';
    case 'eq': return 'var(--block-eq)';
    case 'modulation': return 'var(--block-mod)';
    case 'delay': return 'var(--block-dly)';
    case 'reverb': return 'var(--block-rvb)';
    default: return 'var(--primary)';
  }
};

export default function EditorPage() {
  const { activePreset, updateParameter, updateModel, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendProgramChange, sendKnobParameter, toggleBlock, selectBlock, syncBlockParameters, isEditorSyncing, syncActivePreset } = useMidiStore();
  const { toast } = useToast();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');
  
  // AI Mode States
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

  // Al montaggio, se siamo connessi, forziamo la lettura dei parametri dall'hardware
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
      // 1. Sposta lo schermo della pedaliera sul blocco selezionato
      selectBlock(type);
      
      // 2. Sincronizza i parametri correnti dell'editor con l'hardware
      const effect = activePreset.effects.find(e => e.id === effectId);
      if (effect) {
        syncBlockParameters(type, effect.parameters);
      }
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
      console.error(error);
      toast({
        title: "Errore AI Mode",
        description: error.message || "Non è stato possibile generare il suono. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiModeConfirm = () => {
    if (!proposedPreset) return;

    const typeToId: Record<string, string> = {
      'wah': 'wah',
      'noise-gate': 'ng',
      'compressor': 'cmp',
      'efx': 'efx',
      'amp': 'amp',
      'ir': 'ir',
      'eq': 'eq',
      'modulation': 'mod',
      'delay': 'delay',
      'reverb': 'reverb'
    };

    const newEffects: EffectState[] = proposedPreset.effects.map((eff) => ({
      id: typeToId[eff.type] || eff.type,
      type: eff.type as any,
      model: eff.model,
      enabled: eff.enabled,
      parameters: eff.parameters
    }));

    setActivePreset({
      ...activePreset,
      name: proposedPreset.name,
      ampModel: proposedPreset.ampModel,
      effects: newEffects,
      lastModified: new Date()
    });

    setIsAiModalOpen(false);
    setAiPrompt('');
    setProposedPreset(null);

    toast({
      title: "Preset Applicato",
      description: `Il suono "${proposedPreset.name}" è ora attivo nello slot ${formatSlotLabel(activePreset.slot)}.`,
    });
  };

  const availableModels = selectedEffect ? MG30_MODELS[selectedEffect.type as any] || [] : [];
  const currentBlockColor = selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'hsl(var(--primary))';

  return (
    <AppShell>
      <div className="space-y-6 relative">
        {/* Overlay di sincronizzazione Hardware */}
        {isEditorSyncing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl border border-primary/20">
            <Card className="p-8 flex flex-col items-center gap-4 shadow-2xl border-primary/40 bg-card">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-bold">Lettura Hardware in corso...</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Sincronizzazione Chain dello Slot {formatSlotLabel(activePreset.slot)}</p>
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('prev')} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-xl text-primary border border-primary/20">
                {formatSlotLabel(activePreset.slot)}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('next')} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-bold">{activePreset.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase">Slot {formatSlotLabel(activePreset.slot)}</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">MIDI {status.toUpperCase()}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAiModalOpen} onOpenChange={(open) => {
              setIsAiModalOpen(open);
              if (!open) {
                setProposedPreset(null);
                setAiPrompt('');
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                  <Sparkles className="w-4 h-4" /> AI Mode
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-primary" /> 
                    AI Tone Assistant
                  </DialogTitle>
                  <DialogDescription>
                    Descrivi il suono che desideri. L'AI proporrà una configurazione per lo slot <strong>{formatSlotLabel(activePreset.slot)}</strong>.
                  </DialogDescription>
                </DialogHeader>

                {!proposedPreset ? (
                  <div className="py-4 space-y-4">
                    <Textarea 
                      placeholder="Esempio: Un lead distorto molto compresso con delay stereo per assoli epici..." 
                      className="h-32 bg-secondary/20"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                ) : (
                  <div className="py-4 space-y-4">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Proposta AI</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Nome Suggerito</p>
                          <p className="font-bold text-lg">{proposedPreset.name}</p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Modello AMP</p>
                            <p className="font-medium">{proposedPreset.ampModel}</p>
                          </div>
                          <Badge variant="outline" className="bg-background">
                            {proposedPreset.effects.filter(e => e.enabled).length} Moduli Attivi
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proposedPreset.effects.map(eff => (
                            <Badge 
                              key={eff.type} 
                              variant={eff.enabled ? "default" : "outline"}
                              className={cn("text-[8px] h-4", !eff.enabled && "opacity-40")}
                              style={eff.enabled ? { backgroundColor: `hsl(${getBlockColorVar(eff.type)})` } : {}}
                            >
                              {eff.type.split('-').map(w => w[0]).join('').toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <p className="text-[11px] text-muted-foreground italic text-center">
                      Puoi applicare questa configurazione o generare un'altra versione.
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  {!proposedPreset ? (
                    <>
                      <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>Annulla</Button>
                      <Button 
                        className="gap-2 bg-primary" 
                        onClick={handleAiModeGenerate}
                        disabled={isGenerating || !aiPrompt.trim()}
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isGenerating ? 'Elaborazione...' : 'Genera Proposta'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="gap-2" onClick={() => setProposedPreset(null)}>
                        <RotateCcw className="w-4 h-4" /> Riprova
                      </Button>
                      <Button 
                        className="gap-2 bg-primary" 
                        onClick={handleAiModeConfirm}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Applica al Preset
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" size="icon" onClick={() => syncActivePreset()} title="Refresh from Hardware"><RefreshCw className={cn("w-4 h-4", isEditorSyncing && "animate-spin")} /></Button>
            <Button variant="outline" size="icon" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" className="gap-2"><Share2 className="w-4 h-4" /> Export</Button>
            <Button className="gap-2" onClick={() => toast({ title: "Salvataggio", description: "Configurazione salvata nel database locale." })}><Save className="w-4 h-4" /> Save</Button>
          </div>
        </div>

        <Card className="border-border bg-background/50 overflow-hidden shadow-lg">
          <CardHeader className="py-3 border-b border-border bg-secondary/20">
             <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <LayoutGrid className="w-3 h-3" /> Signal Chain
                </CardTitle>
                <span className="text-[10px] text-muted-foreground italic">Click: Select & Sync • Double Click: Hard Sync</span>
             </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-6xl mx-auto overflow-x-auto gap-4 pb-2 px-4">
              {activePreset.effects.map((effect, idx) => {
                const blockColor = getBlockColorVar(effect.type);
                const isSelected = selectedBlockId === effect.id;
                return (
                  <React.Fragment key={effect.id}>
                    <div 
                      onClick={() => handleSelectBlock(effect.id, effect.type)}
                      className={cn(
                        "relative group cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-shrink-0 select-none",
                        "bg-secondary/40",
                        isSelected ? "border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "border-border/40",
                        !effect.enabled && "opacity-60"
                      )}
                      style={{ 
                        borderColor: isSelected ? `hsl(${blockColor})` : 'inherit',
                      }}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-md flex items-center justify-center mb-1 transition-all bg-background/60 border border-border/50",
                        isSelected && "ring-1 ring-offset-1 ring-offset-background"
                      )}
                      style={{ 
                        ringColor: `hsl(${blockColor})`
                      } as any}
                      >
                        <Power 
                          className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" 
                          style={{ color: effect.enabled ? `hsl(${blockColor})` : 'var(--muted-foreground)' }}
                          onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)}
                        />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-tighter text-center h-4 line-clamp-1 transition-colors"
                        style={{ color: effect.enabled ? `hsl(${blockColor})` : 'var(--muted-foreground)' }}
                      >
                        {effect.type.replace('-', ' ')}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 p-1 rounded-full shadow-lg"
                          style={{ backgroundColor: `hsl(${blockColor})`, color: '#fff' }}
                        >
                          <Settings2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    {idx < activePreset.effects.length - 1 && (
                      <div className="flex-1 min-w-[20px] h-[2px] bg-border/40" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-xl" 
            style={{ 
              borderColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` : 'inherit',
              backgroundColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.02)` : 'inherit'
            }}
          >
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.1)` : 'inherit', color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'inherit' }}>
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg uppercase flex items-center gap-2" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'inherit' }}>
                    {selectedEffect?.type.replace('-', ' ')}
                    <Badge variant="outline" className="text-[10px] ml-2" style={{ borderColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.5)` : 'inherit' }}>
                      {selectedEffect?.model.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <CardTitle className="text-xs text-muted-foreground font-normal">
                    Model: <span className="text-foreground font-semibold">{currentModelData?.fullName}</span>
                  </CardTitle>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none min-w-[200px]">
                  <Select 
                    value={selectedEffect?.model} 
                    onValueChange={(val) => updateModel(selectedEffect!.id, val)}
                  >
                    <SelectTrigger className="w-full bg-background/50" style={{ borderColor: selectedEffect ? `hsla(${getBlockColorVar(selectedEffect.type)}, 0.3)` : 'inherit' }}>
                      <Sparkles className="w-3 h-3 mr-2" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'inherit' }} />
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="h-8 w-[1px] bg-border hidden sm:block" />
                
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold uppercase text-muted-foreground">Active</span>
                   <Switch 
                    checked={selectedEffect?.enabled} 
                    onCheckedChange={(v) => toggleEffect(selectedEffect!.id)} 
                   />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {selectedEffect && currentModelData && (
                <div className="space-y-12">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-8 justify-items-center">
                    {currentModelData.parameters.map((param, index) => (
                      <RotaryKnob 
                        key={param.id}
                        label={param.name} 
                        value={Number(selectedEffect.parameters[param.id] ?? param.default)} 
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        unit={param.unit}
                        onChange={(v) => handleParamChange(selectedEffect.type, param.id, v, index)} 
                        size={72} 
                        color={currentBlockColor}
                        className={index < 4 ? "pb-2" : ""}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-8 p-4 rounded-lg bg-secondary/20 border border-border text-[10px] text-muted-foreground uppercase tracking-widest text-center flex flex-col gap-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3" style={{ color: selectedEffect ? `hsl(${getBlockColorVar(selectedEffect.type)})` : 'inherit' }} />
                  <span className="font-bold">Hardware Real-Time Link</span>
                </div>
                <span>Le manopole corrispondono ai controlli hardware per {selectedEffect?.type}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
