"use client"

import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMidiStore } from '@/stores/use-midi-store';
import { Button } from '@/components/ui/button';
import { Sliders, Library, Zap, Download, Database, RotateCw, Usb } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { status, refreshDevices, availableDevices } = useMidiStore();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Manage your NUX MG-30 device and local preset library.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Usb className="w-5 h-5 text-primary" />
                    Connection Status
                  </CardTitle>
                  <CardDescription>Hardware connectivity overview</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshDevices}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 p-4 rounded-lg bg-card border border-border">
                <div className={`p-4 rounded-full ${status === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   <Usb className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xl font-bold uppercase tracking-wider">{status}</div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'connected' 
                      ? "Device detected: NUX MG-30 ready for editing."
                      : "No device detected. Please connect your MG-30 via USB."}
                  </p>
                </div>
              </div>

              {availableDevices.inputs.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold">Available MIDI Ports</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-md bg-secondary/30 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Inputs</p>
                      {availableDevices.inputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                    <div className="p-3 rounded-md bg-secondary/30 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Outputs</p>
                      {availableDevices.outputs.map(d => (
                        <div key={d.id} className="text-xs truncate">{d.name}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Library and presets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-sm">Total Presets</span>
                </div>
                <span className="font-mono font-bold">124</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Library className="w-4 h-4 text-accent" />
                  <span className="text-sm">User Categories</span>
                </div>
                <span className="font-mono font-bold">12</span>
              </div>
              <Button asChild className="w-full mt-2" variant="secondary">
                <Link href="/library">Manage Library</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/editor" className="group">
            <Card className="h-full border-border hover:border-primary/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sliders className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">Visual Editor</h4>
                  <p className="text-xs text-muted-foreground">Adjust pedal parameters</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/library" className="group">
            <Card className="h-full border-border hover:border-accent/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Library className="w-6 h-6 text-accent" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">Preset Library</h4>
                  <p className="text-xs text-muted-foreground">Browse your collection</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tools/sysex-analyzer" className="group">
            <Card className="h-full border-border hover:border-yellow-500/50 transition-colors bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold">AI Analyzer</h4>
                  <p className="text-xs text-muted-foreground">Reverse engineer SysEx</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full border-border cursor-pointer hover:border-green-500/50 transition-colors bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-center">
                <h4 className="font-bold">Bulk Backup</h4>
                <p className="text-xs text-muted-foreground">Backup all 56 slots</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
