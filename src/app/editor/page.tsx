
"use client"

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Save, Share2, Power, LayoutGrid, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EditorPage() {
  const { activePreset, updateParameter, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendProgramChange, sendKnobParameter, toggleBlock, selectBlock } = useMidiStore();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string>('amp');

  const handleParamChange = (effectType: string, param: string, value: number, knobIndex: number) => {
    updateParameter(selectedBlockId, param, value);
    
    if (status === 'connected') {
      // Invia il valore tramite CC 14, 15, 16 o 17 in base alla posizione della manopola
      sendKnobParameter(knobIndex, value);
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
    }
  };

  const handleSlotChange = (direction: 'next' | 'prev') => {
    let nextSlot = activePreset.slot + (direction === 'next' ? 1 : -1);
    if (nextSlot < 1) nextSlot = 56;
    if (nextSlot > 56) nextSlot = 1;
    
    sendProgramChange(nextSlot - 1);
    setActivePreset({ ...activePreset, slot: nextSlot });
  };

  const selectedEffect = activePreset.effects.find(e => e.id === selectedBlockId);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Preset Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('prev')} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-xl text-primary border border-primary/20">
                {activePreset.slot.toString().padStart(2, '0')}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleSlotChange('next')} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-bold">{activePreset.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase">Slot {activePreset.slot}</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">MIDI {status.toUpperCase()}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" className="gap-2"><Share2 className="w-4 h-4" /> Export</Button>
            <Button className="gap-2"><Save className="w-4 h-4" /> Save</Button>
          </div>
        </div>

        {/* Signal Chain Visualizer */}
        <Card className="border-border bg-background/50 overflow-hidden">
          <CardHeader className="py-3 border-b border-border bg-secondary/20">
             <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <LayoutGrid className="w-3 h-3" /> Signal Chain
                </CardTitle>
                <span className="text-[10px] text-muted-foreground italic">Click to select (Enter Settings) • Toggle power to bypass</span>
             </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-6xl mx-auto overflow-x-auto gap-4 pb-2 px-4">
              {activePreset.effects.map((effect, idx) => (
                <React.Fragment key={effect.id}>
                  <div 
                    onClick={() => handleSelectBlock(effect.id, effect.type)}
                    className={cn(
                      "relative group cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-shrink-0",
                      effect.enabled 
                        ? (selectedBlockId === effect.id ? 'border-primary bg-primary/20 shadow-[0_0_15px_rgba(103,58,183,0.3)]' : 'border-primary/40 bg-primary/5')
                        : 'border-border bg-secondary/20 opacity-60',
                      selectedBlockId === effect.id && !effect.enabled && 'border-accent bg-accent/10'
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded flex items-center justify-center mb-1 transition-colors",
                      effect.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      selectedBlockId === effect.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}>
                      <Power 
                        className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" 
                        onClick={(e) => handleToggleBlock(e, effect.id, effect.type, effect.enabled)}
                      />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-center h-4 line-clamp-1">
                      {effect.type.replace('-', ' ')}
                    </span>
                    {selectedBlockId === effect.id && (
                      <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground p-1 rounded-full shadow-lg">
                        <Settings2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  {idx < activePreset.effects.length - 1 && (
                    <div className="flex-1 min-w-[20px] h-[2px] bg-gradient-to-r from-border via-primary/30 to-border" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor Main Content */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg uppercase">{selectedEffect?.type.replace('-', ' ')} SECTION</CardTitle>
                  <CardTitle className="text-xs text-muted-foreground font-normal">Editing parameters for {selectedEffect?.type}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold uppercase text-muted-foreground">Status</span>
                   <Switch 
                    checked={selectedEffect?.enabled} 
                    onCheckedChange={(v) => toggleEffect(selectedEffect!.id)} 
                   />
                </div>
                {selectedEffect?.type === 'amp' && <Badge className="bg-primary">{activePreset.ampModel}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {selectedEffect && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-12 gap-x-8 justify-items-center">
                  {Object.entries(selectedEffect.parameters).map(([key, value], index) => (
                    <RotaryKnob 
                      key={key}
                      label={key} 
                      value={typeof value === 'number' ? value : 50} 
                      onChange={(v) => handleParamChange(selectedEffect.type, key, v, index)} 
                      size={72} 
                      className={index < 4 ? "border-b-2 border-primary/20 pb-2" : ""}
                    />
                  ))}
                  {Object.keys(selectedEffect.parameters).length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground italic">
                      No parameters available for this block in the current version.
                    </div>
                  )}
                </div>
              )}
              <div className="mt-8 p-4 rounded-lg bg-secondary/20 border border-border text-[10px] text-muted-foreground uppercase tracking-widest text-center">
                I primi 4 parametri controllano le manopole fisiche (CC 14, 15, 16, 17)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
