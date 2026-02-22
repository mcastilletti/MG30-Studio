
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
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, Save, Music2, Layers, Pencil, X, FileJson, Check, UserSquare2, ListMusic } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getChordPositions } from '@/lib/chord-data';

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
  date?: any;
  userId?: string;
  updatedAt?: any;
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
  const { firestore } = useFirebase();
  const { user, loading: userLoading } = useUser();
  
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [localNotes, setLocalNotes] = useState<SavedNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [noteListViewMode, setNoteListViewMode] = useState<'bands' | 'setlists'>('bands');
  
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

  const [isAddingNewBand, setIsAddingNewBand] = useState(false);
  const [isAddingNewSetlist, setIsAddingNewSetlist] = useState(false);
  const [isPasteJsonDialogOpen, setIsPasteJsonDialogOpen] = useState(false);
  const [jsonToPaste, setJsonToPaste] = useState('');
  const [chordPickerStep, setChordPickerStep] = useState<'letter' | 'accidental' | 'quality'>('letter');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mg30_studio_notes');
    let localParsed: SavedNote[] = [];
    if (stored) {
      try {
        localParsed = JSON.parse(stored);
        setLocalNotes(localParsed);
      } catch (e) {
        console.error(e);
      }
    }

    if (userLoading) return;

    if (!user) {
      setSavedNotes(localParsed);
      return;
    }

    const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
        setSavedNotes(notes);
      },
      (err) => {
        console.error("Firestore sync error:", err);
      }
    );

    return () => unsubscribe();
  }, [user, userLoading, firestore]);

  const handleMigrateNotes = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(firestore);
      localNotes.forEach(note => {
        const newDocRef = doc(collection(firestore, "notes"));
        const { id, ...noteData } = note;
        batch.set(newDocRef, { ...noteData, userId: user.uid });
      });
      await batch.commit();
      localStorage.removeItem('mg30_studio_notes');
      setLocalNotes([]);
      setIsMigrationDialogOpen(false);
      toast({ title: "Migrazione completata" });
    } catch (err) {
      toast({ title: "Errore migrazione", variant: "destructive" });
    }
  };

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

  const setlistOnlyNotes = useMemo(() => {
    const groups: Record<string, SavedNote[]> = {};
    savedNotes.forEach(note => {
      const s = note.setlist || 'Senza Scaletta';
      if (!groups[s]) groups[s] = [];
      groups[s].push(note);
    });
    return groups;
  }, [savedNotes]);

  const existingBands = useMemo(() => Object.keys(groupedNotes).filter(b => b !== 'Senza Band'), [groupedNotes]);
  const existingSetlists = useMemo(() => {
    if (!band || !groupedNotes[band]) return [];
    return Object.keys(groupedNotes[band]).filter(s => s !== 'Senza Scaletta');
  }, [band, groupedNotes]);

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

  const handleSaveNote = async () => {
    if (!title.trim()) {
      toast({ title: "Titolo mancante", variant: "destructive" });
      return;
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      toast({ title: "Login richiesto per il salvataggio cloud", variant: "destructive" });
      return;
    }

    const noteData = {
      title,
      band: band || 'Senza Band',
      setlist: setlist || 'Senza Scaletta',
      presetSlot: selectedPresetSlot,
      generalNotes,
      sections,
      updatedAt: user ? serverTimestamp() : new Date().toISOString(),
      userId: user?.uid || 'local-dev-user'
    };

    if (user) {
      try {
        if (selectedNoteId && !selectedNoteId.startsWith('local-')) {
          await updateDoc(doc(firestore, "notes", selectedNoteId), noteData);
        } else {
          const docRef = await addDoc(collection(firestore, "notes"), noteData);
          setSelectedNoteId(docRef.id);
        }
        setEditMode(false);
        toast({ title: "Nota Salvata nel Cloud" });
      } catch (err) {
        toast({ title: "Errore salvataggio cloud", variant: "destructive" });
      }
    } else if (isDev) {
      const id = selectedNoteId || `local-${Date.now()}`;
      const newNote = { ...noteData, id };
      const updatedLocalNotes = selectedNoteId 
        ? localNotes.map(n => n.id === id ? newNote : n)
        : [...localNotes, newNote];
      
      setLocalNotes(updatedLocalNotes);
      localStorage.setItem('mg30_studio_notes', JSON.stringify(updatedLocalNotes));
      setSavedNotes(updatedLocalNotes);
      setSelectedNoteId(id);
      setEditMode(false);
      toast({ title: "Nota Salvata Localmente (Dev Mode)" });
    }
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
    if (note.presetSlot && status === 'connected') sendProgramChange(parseInt(note.presetSlot) - 1);
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDev = process.env.NODE_ENV === 'development';
    
    if (id.startsWith('local-')) {
      const updatedLocalNotes = localNotes.filter(n => n.id !== id);
      setLocalNotes(updatedLocalNotes);
      localStorage.setItem('mg30_studio_notes', JSON.stringify(updatedLocalNotes));
      if (!user) setSavedNotes(updatedLocalNotes);
      if (selectedNoteId === id) handleNewNote();
      toast({ title: "Nota locale eliminata" });
      return;
    }

    if (!user) return;
    try {
      await deleteDoc(doc(firestore, "notes", id));
      if (selectedNoteId === id) handleNewNote();
      toast({ title: "Nota eliminata dal cloud" });
    } catch (err) {
      toast({ title: "Errore eliminazione cloud", variant: "destructive" });
    }
  };

  const handleImportJson = () => {
    try {
      const data = JSON.parse(jsonToPaste);
      if (data.title) setTitle(data.title);
      if (data.generalNotes) setGeneralNotes(data.generalNotes);
      if (data.sections) setSections(data.sections);
      setIsPasteJsonDialogOpen(false);
      setJsonToPaste('');
      toast({ title: "JSON Importato" });
    } catch (e) {
      toast({ title: "JSON non valido", variant: "destructive" });
    }
  };

  const sectionTypes: SectionType[] = ["Intro", "Verse", "Chorus", "Bridge", "Strum", "Out", "Solo"];

  const ChordPicker = ({ sectionId }: { sectionId: string }) => {
    const handleLetterSelect = (letter: string) => { setSelectedLetter(letter); setChordPickerStep('accidental'); };
    const handleAccidentalSelect = (root: string) => { setSelectedRoot(root); setChordPickerStep('quality'); };
    const handleQualitySelect = (chord: string) => { addChordToSection(sectionId, chord); setChordPickerStep('letter'); };
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
          <div className="grid grid-cols-3 gap-2">
            {CHORD_ROOTS.filter(r => r.startsWith(selectedLetter!)).map(r => (
              <Button key={r} variant="outline" size="sm" onClick={() => handleAccidentalSelect(r)} className="font-bold">{r}</Button>
            ))}
          </div>
        )}
        {chordPickerStep === 'quality' && selectedRoot && (
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
            {CHORD_TABLE[selectedRoot]?.map((chord, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => handleQualitySelect(chord)} className="text-xs font-bold truncate">{chord}</Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const NoteList = () => (
    <div className="flex flex-col h-full bg-background/95 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 md:w-5 md:h-5" /> Archivio
        </h3>
        <Button variant="outline" size="icon" className="h-9 w-9 md:h-11 md:w-11 rounded-full border-primary/20" onClick={handleNewNote}><Plus className="w-5 h-5 md:w-6 md:h-6" /></Button>
      </div>

      <Tabs value={noteListViewMode} onValueChange={(v) => setNoteListViewMode(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/30 h-10 md:h-12 p-1">
          <TabsTrigger value="bands" className="text-[12px] md:text-[14px] font-bold gap-2"><UserSquare2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> Band</TabsTrigger>
          <TabsTrigger value="setlists" className="text-[12px] md:text-[14px] font-bold gap-2"><ListMusic className="w-3.5 h-3.5 md:w-4 md:h-4" /> Scalette</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1">
        {noteListViewMode === 'bands' ? (
          <Accordion type="multiple" defaultValue={band ? [`band-${band}`] : []} className="w-full">
            {Object.entries(groupedNotes).map(([bandName, setlists]) => (
              <AccordionItem key={bandName} value={`band-${bandName}`} className="border-none mb-3">
                <AccordionTrigger hideIcon className="hover:no-underline py-3 bg-secondary/30 px-4 rounded-xl flex-1 border border-border/40">
                  <div className="flex items-center gap-3 text-base md:text-lg font-bold uppercase tracking-tight text-primary text-left">
                    <UserSquare2 className="w-5 h-5 md:w-6 md:h-6 shrink-0 opacity-70" /> <span>{bandName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <Accordion type="multiple" defaultValue={setlist ? [`set-${bandName}-${setlist}`] : []} className="w-full ml-4 border-l-2 border-primary/10 pl-4 space-y-2">
                    {Object.entries(setlists).map(([setName, notes]) => (
                      <AccordionItem key={setName} value={`set-${bandName}-${setName}`} className="border-none">
                        <AccordionTrigger hideIcon className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-[13px] md:text-[15px] font-bold uppercase tracking-widest text-muted-foreground text-left">
                            <Music2 className="w-4 h-4 md:w-5 md:h-5 opacity-60" /> <span>{setName}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1">
                          <div className="space-y-1.5">
                            {notes.map((note) => (
                              <div key={note.id} onClick={() => loadNote(note)} className={cn("group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border", selectedNoteId === note.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-card/40 border-border/50 hover:bg-secondary/40")}>
                                <span className="text-[14px] md:text-[16px] font-bold truncate">{note.title}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => deleteNote(note.id, e)}><Trash2 className="w-4 h-4" /></Button>
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
        ) : (
          <Accordion type="multiple" defaultValue={setlist ? [`setlist-only-${setlist}`] : []} className="w-full space-y-3">
            {Object.entries(setlistOnlyNotes).map(([setName, notes]) => (
              <AccordionItem key={setName} value={`setlist-only-${setName}`} className="border-none">
                <AccordionTrigger hideIcon className="hover:no-underline py-3 bg-secondary/30 px-4 rounded-xl flex-1 border border-border/40">
                  <div className="flex items-center gap-3 text-base md:text-lg font-bold uppercase tracking-tight text-primary text-left">
                    <ListMusic className="w-5 h-5 md:w-6 md:h-6 shrink-0 opacity-70" /> <span>{setName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 ml-4 border-l-2 border-primary/10 pl-4">
                  <div className="space-y-1.5">
                    {notes.map((note) => (
                      <div key={note.id} onClick={() => loadNote(note)} className={cn("group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border", selectedNoteId === note.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-card/40 border-border/50 hover:bg-secondary/40")}>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[14px] md:text-[16px] font-bold truncate">{note.title}</span>
                          <span className="text-[11px] md:text-[13px] opacity-60 truncate">{note.band}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => deleteNote(note.id, e)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[calc(100vh-140px)]">
        <aside className="hidden md:flex w-72 flex-col border-r border-border pr-6 shrink-0 h-[calc(100vh-160px)]">
          <NoteList />
        </aside>

        <main className="flex-1 space-y-6 max-w-2xl mx-auto md:mx-0 w-full pb-20">
          <header className="flex items-center justify-between gap-4 py-4 border-b border-border/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden text-primary">
                    <NotebookPen className="w-7 h-7" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 border-none">
                  <NoteList />
                </SheetContent>
              </Sheet>
              <div className="flex flex-col flex-1 min-w-0">
                {editMode ? (
                  <Input placeholder="Titolo Brano..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-black h-10 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 text-primary" />
                ) : (
                  <h2 onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="text-xl font-black text-primary truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2">
                    {title || "Scegli un brano..."}
                    {selectedNoteId && (isDetailsOpen ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />)}
                  </h2>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isPasteJsonDialogOpen} onOpenChange={setIsPasteJsonDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground rounded-full hover:bg-secondary/40" title="Importa JSON">
                    <FileJson className="w-6 h-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Importa Nota da JSON</DialogTitle><DialogDescription>Incolla qui il codice JSON per importare il brano.</DialogDescription></DialogHeader>
                  <Textarea value={jsonToPaste} onChange={(e) => setJsonToPaste(e.target.value)} placeholder='{"title": "...", "sections": [...]}' className="min-h-[200px] font-mono text-xs" />
                  <DialogFooter><Button onClick={handleImportJson}>Importa Ora</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              {!editMode && selectedNoteId && (
                <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} className="h-10 w-10 text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary" title="Modifica">
                  <Pencil className="w-6 h-6" />
                </Button>
              )}
              {editMode && selectedNoteId && (
                <Button variant="ghost" size="icon" onClick={() => setEditMode(false)} className="h-10 w-10 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive" title="Annulla">
                  <X className="w-6 h-6" />
                </Button>
              )}
              {editMode && (
                <Button onClick={handleSaveNote} size="icon" className="h-10 w-10 bg-primary shadow-lg rounded-full" title="Salva">
                  <Save className="w-6 h-6" />
                </Button>
              )}
            </div>
          </header>

          <div className="space-y-6">
            {(editMode || isDetailsOpen) && (
              <div className="space-y-4 p-4 rounded-xl bg-secondary/20 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter ml-1">Hardware Preset</label>
                  <Select value={selectedPresetSlot} onValueChange={handlePresetChange} disabled={!editMode}>
                    <SelectTrigger className="w-full h-10 bg-background/50 border-border font-mono text-xs"><SelectValue placeholder="Collega a Slot MG-30" /></SelectTrigger>
                    <SelectContent>
                      {devicePresets.map((p) => (
                        <SelectItem key={p.slot} value={p.slot.toString()}>{p.slot}: {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter ml-1">Band</label>
                    {isAddingNewBand ? (
                      <Input placeholder="Nome Band..." value={band} onChange={(e) => setBand(e.target.value)} className="h-10 text-sm bg-background/50" autoFocus />
                    ) : (
                      <Select value={band} onValueChange={(val) => val === 'NEW' ? setIsAddingNewBand(true) : setBand(val)} disabled={!editMode}>
                        <SelectTrigger className="h-10 text-sm bg-background/50"><SelectValue placeholder="Scegli Band" /></SelectTrigger>
                        <SelectContent>
                          {existingBands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          {editMode && <SelectItem value="NEW" className="font-bold text-primary">+ Nuova...</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter ml-1">Scaletta</label>
                    {isAddingNewSetlist ? (
                      <Input placeholder="Nome Scaletta..." value={setlist} onChange={(e) => setSetlist(e.target.value)} className="h-10 text-sm bg-background/50" autoFocus />
                    ) : (
                      <Select value={setlist} disabled={!band || !editMode} onValueChange={(val) => val === 'NEW' ? setIsAddingNewSetlist(true) : setSetlist(val)}>
                        <SelectTrigger className="h-10 text-sm bg-background/50"><SelectValue placeholder="Scaletta" /></SelectTrigger>
                        <SelectContent>
                          {existingSetlists.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          {editMode && <SelectItem value="NEW" className="font-bold text-primary">+ Nuova...</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-9 text-[10px] font-black uppercase tracking-widest bg-secondary/30 rounded-xl px-4 border border-border/30">
                  <span>Note Generali</span>
                  {isNotesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea 
                  placeholder="Scrivi qui i dettagli del brano, accordatura, ecc..." 
                  className="min-h-[140px] text-[14px] md:text-[16px] bg-card/30 border-border/50 resize-none leading-relaxed p-4" 
                  value={generalNotes} 
                  onChange={(e) => setGeneralNotes(e.target.value)} 
                  readOnly={!editMode}
                />
              </CollapsibleContent>
            </Collapsible>

            <Card className="border-border shadow-xl bg-card/40 rounded-2xl overflow-hidden">
              <CardHeader className="py-3 bg-secondary/40 flex flex-row items-center justify-between px-5 border-b border-border/40">
                <CardTitle className="text-[11px] uppercase tracking-widest font-black text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Struttura Brano
                </CardTitle>
                {editMode && (
                  <Button variant="outline" size="sm" onClick={addSection} className="h-8 text-[10px] font-bold bg-background/50"><Plus className="w-3 h-3 mr-1" /> Sezione</Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {sections.map((section) => (
                      <TableRow key={section.id} className="hover:bg-transparent border-b border-border/20 last:border-0">
                        <TableCell className="p-3 w-[100px] align-top">
                          <Badge variant="secondary" className="w-full justify-center h-8 text-[11px] font-black uppercase tracking-tighter bg-primary/10 text-primary border-primary/20">
                            {section.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 flex-1">
                          <div className="flex flex-col gap-3 min-h-[44px]">
                            <div className="flex flex-wrap gap-2">
                              {section.chords?.map((chord, i) => {
                                const positions = getChordPositions(chord);
                                return (
                                  <Tooltip key={i}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="h-8 px-3 text-[18px] font-black bg-background border-primary/30 text-primary shadow-sm cursor-help">
                                        {chord}
                                        {editMode && <X className="w-3 h-3 ml-2 opacity-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeChordFromSection(section.id, i); }} />}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-3 bg-card border-primary/40">
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase text-primary border-b border-primary/20 pb-1">Tabella posizioni accordi</p>
                                        <div className="space-y-1">
                                          {positions ? positions.map((pos, idx) => (
                                            <div key={idx} className="flex items-center gap-2 font-mono text-[11px]">
                                              <span className="text-muted-foreground w-4">{idx + 1}.</span>
                                              <span className="text-foreground font-bold">{pos}</span>
                                            </div>
                                          )) : <p className="text-[10px] italic opacity-60">Nessuna posizione trovata</p>}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                            {editMode ? (
                              <Input 
                                value={section.text} 
                                onChange={(e) => updateSectionText(section.id, e.target.value)} 
                                placeholder="Note blocco..." 
                                className="h-8 text-[18px] md:text-[20px] border-none bg-transparent p-0 italic text-muted-foreground focus-visible:ring-0" 
                              />
                            ) : (
                              <p className="text-[18px] md:text-[20px] font-black leading-tight whitespace-pre-wrap">{section.text}</p>
                            )}
                          </div>
                        </TableCell>
                        {editMode && (
                          <TableCell className="p-3 w-auto flex items-center gap-2 align-top">
                            <Popover onOpenChange={(open) => !open && setChordPickerStep('letter')}>
                              <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-primary/20 text-primary"><Plus className="w-5 h-5" /></Button></PopoverTrigger>
                              <PopoverContent className="w-72 p-4" align="end"><ChordPicker sectionId={section.id} /></PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/30 hover:text-destructive" onClick={() => removeSection(section.id)}><Trash2 className="w-5 h-5" /></Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Carica nel Cloud</DialogTitle><DialogDescription>Sincronizza le note locali col tuo account Google.</DialogDescription></DialogHeader><DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setIsMigrationDialogOpen(false)}>Mantieni Locali</Button><Button onClick={handleMigrateNotes}>Sincronizza</Button></DialogFooter></DialogContent>
      </Dialog>
    </AppShell>
  );
}
