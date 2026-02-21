
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
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, Save, Music2, Users, Layers, Check, Pencil, ArrowRightLeft, Copy, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type SectionType = "Intro" | "Verse" | "Chorus" | "Bridge" | "Strum" | "Out" | "Solo";

interface NoteSection {
  id: string;
  type: SectionType;
  text: string;
  chords?: string[];
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

const CHORD_ROOTS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];

const CHORD_TABLE: Record<string, string[]> = {
  "C": ["C", "Cm", "C7", "Cmaj7", "Cm7", "C aum", "Cdim", "Csus4", "Csus2", "Cadd9"],
  "C#": ["C#", "C#m", "C#7", "C#maj7", "C#m7", "C# aum", "C#dim", "C#sus4", "C#sus2", "C#add9"],
  "Db": ["Db", "Dbm", "Db7", "Dbmaj7", "Dbm7", "Db aum", "Dbdim", "Dbsus4", "Dbsus2", "Dbmadd9"],
  "D": ["D", "Dm", "D7", "Dmaj7", "Dm7", "D aum", "Ddim", "Dsus4", "Dsus2", "Dadd9"],
  "D#": ["D#", "D#m", "D#7", "D#maj7", "D#m7", "D# aum", "D#dim", "D#sus4", "D#sus2", "D#add9"],
  "Eb": ["Eb", "Ebm", "Eb7", "Ebmaj7", "Ebm7", "Eb aum", "Ebdim", "Ebsus4", "Ebsus2", "Ebadd9"],
  "E": ["E", "Em", "E7", "Emaj7", "Em7", "E aum", "Edim", "Esus4", "Esus2", "Eadd9"],
  "F": ["F", "Fm", "F7", "Fmaj7", "Fm7", "F aum", "Fdim", "Fsus4", "Fsus2", "Fadd9"],
  "F#": ["F#", "F#m", "F#7", "F#maj7", "F#m7", "F# aum", "F#dim", "F#sus4", "F#sus2", "F#add9"],
  "Gb": ["Gb", "Gbm", "Gb7", "Gbmaj7", "Gbm7", "Gb aum", "Gbdim", "Gbsus4", "Gbsus2", "Gbadd9"],
  "G": ["G", "Gm", "G7", "Gmaj7", "Gm7", "G aum", "Gdim", "Gsus4", "Gsus2", "Gadd9"],
  "G#": ["G#", "G#m", "G#7", "G#maj7", "G#m7", "G# aum", "G#dim", "G#sus4", "G#sus2", "G#add9"],
  "Ab": ["Ab", "Abm", "Ab7", "Abmaj7", "Abm7", "Ab aum", "Abdim", "Absus4", "Absus2", "Abadd9"],
  "A": ["A", "Am", "A7", "Amaj7", "Am7", "A aum", "Adim", "Asus4", "Asus2", "Aadd9"],
  "A#": ["A#", "A#m", "A#7", "A#maj7", "A#m7", "A# aum", "A#dim", "A#sus4", "A#sus2", "A#add9"],
  "Bb": ["Bb", "Bbm", "Bb7", "Bbmaj7", "Bbm7", "Bb aum", "Bbdim", "Bbsus4", "Bbsus2", "Bbadd9"],
  "B": ["B", "Bm", "B7", "Bmaj7", "Bm7", "B aum", "Bdim", "Bsus4", "Bsus2", "Badd9"],
};

