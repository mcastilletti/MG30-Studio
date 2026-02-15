
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
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, FileText, Save, List, Music2, Users, Layers, Check, ChevronRight, Info, Pencil, ArrowRightLeft, Copy, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  // Editor state
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([
    { id: '1', type: 'Intro', text: '' }
  ]);

  // Move/Duplicate Dialog State
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionNote, setActionNote] = useState<SavedNote | null>(null);
  const [actionType, setActionType] = useState<'move' | 'duplicate'>('move');
  const [targetBand, setTargetBand] = useState('');
  const [targetSetlist, setTargetSetlist] = useState('');

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

  useEffect(() => {
    localStorage.setItem('mg30_studio_notes', JSON.stringify(savedNotes));
  }, [savedNotes]);

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
    setIsDetailsOpen(false);
    toast({ title: "Nota Salvata" });
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
    setIsDetailsOpen(true);
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
    setIsDetailsOpen(false);
    setIsNotesOpen(true);

    if (note.presetSlot && status === 'connected') {
      sendProgramChange(parseInt(note.presetSlot) - 1);
    }
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedNotes(savedNotes.filter(n => n.id !== id));
    if (selectedNoteId === id) handleNewNote();
    toast({ title: "Nota eliminata" });
  };

  const openActionDialog = (note: SavedNote, type: 'move' | 'duplicate', e: React.MouseEvent) => {
    e.stopPropagation();
    setActionNote(note);
    setActionType(type);
    setTargetBand(note.band);
    setTargetSetlist(note.setlist);
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!actionNote) return;

    if (actionType === 'move') {
      const updatedNotes = savedNotes.map(n => 
        n.id === actionNote.id ? { ...n, band: targetBand, setlist: targetSetlist } : n
      );
      setSavedNotes(updatedNotes);
      toast({ title: "Nota Spostata" });
    } else {
      const duplicatedNote: SavedNote = {
        ...actionNote,
        id: Math.random().toString(),
        title: `${actionNote.title} (Copia)`,
        band: targetBand,
        setlist: targetSetlist,
        date: new Date()
      };
      setSavedNotes([duplicatedNote, ...savedNotes]);
      toast({ title: "Nota Duplicata" });
    }

    setIsActionDialogOpen(false);
    setActionNote(null);
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  const NoteList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="w-3 h-3" /> Archivio
        </h3>
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase gap-1" onClick={handleNewNote}>
          <Plus className="w-3 h-3" /> Nuovo
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="pr-2 pb-8">
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
                                  "group flex flex-col p-2.5 rounded-md cursor-pointer transition-all border",
                                  selectedNoteId === note.id 
                                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm" 
                                    : "bg-card/40 border-border hover:border-primary/20"
                                )}
                              >
                                <span className="text-[11px] font-semibold truncate mb-1">{note.title}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={(e) => openActionDialog(note, 'move', e)}
                                    title="Sposta"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={(e) => openActionDialog(note, 'duplicate', e)}
                                    title="Duplica"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => deleteNote(note.id, e)}
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
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
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Vuoto</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[calc(100vh-140px)]">
        <aside className="hidden md:flex w-64 flex-col gap-4 border-r border-border pr-6 shrink-0 h-[calc(100vh-160px)]">
          <NoteList />
        </aside>

        <main className="flex-1 space-y-4 max-w-xl mx-auto md:mx-0 w-full pb-20">
          <header className="flex items-center justify-between gap-2 py-2 border-b border-border/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 md:hidden">
                    <NotebookPen className="w-5 h-5 text-primary" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85%] sm:max-w-[340px]">
                  <NoteList />
                </SheetContent>
              </Sheet>
              <Input 
                placeholder="Titolo..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm font-bold h-8 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="h-8 w-8 text-muted-foreground">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button onClick={handleSaveNote} size="icon" className="h-8 w-8 bg-primary shadow-md">
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </header>

          <div className="space-y-3">
            <Select value={selectedPresetSlot} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full h-10 bg-primary/5 border-primary/20 font-mono text-xs">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                {devicePresets.map((p) => (
                  <SelectItem key={p.slot} value={p.slot.toString()}>{p.slot}: {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedNoteId === null || isDetailsOpen) && (
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="space-y-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-[9px] font-bold bg-secondary/30">
                    <span>ORGANIZZAZIONE</span>
                    {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input placeholder="Band..." value={band} onChange={(e) => setBand(e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="Scaletta..." value={setlist} onChange={(e) => setSetlist(e.target.value)} className="h-8 text-xs" />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-[9px] font-bold bg-secondary/30">
                  <span>NOTE GENERALI</span>
                  {isNotesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea 
                  placeholder="Appunti..." 
                  className="min-h-[120px] text-sm bg-background/50 resize-none"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                />
              </CollapsibleContent>
            </Collapsible>

            <Card className="border-border shadow-md bg-card/50">
              <CardHeader className="py-2 bg-secondary/40 flex flex-row items-center justify-between px-3">
                <CardTitle className="text-[9px] uppercase tracking-widest font-black">Struttura</CardTitle>
                <Button variant="outline" size="sm" onClick={addSection} className="h-6 text-[8px] font-bold uppercase">
                  <Plus className="w-2 h-2 mr-1" /> Sezione
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {sections.map((section) => (
                      <TableRow key={section.id} className="hover:bg-transparent border-b border-border/20">
                        <TableCell className="p-1.5 w-[80px]">
                          <Select value={section.type} onValueChange={(val: SectionType) => updateSectionType(section.id, val)}>
                            <SelectTrigger className="h-8 text-[9px] border-none bg-primary/10 font-black focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sectionTypes.map(type => <SelectItem key={type} value={type} className="text-[10px] uppercase font-bold">{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input 
                            value={section.text}
                            onChange={(e) => updateSectionText(section.id, e.target.value)}
                            className="h-8 text-lg font-semibold border-none bg-transparent shadow-none focus-visible:ring-0"
                          />
                        </TableCell>
                        <TableCell className="p-1 w-8">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40" onClick={() => removeSection(section.id)}>
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
        </main>
      </div>

      {/* Move/Duplicate Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'move' ? <ArrowRightLeft className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {actionType === 'move' ? 'Sposta Nota' : 'Duplica Nota'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'move' 
                ? `Sposta "${actionNote?.title}" in una nuova posizione.` 
                : `Crea una copia di "${actionNote?.title}" in una nuova posizione.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Destinazione Band</label>
              <Input 
                value={targetBand} 
                onChange={(e) => setTargetBand(e.target.value)} 
                placeholder="Nome Band..."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Destinazione Scaletta</label>
              <Input 
                value={targetSetlist} 
                onChange={(e) => setTargetSetlist(e.target.value)} 
                placeholder="Nome Scaletta..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleConfirmAction}>
              {actionType === 'move' ? 'Sposta ora' : 'Duplica ora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
