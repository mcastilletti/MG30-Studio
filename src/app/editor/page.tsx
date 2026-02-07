
"use client"

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Save, Share2, Power, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

// IDs dei parametri basati sul protocollo NUX MG-30 per il blocco AMP
const AMP_PARAM_IDS = {
  gain: 0,
  bass: 1,
  mid: 2,
  treble: 3,
  presence: 4,
  volume: 5
};

export default function EditorPage() {
  const { activePreset, updateParameter, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendProgramChange, sendParameter, toggleBlock } = useMidiStore();

  const handleParamChange = (effectType: string, param: string, value: number) => {
    updateParameter(effectType, param, value);
    
    if (status === 'connected') {
      if (effectType === 'amp') {
        const paramId = AMP_PARAM_IDS[param as keyof typeof AMP_PARAM_IDS];
        if (paramId !== undefined) {
          sendParameter('amp', paramId, value);
        }
      } else {
        // Fallback per altri blocchi: implementare mappature parametri specifiche
        // Per ora usiamo paramId 0 come placeholder
        sendParameter(effectType, 0, value);
      }
    }
  };

  const handleToggleBlock = (effectId: string, type: string, enabled: boolean) => {
    toggleEffect(effectId);
    if (status === 'connected') {
      toggleBlock(type, !enabled);
    }
  };

  const handleSlotChange = (direction: 'next' | 'prev') => {
    let nextSlot = activePreset.slot + (direction === 'next' ? 1 : -1);
    if (nextSlot < 1) nextSlot = 56;
    if (nextSlot > 56) nextSlot = 1;
    
    sendProgramChange(nextSlot - 1);
    setActivePreset({ ...activePreset, slot: nextSlot });
  };

  const ampEffect = activePreset.effects.find(e => e.type === 'amp');
  const delayEffect = activePreset.effects.find(e => e.type === 'delay');
  const reverbEffect = activePreset.effects.find(e => e.type === 'reverb');

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
             </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-5xl mx-auto overflow-x-auto gap-4 pb-2">
              {activePreset.effects.map((effect, idx) => (
                <React.Fragment key={effect.id}>
                  <div 
                    onClick={() => handleToggleBlock(effect.id, effect.type, effect.enabled)}
                    className={`
                      relative group cursor-pointer w-24 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                      ${effect.enabled ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(103,58,183,0.2)]' : 'border-border bg-secondary/20 opacity-60'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded flex items-center justify-center mb-1
                      ${effect.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    `}>
                      <Power className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-center h-4 line-clamp-1">
                      {effect.type.replace('-', ' ')}
                    </span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-primary/20 bg-primary/[0.02]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <CardTitle className="text-lg">AMPLIFIER SECTION</CardTitle>
              <Badge className="bg-primary">{activePreset.ampModel}</Badge>
            </CardHeader>
            <CardContent className="p-8">
              {ampEffect && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-y-10 gap-x-4">
                  <RotaryKnob label="Gain" value={ampEffect.parameters.gain as number} onChange={(v) => handleParamChange('amp', 'gain', v)} size={72} />
                  <RotaryKnob label="Bass" value={ampEffect.parameters.bass as number} onChange={(v) => handleParamChange('amp', 'bass', v)} size={64} />
                  <RotaryKnob label="Mid" value={ampEffect.parameters.mid as number} onChange={(v) => handleParamChange('amp', 'mid', v)} size={64} />
                  <RotaryKnob label="Treble" value={ampEffect.parameters.treble as number} onChange={(v) => handleParamChange('amp', 'treble', v)} size={64} />
                  <RotaryKnob label="Presence" value={(ampEffect.parameters.presence as number) || 50} onChange={(v) => handleParamChange('amp', 'presence', v)} size={64} />
                  <RotaryKnob label="Volume" value={ampEffect.parameters.volume as number} onChange={(v) => handleParamChange('amp', 'volume', v)} size={72} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm">DELAY</CardTitle>
                <Switch checked={delayEffect?.enabled} onCheckedChange={() => handleToggleBlock('delay', 'delay', delayEffect?.enabled || false)} />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-around gap-4">
                  <RotaryKnob label="Time" value={delayEffect?.parameters.time as number} max={2000} step={10} unit="ms" onChange={(v) => handleParamChange('delay', 'time', v)} size={50} />
                  <RotaryKnob label="Mix" value={delayEffect?.parameters.mix as number} onChange={(v) => handleParamChange('delay', 'mix', v)} size={50} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm">REVERB</CardTitle>
                <Switch checked={reverbEffect?.enabled} onCheckedChange={() => handleToggleBlock('reverb', 'reverb', reverbEffect?.enabled || false)} />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-around gap-4">
                  <RotaryKnob label="Decay" value={reverbEffect?.parameters.decay as number} max={10} step={0.1} unit="s" onChange={(v) => handleParamChange('reverb', 'decay', v)} size={50} />
                  <RotaryKnob label="Mix" value={reverbEffect?.parameters.mix as number} onChange={(v) => handleParamChange('reverb', 'mix', v)} size={50} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
