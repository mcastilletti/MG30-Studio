"use client"

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, LayoutGrid, List, Star, MoreVertical, Heart, Download } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MOCK_PRESETS = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  name: i === 0 ? "Purple Rain Lead" : `Preset ${i + 1}`,
  slot: (i % 56) + 1,
  category: ['Clean', 'Crunch', 'High Gain', 'Lead', 'Ambient'][i % 5],
  favorite: i % 4 === 0,
  amp: "British Lead",
  lastUsed: new Date()
}));

export default function LibraryPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Preset Library</h2>
            <p className="text-muted-foreground">Manage your custom tones and MG-30 slots.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Preset</Button>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Import Backup</Button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-xl border border-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, amp, or tag..." 
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
              <Card key={preset.id} className="group overflow-hidden hover:border-primary/50 transition-all bg-card/50">
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
                          <DropdownMenuItem>Load to Slot</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                   <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Amp Model</div>
                      <div className="text-sm font-medium">{preset.amp}</div>
                   </div>
                   <div className="flex gap-1 mt-3">
                      <Badge variant="secondary" className="text-[9px] h-4">{preset.category}</Badge>
                      <Badge variant="outline" className="text-[9px] h-4">DELAY</Badge>
                      <Badge variant="outline" className="text-[9px] h-4">RVB</Badge>
                   </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/50 bg-secondary/10 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">MODIFIED: 2d ago</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 font-bold uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">Edit Tone</Button>
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
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Name</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Category</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest">Amp Model</th>
                    <th className="p-4 font-bold uppercase text-[11px] text-muted-foreground tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_PRESETS.map((preset) => (
                    <tr key={preset.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="p-4 font-mono font-bold text-primary">{preset.slot.toString().padStart(2, '0')}</td>
                      <td className="p-4 font-semibold">{preset.name}</td>
                      <td className="p-4"><Badge variant="secondary">{preset.category}</Badge></td>
                      <td className="p-4 text-muted-foreground">{preset.amp}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8">Load</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100"><Star className="w-4 h-4" /></Button>
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
