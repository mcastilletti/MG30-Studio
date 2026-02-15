
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useMidiStore } from '@/stores/use-midi-store';
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, FileText, Save, List, Music2, Users, Layers, Check, ChevronRight, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
  // State for the list of saved notes
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  // Current editor state
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([
    { id: '1', type: 'Intro', text: '' }
  ]);

  // Load notes from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('mg30_studio_notes');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedNotes(parsed.map((n: any) => ({ ...n, date: new Date(n.date) })));
      } catch (e) {
        console.error("Failed to parse notes", e);
      }
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mg30_studio_notes', JSON.stringify(savedNotes));
  }, [savedNotes]);

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
    if (!title.trim()) {
      toast({ title: "Titolo mancante", description: "Inserisci un titolo per il brano.", variant: "destructive" });
      return;
    }

    const newNote: SavedNote = {
      id: selectedNoteId || Math.random().toString(),
      title: title,
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

    toast({ title: "Nota Salvata", description: `'${title}' è stato salvato in '${newNote.band} > ${newNote.setlist}'` });
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
    setIsDetailsOpen(true); // Open details for new notes
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
    setIsDetailsOpen(false); // Keep compact on load
    setIsNotesOpen(false);

    // If preset slot exists, try to send it to hardware
    if (note.presetSlot && status === 'connected') {
      sendProgramChange(parseInt(note.presetSlot) - 1);
    }
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedNotes(savedNotes.filter(n => n.id !== id));
    if (selectedNoteId === id) {
      handleNewNote();
    }
    toast({ title: "Nota eliminata" });
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  const NoteList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="w-3 h-3" /> Archivio Note
        </h3>
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase gap-1" onClick={handleNewNote}>
          <Plus className="w-3 h-3" /> Nuovo
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="pr-4 pb-8">
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedNotes).map(([bandName, setlists]) => (
              <AccordionItem key={bandName} value={`band-${bandName}`} className="border-none mb-2">
                <AccordionTrigger className="hover:no-underline py-2 bg-secondary/20 px-3 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-primary text-left">
                    <Users className="w-3 h-3 shrink-0" /> <span className="truncate">{bandName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <Accordion type="multiple" className="w-full ml-3 border-l border-primary/20 pl-3">
                    {Object.entries(setlists).map(([setName, notes]) => (
                      <AccordionItem key={setName} value={`set-${bandName}-${setName}`} className="border-none mb-1">
                        <AccordionTrigger className="hover:no-underline py-1.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">
                            <Music2 className="w-3 h-3 shrink-0" /> <span className="truncate">{setName}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1">
                          <div className="space-y-1 ml-2">
                            {notes.map((note) => (
                              <div 
                                key={note.id}
                                onClick={() => loadNote(note)}
                                className={cn(
                                  "group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all border",
                                  selectedNoteId === note.id 
                                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm" 
                                    : "bg-card/40 border-border hover:border-primary/20"
                                )}
                              >
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-[11px] font-semibold truncate">{note.title}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  onClick={(e) => deleteNote(note.id, e)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            <div className="text-center py-10 flex flex-col items-center gap-2 opacity-50">
              <NotebookPen className="w-8 h-8 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Nessuna nota salvata</p>
              <Button variant="ghost" size="sm" className="text-[9px]" onClick={handleNewNote}>Inizia ora</Button>
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
                      <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        Note
                        <ChevronRight className="w-4 h-4 md:hidden text-muted-foreground animate-pulse" />
                      </h2>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground md:hidden font-bold">Apri Archivio</span>
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:max-w-[340px] bg-background border-r border-border p-5">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-left text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Navigazione Gerarchica
                    </SheetTitle>
                  </SheetHeader>
                  <NoteList />
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleNewNote} className="h-9 px-3 gap-2 text-xs">
                <Plus className="w-4 h-4" /> Nuovo
              </Button>
              <Button onClick={handleSaveNote} size="sm" className="h-9 px-4 gap-2 bg-primary hover:bg-primary/90 font-bold">
                <Save className="w-4 h-4" /> SALVA
              </Button>
            </div>
          </header>

          <Card className="border-border shadow-md bg-card/50 overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input 
                      placeholder="Titolo Brano..." 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-lg font-bold h-12 bg-background/50 border-border/50 w-full placeholder:opacity-30"
                    />
                  </div>
                  <div className="w-full sm:w-[180px]">
                    <Select value={selectedPresetSlot} onValueChange={handlePresetChange}>
                      <SelectTrigger className="w-full h-12 bg-primary/5 border-primary/20 font-mono font-bold">
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
                </div>
                
                <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-[9px] uppercase tracking-widest font-bold bg-secondary/30 hover:bg-secondary/50">
                      <span className="flex items-center gap-2"><Info className="w-3 h-3" /> Dettagli Band / Scaletta</span>
                      {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> Band
                        </label>
                        <Input 
                          placeholder="Nome Band..." 
                          value={band}
                          onChange={(e) => setBand(e.target.value)}
                          className="h-10 bg-background/30 text-xs border-border/40"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1 flex items-center gap-1">
                          <Music2 className="w-2.5 h-2.5" /> Scaletta
                        </label>
                        <Input 
                          placeholder="Nome Scaletta..." 
                          value={setlist}
                          onChange={(e) => setSetlist(e.target.value)}
                          className="h-10 bg-background/30 text-xs border-border/40"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-[9px] uppercase tracking-widest font-bold bg-secondary/30 hover:bg-secondary/50">
                    <span className="flex items-center gap-2"><FileText className="w-3 h-3" /> Note Generali</span>
                    {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea 
                    placeholder="Annotazioni libere, accordi, settaggi particolari..." 
                    className="min-h-[120px] text-sm bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md overflow-hidden bg-card/50">
            <CardHeader className="py-2.5 bg-secondary/40 border-b border-border flex flex-row items-center justify-between px-4">
              <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-black flex items-center gap-2">
                <List className="w-3 h-3" /> Struttura Brano
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addSection} className="h-7 text-[9px] font-bold gap-1 uppercase bg-background">
                <Plus className="w-3 h-3" /> Aggiungi Sezione
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id} className="hover:bg-transparent border-b border-border/20">
                      <TableCell className="p-2 w-[110px]">
                        <Select 
                          value={section.type} 
                          onValueChange={(val: SectionType) => updateSectionType(section.id, val)}
                        >
                          <SelectTrigger className="h-10 text-[10px] border-none bg-primary/10 font-black uppercase focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sectionTypes.map(type => (
                              <SelectItem key={type} value={type} className="text-[10px] uppercase font-bold">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input 
                          value={section.text}
                          onChange={(e) => updateSectionText(section.id, e.target.value)}
                          placeholder="Appunti o cambi patch..."
                          className="h-10 text-lg font-medium border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:opacity-20 placeholder:italic"
                        />
                      </TableCell>
                      <TableCell className="p-2 w-10 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeSection(section.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="p-8 text-center text-[10px] uppercase tracking-widest text-muted-foreground opacity-50 italic">
                        Nessuna sezione definita
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </AppShell>
  );
}
