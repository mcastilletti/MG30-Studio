
"use client"

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useMidiStore } from '@/stores/use-midi-store';
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

interface NoteSection {
  id: string;
  type: SectionType;
  text: string;
}

export default function NotesPage() {
  const { devicePresets, status, sendProgramChange } = useMidiStore();
  const [title, setTitle] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [sections, setSections] = useState<NoteSection[]>([
    { id: '1', type: 'Intro', text: '' }
  ]);

  const handlePresetChange = (slot: string) => {
    setSelectedPresetSlot(slot);
    if (status === 'connected') {
      sendProgramChange(parseInt(slot) - 1);
    }
  };

  const addSection = () => {
    setSections([...sections, { id: Math.random().toString(), type: 'Verse', text: '' }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSectionType = (id: string, type: SectionType) => {
    setSections(sections.map(s => s.id === id ? { ...s, type } : s));
  };

  const updateSectionText = (id: string, text: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, text } : s));
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  return (
    <AppShell>
      <div className="max-w-md mx-auto space-y-4 pb-10">
        <header className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <NotebookPen className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Note Sessione</h2>
        </header>

        <Card className="border-border shadow-md">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Titolo Brano..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-bold h-12 bg-secondary/20"
              />
              <Select value={selectedPresetSlot} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[120px] h-12">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent>
                  {devicePresets.map((p) => (
                    <SelectItem key={p.slot} value={p.slot.toString()}>
                      {p.slot}: {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-[10px] uppercase tracking-widest font-bold">
                    Note Generali
                    {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <Textarea 
                  placeholder="Annotazioni libere, accordi, settaggi..." 
                  className="min-h-[100px] text-sm bg-secondary/10"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card className="border-border shadow-md overflow-hidden">
          <CardHeader className="py-3 bg-secondary/20 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Struttura Brano</CardTitle>
            <Button variant="ghost" size="sm" onClick={addSection} className="h-7 text-[10px] font-bold gap-1 uppercase">
              <Plus className="w-3 h-3" /> Aggiungi
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id} className="hover:bg-transparent border-b border-border/50">
                    <TableCell className="p-2 w-[110px]">
                      <Select 
                        value={section.type} 
                        onValueChange={(val: SectionType) => updateSectionType(section.id, val)}
                      >
                        <SelectTrigger className="h-10 text-xs border-none bg-primary/5 font-bold uppercase focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionTypes.map(type => (
                            <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input 
                        value={section.text}
                        onChange={(e) => updateSectionText(section.id, e.target.value)}
                        placeholder="..."
                        className="h-10 text-lg border-none bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="p-2 w-10">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
