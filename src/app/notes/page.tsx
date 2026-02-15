
"use client"

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useMidiStore } from '@/stores/use-midi-store';
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, FileText, Save, List, Music2, Users, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

interface NoteSection {
  id: string;
  type: SectionType;
  text: string;
}

interface SavedNote {
  id: string;
  title: string;
  band: string;
  setlist: string;
  presetSlot: string;
  generalNotes: string;
  sections: NoteSection[];
  date: Date;
}

export default function NotesPage() {
  const { devicePresets, status, sendProgramChange } = useMidiStore();
  
  // State for the list of saved notes
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([
    {
      id: '1',
      title: 'Comfortably Numb',
      band: 'Pink Floyd Tribute',
      setlist: 'Tour 2024',
      presetSlot: '1',
      generalNotes: 'Impostazioni Big Muff e Delay per il primo assolo.',
      sections: [{ id: 's1', type: 'Solo', text: 'Slow bend al 12esimo tasto' }],
      date: new Date()
    }
  ]);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  // Current editor state
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [sections, setSections] = useState<NoteSection[]>([
    { id: '1', type: 'Intro', text: '' }
  ]);

  // Group notes by Band then by Setlist
  const groupedNotes = useMemo(() => {
    const groups: Record<string, Record<string, SavedNote[]>> = {};
    
    savedNotes.forEach(note => {
      const b = note.band || 'Senza Band';
      const s = note.setlist || 'Senza Scaletta';
      
      if (!groups[b]) groups[b] = {};
      if (!groups[b][s]) groups[b][s] = [];
      groups[b][s].push(note);
    });
    
    return groups;
  }, [savedNotes]);

  const handlePresetChange = (slot: string) => {
    setSelectedPresetSlot(slot);
    if (status === 'connected' && slot) {
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

  const handleSaveNote = () => {
    const newNote: SavedNote = {
      id: selectedNoteId || Math.random().toString(),
      title: title || 'Nuovo Brano',
      band: band || 'Senza Band',
      setlist: setlist || 'Senza Scaletta',
      presetSlot: selectedPresetSlot,
      generalNotes,
      sections,
      date: new Date()
    };
    
    if (selectedNoteId) {
      setSavedNotes(savedNotes.map(n => n.id === selectedNoteId ? newNote : n));
    } else {
      setSavedNotes([newNote, ...savedNotes]);
      setSelectedNoteId(newNote.id);
    }
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setTitle('');
    setBand('');
    setSetlist('');
    setSelectedPresetSlot('');
    setGeneralNotes('');
    setSections([{ id: '1', type: 'Intro', text: '' }]);
    setIsMobileSheetOpen(false);
  };

  const loadNote = (note: SavedNote) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setBand(note.band);
    setSetlist(note.setlist);
    setSelectedPresetSlot(note.presetSlot);
    setGeneralNotes(note.generalNotes);
    setSections(note.sections);
    setIsMobileSheetOpen(false);
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedNotes(savedNotes.filter(n => n.id !== id));
    if (selectedNoteId === id) {
      handleNewNote();
    }
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  const NoteList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="w-3 h-3" /> Archivio Note
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewNote}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="pr-4 pb-8">
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedNotes).map(([bandName, setlists]) => (
              <AccordionItem key={bandName} value={`band-${bandName}`} className="border-none">
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-primary">
                    <Users className="w-3 h-3" /> {bandName}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Accordion type="multiple" className="w-full ml-2 border-l border-primary/20 pl-2">
                    {Object.entries(setlists).map(([setName, notes]) => (
                      <AccordionItem key={setName} value={`set-${bandName}-${setName}`} className="border-none">
                        <AccordionTrigger className="hover:no-underline py-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <Music2 className="w-3 h-3" /> {setName}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 mt-1 ml-2">
                            {notes.map((note) => (
                              <div 
                                key={note.id}
                                onClick={() => loadNote(note)}
                                className={cn(
                                  "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all border",
                                  selectedNoteId === note.id 
                                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm" 
                                    : "bg-card/40 border-border hover:border-primary/20"
                                )}
                              >
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-[11px] font-semibold truncate">{note.title || 'Senza titolo'}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  onClick={(e) => deleteNote(note.id, e)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {savedNotes.length === 0 && (
            <div className="text-center py-10 text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">
              Nessuna sessione
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[calc(100vh-140px)]">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex w-72 flex-col gap-4 border-r border-border pr-6 shrink-0 h-[calc(100vh-160px)]">
          <NoteList />
        </aside>

        {/* Main Editor */}
        <main className="flex-1 space-y-4 max-w-xl mx-auto md:mx-0 w-full pb-20">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Trigger Mobile per Elenco Note */}
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger asChild>
                  <button className="flex items-center gap-3 group focus:outline-none md:cursor-default">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <NotebookPen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        Note
                        <List className="w-4 h-4 md:hidden text-muted-foreground" />
                      </h2>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground md:hidden">Tocca per archivio</span>
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-background border-r border-border p-4">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-left text-xs uppercase tracking-widest text-muted-foreground">Archivio Gerarchico</SheetTitle>
                  </SheetHeader>
                  <NoteList />
                </SheetContent>
              </Sheet>
            </div>
            <Button onClick={handleSaveNote} size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4" /> Salva
            </Button>
          </header>

          <Card className="border-border shadow-md bg-card/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <Input 
                  placeholder="Titolo Brano..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-bold h-12 bg-background/50 border-border/50 w-full"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Band</label>
                    <Input 
                      placeholder="Nome Band..." 
                      value={band}
                      onChange={(e) => setBand(e.target.value)}
                      className="h-9 bg-background/30 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Scaletta</label>
                    <Input 
                      placeholder="Nome Scaletta..." 
                      value={setlist}
                      onChange={(e) => setSetlist(e.target.value)}
                      className="h-9 bg-background/30 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Preset MG-30</label>
                  <Select value={selectedPresetSlot} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-full h-10 bg-background/50">
                      <SelectValue placeholder="Seleziona Preset" />
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
              </div>

              <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-[10px] uppercase tracking-widest font-bold bg-secondary/20">
                    Note Generali
                    {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea 
                    placeholder="Annotazioni libere, accordi, settaggi..." 
                    className="min-h-[100px] text-sm bg-background/50 border-border/50"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md overflow-hidden bg-card/50">
            <CardHeader className="py-2 bg-secondary/30 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Struttura Brano</CardTitle>
              <Button variant="ghost" size="sm" onClick={addSection} className="h-7 text-[9px] font-bold gap-1 uppercase hover:bg-primary/10">
                <Plus className="w-3 h-3" /> Aggiungi
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id} className="hover:bg-transparent border-b border-border/40">
                      <TableCell className="p-2 w-[100px]">
                        <Select 
                          value={section.type} 
                          onValueChange={(val: SectionType) => updateSectionType(section.id, val)}
                        >
                          <SelectTrigger className="h-9 text-[10px] border-none bg-primary/5 font-bold uppercase focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sectionTypes.map(type => (
                              <SelectItem key={type} value={type} className="text-[10px] uppercase">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={section.text}
                          onChange={(e) => updateSectionText(section.id, e.target.value)}
                          placeholder="..."
                          className="h-9 text-lg border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:opacity-20"
                        />
                      </TableCell>
                      <TableCell className="p-2 w-10 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
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
        </main>
      </div>
    </AppShell>
  );
}