export default function NotesPage() {
  const { devicePresets, status, sendProgramChange } = useMidiStore();
  const { toast } = useToast();
  
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [band, setBand] = useState('');
  const [setlist, setSetlist] = useState('');
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(true); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState<NoteSection[]>([
    { id: '1', type: 'Intro', text: '', chords: [] }
  ]);

  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionNote, setActionNote] = useState<SavedNote | null>(null);
  const [actionType, setActionType] = useState<'move' | 'duplicate'>('move');
  const [targetBand, setTargetBand] = useState('');
  const [targetSetlist, setTargetSetlist] = useState('');
  const [isNewBand, setIsNewBand] = useState(false);
  const [isNewSetlist, setIsNewSetlist] = useState(false);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ type: 'band' | 'setlist', bandName: string, setName?: string } | null>(null);
  const [newName, setNewName] = useState('');

  const [chordPickerStep, setChordPickerStep] = useState<'letter' | 'accidental' | 'quality'>('letter');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

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

  const existingBands = useMemo(() => Object.keys(groupedNotes).filter(b => b !== 'Senza Band'), [groupedNotes]);
  
  const existingSetlistsForTargetBand = useMemo(() => {
    if (!targetBand || targetBand === 'Senza Band') return [];
    return Object.keys(groupedNotes[targetBand] || {}).filter(s => s !== 'Senza Scaletta');
  }, [groupedNotes, targetBand]);

  const handlePresetChange = (slot: string) => {
    setSelectedPresetSlot(slot);
    if (status === 'connected' && slot) {
      sendProgramChange(parseInt(slot) - 1);
    }
  };

  const addSection = () => {
    setSections([...sections, { id: Math.random().toString(), type: 'Verse', text: '', chords: [] }]);
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

  const addChordToSection = (sectionId: string, chord: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, chords: [...(s.chords || []), chord] } : s));
  };

  const removeChordFromSection = (sectionId: string, chordIndex: number) => {
    setSections(sections.map(s => {
      if (s.id === sectionId && s.chords) {
        const newChords = [...s.chords];
        newChords.splice(chordIndex, 1);
        return { ...s, chords: newChords };
      }
      return s;
    }));
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
    setEditMode(false);
    toast({ title: "Nota Salvata" });
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setTitle('');
    setBand('');
    setSetlist('');
    setSelectedPresetSlot('');
    setGeneralNotes('');
    setSections([{ id: '1', type: 'Intro', text: '', chords: [] }]);
    setIsMobileSheetOpen(false);
    setEditMode(true);
    setIsDetailsOpen(true);
  };

  const loadNote = (note: SavedNote) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setBand(note.band);
    setSetlist(note.setlist);
    setSelectedPresetSlot(note.presetSlot);
    setGeneralNotes(note.generalNotes);
    setSections(note.sections.map(s => ({ ...s, chords: s.chords || [] })));
    setIsMobileSheetOpen(false);
    setEditMode(false);
    setIsNotesOpen(true);
    setIsDetailsOpen(false);

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
    setIsNewBand(false);
    setIsNewSetlist(false);
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!actionNote) return;

    const finalBand = targetBand || 'Senza Band';
    const finalSetlist = targetSetlist || 'Senza Scaletta';

    if (actionType === 'move') {
      const updatedNotes = savedNotes.map(n => 
        n.id === actionNote.id ? { ...n, band: finalBand, setlist: finalSetlist } : n
      );
      setSavedNotes(updatedNotes);
      toast({ title: "Nota Spostata" });
    } else {
      const duplicatedNote: SavedNote = {
        ...actionNote,
        id: Math.random().toString(),
        title: `${actionNote.title} (Copia)`,
        band: finalBand,
        setlist: finalSetlist,
        date: new Date()
      };
      setSavedNotes([duplicatedNote, ...savedNotes]);
      toast({ title: "Nota Duplicata" });
    }

    setIsActionDialogOpen(false);
    setActionNote(null);
  };

  const handleRenameGroup = () => {
    if (!renameTarget || !newName.trim()) return;

    const updatedNotes = savedNotes.map(n => {
      if (renameTarget.type === 'band' && n.band === renameTarget.bandName) {
        return { ...n, band: newName };
      }
      if (renameTarget.type === 'setlist' && n.band === renameTarget.bandName && n.setlist === renameTarget.setName) {
        return { ...n, setlist: newName };
      }
      return n;
    });

    setSavedNotes(updatedNotes);
    setIsRenameDialogOpen(false);
    setRenameTarget(null);
    setNewName('');
    toast({ title: "Aggiornamento completato" });
  };

  const handleDeleteBand = (bandName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Sei sicuro di voler eliminare TUTTE le note della band "${bandName}"?`)) {
      setSavedNotes(savedNotes.filter(n => n.band !== bandName));
      toast({ title: "Band eliminata" });
    }
  };

  const handleDeleteSetlist = (bandName: string, setName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Sei sicuro di voler eliminare TUTTE le note della scaletta "${setName}" per la band "${bandName}"?`)) {
      setSavedNotes(savedNotes.filter(n => !(n.band === bandName && n.setlist === setName)));
      toast({ title: "Scaletta eliminata" });
    }
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  const ChordPicker = ({ sectionId }: { sectionId: string }) => {
    const handleLetterSelect = (letter: string) => {
      setSelectedLetter(letter);
      setChordPickerStep('accidental');
    };

    const handleAccidentalSelect = (root: string) => {
      setSelectedRoot(root);
      setChordPickerStep('quality');
    };

    const handleQualitySelect = (chord: string) => {
      addChordToSection(sectionId, chord);
      resetPicker();
    };

    const resetPicker = () => {
      setChordPickerStep('letter');
      setSelectedLetter(null);
      setSelectedRoot(null);
    };

    const availableAccidentals = selectedLetter 
      ? CHORD_ROOTS.filter(r => r.startsWith(selectedLetter))
      : [];

    return (
      <div className="w-full space-y-4">
        {chordPickerStep === 'letter' && (
          <div className="grid grid-cols-4 gap-2">
            {["A", "B", "C", "D", "E", "F", "G"].map(l => (
              <Button key={l} variant="outline" size="sm" onClick={() => handleLetterSelect(l)} className="font-bold">{l}</Button>
            ))}
          </div>
        )}

        {chordPickerStep === 'accidental' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              {availableAccidentals.map(r => (
                <Button key={r} variant="outline" size="sm" onClick={() => handleAccidentalSelect(r)} className="font-bold">{r}</Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChordPickerStep('letter')} className="text-[10px] uppercase">Indietro</Button>
          </div>
        )}

        {chordPickerStep === 'quality' && selectedRoot && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
              {CHORD_TABLE[selectedRoot]?.map((chord, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => handleQualitySelect(chord)} className="text-xs font-bold truncate">
                  {chord === selectedRoot ? 'Maggiore' : chord}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChordPickerStep('accidental')} className="text-[10px] uppercase">Indietro</Button>
          </div>
        )}
      </div>
    );
  };

  const NoteList = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="w-3 h-3" /> Archivio
        </h3>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNewNote}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="pr-2 pb-8">
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedNotes).map(([bandName, setlists]) => (
              <AccordionItem key={bandName} value={`band-${bandName}`} className="border-none mb-2">
                <div className="flex items-center group/band">
                  <AccordionTrigger 
                    hideIcon 
                    className="hover:no-underline py-2 bg-secondary/20 px-3 rounded-lg flex-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-primary text-left">
                      <Users className="w-3 h-3 shrink-0" /> <span className="truncate">{bandName}</span>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 opacity-0 group-hover/band:opacity-100 transition-opacity px-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                      e.stopPropagation();
                      setRenameTarget({ type: 'band', bandName });
                      setNewName(bandName);
                      setIsRenameDialogOpen(true);
                    }}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => handleDeleteBand(bandName, e)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <AccordionContent className="pt-2">
                  <Accordion type="multiple" className="w-full ml-3 border-l border-primary/20 pl-3">
                    {Object.entries(setlists).map(([setName, notes]) => (
                      <AccordionItem key={setName} value={`set-${bandName}-${setName}`} className="border-none mb-1">
                        <div className="flex items-center group/set">
                          <AccordionTrigger 
                            hideIcon 
                            className="hover:no-underline py-1.5 flex-1"
                          >
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">
                              <Music2 className="w-3 h-3 shrink-0" /> <span className="truncate">{setName}</span>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-1 opacity-0 group-hover/set:opacity-100 transition-opacity px-2">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => {
                              e.stopPropagation();
                              setRenameTarget({ type: 'setlist', bandName, setName });
                              setNewName(setName);
                              setIsRenameDialogOpen(true);
                            }}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => handleDeleteSetlist(bandName, setName, e)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
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
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => openActionDialog(note, 'move', e)}><ArrowRightLeft className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => openActionDialog(note, 'duplicate', e)}><Copy className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => deleteNote(note.id, e)}><Trash2 className="w-3 h-3" /></Button>
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
                  <SheetHeader className="text-left mb-4">
                    <SheetTitle>Archivio Note</SheetTitle>
                  </SheetHeader>
                  <NoteList />
                </SheetContent>
              </Sheet>
              <Input 
                placeholder="Titolo Brano..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm font-bold h-8 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setEditMode(!editMode)} className={cn("h-8 w-8", editMode ? "text-primary bg-primary/10" : "text-muted-foreground")}>
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
                <SelectValue placeholder="Seleziona Preset Hardware" />
              </SelectTrigger>
              <SelectContent>
                {devicePresets.map((p) => (
                  <SelectItem key={p.slot} value={p.slot.toString()}>{p.slot}: {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedNoteId === null || editMode) && (
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="space-y-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-[9px] font-bold bg-secondary/30">
                    <span>ORGANIZZAZIONE (BAND / SCALETTA)</span>
                    {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Band</label>
                        <Input placeholder="Es: Pink Floyd Tribute" value={band} onChange={(e) => setBand(e.target.value)} className="h-8 text-xs bg-background/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Scaletta</label>
                        <Input placeholder="Es: Tour 2024" value={setlist} onChange={(e) => setSetlist(e.target.value)} className="h-8 text-xs bg-background/50" />
                      </div>
                    </div>
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
                  placeholder="Annotazioni libere, accordature, effetti esterni..." 
                  className="min-h-[120px] text-sm bg-background/50 resize-none"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                />
              </CollapsibleContent>
            </Collapsible>

            <Card className="border-border shadow-md bg-card/50">
              <CardHeader className="py-2 bg-secondary/40 flex flex-row items-center justify-between px-3">
                <CardTitle className="text-[9px] uppercase tracking-widest font-black">Struttura Brano</CardTitle>
                <Button variant="outline" size="sm" onClick={addSection} className="h-6 text-[8px] font-bold uppercase">
                  <Plus className="w-2 h-2 mr-1" /> Sezione
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {sections.map((section) => (
                      <TableRow key={section.id} className="hover:bg-transparent border-b border-border/20">
                        <TableCell className="p-1.5 w-[90px]">
                          <Select value={section.type} onValueChange={(val: SectionType) => updateSectionType(section.id, val)}>
                            <SelectTrigger className="h-8 text-[9px] border-none bg-primary/10 font-black focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sectionTypes.map(type => <SelectItem key={type} value={type} className="text-[10px] uppercase font-bold">{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5 flex-1 min-w-[200px]">
                          <div className="flex flex-wrap gap-2 items-center min-h-[40px]">
                            {section.chords && section.chords.map((chord, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="h-6 px-2 text-xs font-bold cursor-pointer hover:bg-destructive/10 hover:text-destructive group transition-colors"
                                onClick={() => removeChordFromSection(section.id, i)}
                              >
                                {chord}
                                <X className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                            <Input 
                              value={section.text}
                              onChange={(e) => updateSectionText(section.id, e.target.value)}
                              placeholder="Note..."
                              className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 w-auto min-w-[50px] flex-1"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1 w-auto flex items-center gap-1">
                          <Popover onOpenChange={(open) => !open && setChordPickerStep('letter')}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8 text-primary border-primary/20"><Plus className="w-4 h-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4" align="end">
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aggiungi Accordo</h4>
                                <ChordPicker sectionId={section.id} />
                              </div>
                            </PopoverContent>
                          </Popover>
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

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rinomina {renameTarget?.type === 'band' ? 'Band' : 'Scaletta'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Nuovo nome..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleRenameGroup}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'move' ? <ArrowRightLeft className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {actionType === 'move' ? 'Sposta Nota' : 'Duplica Nota'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Band</label>
                <button onClick={() => setIsNewBand(!isNewBand)} className="text-[10px] text-primary hover:underline">
                  {isNewBand ? "Scegli Esistente" : "Crea Nuova"}
                </button>
              </div>
              {isNewBand ? (
                <Input value={targetBand} onChange={(e) => setTargetBand(e.target.value)} placeholder="Nome Band..." autoFocus />
              ) : (
                <Select value={targetBand} onValueChange={setTargetBand}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Senza Band">Senza Band</SelectItem>
                    {existingBands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Scaletta</label>
                <button onClick={() => setIsNewSetlist(!isNewSetlist)} className="text-[10px] text-primary hover:underline">
                  {isNewSetlist ? "Scegli Esistente" : "Crea Nuova"}
                </button>
              </div>
              {isNewSetlist ? (
                <Input value={targetSetlist} onChange={(e) => setTargetSetlist(e.target.value)} placeholder="Nome Scaletta..." />
              ) : (
                <Select value={targetSetlist} onValueChange={setTargetSetlist}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Senza Scaletta">Senza Scaletta</SelectItem>
                    {existingSetlistsForTargetBand.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleConfirmAction}>{actionType === 'move' ? 'Sposta' : 'Duplica'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
