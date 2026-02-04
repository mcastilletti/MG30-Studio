
"use client"

import React, { useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { usePresetStore } from '@/stores/use-preset-store';
import { useMidiStore } from '@/stores/use-midi-store';
import { RotaryKnob } from '@/components/controls/rotary-knob';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Save, Share2, Power, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EditorPage() {
  const { activePreset, updateParameter, toggleEffect, undo, redo, setActivePreset } = usePresetStore();
  const { status, sendControlChange, sendProgramChange } = useMidiStore();

  // Mapping di esempio CC per MG-30 (questi variano a seconda del blocco attivo)
  // In una versione reale, servirebbe una mappa completa per ogni modello di Amp/FX
  const CC_MAP: Record<string, number> = {
    'amp-gain': 10,
    'amp-bass': 11,
    'amp-mid': 12,
    'amp-treble': 13,
    'amp-volume': 14,
    'delay-mix': 20,
    'reverb-mix': 30,
  };

  const handleParamChange = (effectId: string, param: string, value: number) => {
    updateParameter(effectId, param, value);
    
    // Invia comando MIDI se il device è connesso
    if (status === 'connected') {
      const ccKey = `${effectId}-${param}`;
      if (CC_MAP[ccKey]) {
        sendControlChange(CC_MAP[ccKey], value);
      } else {
        // Fallback: molti parametri su MG-30 richiedono SysEx per modifiche granulari
        // Qui potremmo inviare un SysEx di parametro se avessimo la mappa completa
      }
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
                <Badge variant="secondary" className="text-[10px] uppercase">{activePreset.category}</Badge>
                <span className="text-[10px] text-muted-foreground">MIDI STATUS: {status.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <div className="w-[1px] h-8 bg-border mx-2" />
            <Button variant="outline" className="gap-2"><Share2 className="w-4 h-4" /> Export</Button>
            <Button className="gap-2"><Save className="w-4 h-4" /> Save to Device</Button>
          </div>
        </div>

        {/* Signal Chain Visualizer */}
        <Card className="border-border bg-background/50 overflow-hidden">
          <CardHeader className="py-3 border-b border-border bg-secondary/20">
             <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <LayoutGrid className="w-3 h-3" /> Signal Chain
                </CardTitle>
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">MONO SIGNAL</Badge>
             </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto gap-4 pb-2">
              {activePreset.effects.map((effect, idx) => (
                <React.Fragment key={effect.id}>
                  <div 
                    onClick={() => {
                      toggleEffect(effect.id);
                      // Invia CC per abilitare/disabilitare l'effetto (bypass)
                      // sendControlChange(EFFECT_BYPASS_CC[effect.type], effect.enabled ? 0 : 127);
                    }}
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
                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-background ${effect.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Model</span>
                <Badge className="bg-primary hover:bg-primary/80">{activePreset.ampModel}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {ampEffect && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-y-10 gap-x-4">
                  <RotaryKnob 
                    label="Gain" 
                    value={ampEffect.parameters.gain as number} 
                    onChange={(v) => handleParamChange('amp', 'gain', v)} 
                    size={72} 
                    className="col-span-1"
                  />
                  <RotaryKnob 
                    label="Bass" 
                    value={ampEffect.parameters.bass as number} 
                    onChange={(v) => handleParamChange('amp', 'bass', v)} 
                    size={64} 
                  />
                  <RotaryKnob 
                    label="Mid" 
                    value={ampEffect.parameters.mid as number} 
                    onChange={(v) => handleParamChange('amp', 'mid', v)} 
                    size={64} 
                  />
                  <RotaryKnob 
                    label="Treble" 
                    value={ampEffect.parameters.treble as number} 
                    onChange={(v) => handleParamChange('amp', 'treble', v)} 
                    size={64} 
                  />
                  <RotaryKnob 
                    label="Volume" 
                    value={ampEffect.parameters.volume as number} 
                    onChange={(v) => handleParamChange('amp', 'volume', v)} 
                    size={72} 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm">DELAY</CardTitle>
                <Switch 
                  checked={delayEffect?.enabled} 
                  onCheckedChange={() => toggleEffect('delay')} 
                />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-around gap-4">
                  <RotaryKnob 
                    label="Time" 
                    value={delayEffect?.parameters.time as number} 
                    max={2000}
                    step={10}
                    unit="ms"
                    onChange={(v) => handleParamChange('delay', 'time', v)} 
                    size={50} 
                  />
                  <RotaryKnob 
                    label="F.Back" 
                    value={delayEffect?.parameters.feedback as number} 
                    onChange={(v) => handleParamChange('delay', 'feedback', v)} 
                    size={50} 
                  />
                  <RotaryKnob 
                    label="Mix" 
                    value={delayEffect?.parameters.mix as number} 
                    onChange={(v) => handleParamChange('delay', 'mix', v)} 
                    size={50} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm">REVERB</CardTitle>
                <Switch 
                  checked={reverbEffect?.enabled} 
                  onCheckedChange={() => toggleEffect('reverb')} 
                />
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-around gap-4">
                  <RotaryKnob 
                    label="Decay" 
                    value={reverbEffect?.parameters.decay as number} 
                    max={10}
                    step={0.1}
                    unit="s"
                    onChange={(v) => handleParamChange('reverb', 'decay', v)} 
                    size={50} 
                  />
                   <RotaryKnob 
                    label="Mix" 
                    value={reverbEffect?.parameters.mix as number} 
                    onChange={(v) => handleParamChange('reverb', 'mix', v)} 
                    size={50} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
