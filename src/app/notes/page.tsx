
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
import { Plus, Trash2, NotebookPen, ChevronDown, ChevronUp, Save, Music2, Users, Layers, Pencil, X, FileJson, Check, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

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
  date: any;
  userId?: string;
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
  const { user } = useUser();
  
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

  // States for dynamic band/setlist selection
  const [isAddingNewBand, setIsAddingNewBand] = useState(false);
  const [isAddingNewSetlist, setIsAddingNewSetlist] = useState(false);

  const [isPasteJsonDialogOpen, setIsPasteJsonDialogOpen] = useState(false);
  const [jsonToPaste, setJsonToPaste] = useState('');

  const [chordPickerStep, setChordPickerStep] = useState<'letter' | 'accidental' | 'quality'>('letter');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

  // States for renaming groups
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameType, setRenameType] = useState<'band' | 'setlist'>('band');
  const [renameOldValue, setRenameOldValue] = useState('');
  const [renameNewValue, setRenameNewValue] = useState('');
  const [renameParentBand, setRenameParentBand] = useState('');

  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('mg30_studio_notes');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSavedNotes(parsed);
        } catch (e) {
          console.error("Failed to parse notes", e);
        }
      }
      return;
    }

    const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedNote));
      setSavedNotes(notes);
    }, (err) => {
      console.error("Firestore sync error:", err);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('mg30_studio_notes', JSON.stringify(savedNotes));
    }
  }, [savedNotes, user]);

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
      toast({ title: "Titolo mancante", description: "Inserisci un titolo per il brano.", variant: "destructive" });
      return;
    }

    const noteData = {
      title,
      band: band || 'Senza Band',
      setlist: setlist || 'Senza Scaletta',
      presetSlot: selectedPresetSlot,
      generalNotes,
      sections,
      updatedAt: serverTimestamp(),
      userId: user?.uid || null
    };

    try {
      if (user) {
        if (selectedNoteId) {
          await updateDoc(doc(firestore, "notes", selectedNoteId), noteData);
        } else {
          await addDoc(collection(firestore, "notes"), noteData);
        }
      } else {
        const newNote: SavedNote = {
          ...noteData,
          id: selectedNoteId || Math.random().toString(),
          date: new Date().toISOString()
        };
        if (selectedNoteId) {
          setSavedNotes(savedNotes.map(n => n.id === selectedNoteId ? newNote : n));
        } else {
          setSavedNotes([newNote, ...savedNotes]);
          setSelectedNoteId(newNote.id);
        }
      }
      setEditMode(false);
      setIsAddingNewBand(false);
      setIsAddingNewSetlist(false);
      toast({ title: "Nota Salvata" });
    } catch (err) {
      toast({ title: "Errore durante il salvataggio", variant: "destructive" });
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
    setIsDetailsOpen(true);
    setIsAddingNewBand(false);
    setIsAddingNewSetlist(false);
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
    setIsAddingNewBand(false);
    setIsAddingNewSetlist(false);

    if (note.presetSlot && status === 'connected') {
      sendProgramChange(parseInt(note.presetSlot) - 1);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (user) {
        await deleteDoc(doc(firestore, "notes", id));
      } else {
        setSavedNotes(savedNotes.filter(n => n.id !== id));
      }
      if (selectedNoteId === id) handleNewNote();
      toast({ title: "Nota eliminata" });
    } catch (err) {
      toast({ title: "Errore eliminazione", variant: "destructive" });
    }
  };

  const handleRenameGroup = async () => {
    if (!renameNewValue.trim()) return;

    try {
      const batch = user ? writeBatch(firestore) : null;
      const updatedNotes = [...savedNotes];

      savedNotes.forEach((note, index) => {
        let shouldUpdate = false;
        if (renameType === 'band' && note.band === renameOldValue) {
          updatedNotes[index] = { ...note, band: renameNewValue };
          shouldUpdate = true;
        } else if (renameType === 'setlist' && note.band === renameParentBand && note.setlist === renameOldValue) {
          updatedNotes[index] = { ...note, setlist: renameNewValue };
          shouldUpdate = true;
        }

        if (shouldUpdate && batch && user) {
          batch.update(doc(firestore, "notes", note.id), {
            [renameType === 'band' ? 'band' : 'setlist']: renameNewValue,
            updatedAt: serverTimestamp()
          });
        }
      });

      if (batch && user) {
        await batch.commit();
      } else {
        setSavedNotes(updatedNotes);
      }

      // Update current form if needed
      if (renameType === 'band' && band === renameOldValue) setBand(renameNewValue);
      if (renameType === 'setlist' && band === renameParentBand && setlist === renameOldValue) setSetlist(renameNewValue);

      setRenameDialogOpen(false);
      setRenameNewValue('');
      toast({ title: "Ridenominazione completata" });
    } catch (err) {
      console.error(err);
      toast({ title: "Errore ridenominazione", variant: "destructive" });
    }
  };

  const openRenameDialog = (e: React.MouseEvent, type: 'band' | 'setlist', oldValue: string, parentBand?: string) => {
    e.stopPropagation();
    setRenameType(type);
    setRenameOldValue(oldValue);
    setRenameNewValue(oldValue);
    setRenameParentBand(parentBand || '');
    setRenameDialogOpen(true);
  };

  const handleApplyPasteJson = () => {
    try {
      const json = JSON.parse(jsonToPaste);
      if (!json.sections || !Array.isArray(json.sections)) throw new Error("Manca 'sections'");
      setTitle(json.title || title);
      setBand(json.band || band);
      setSetlist(json.setlist || setlist);
      setSelectedPresetSlot(json.presetSlot || selectedPresetSlot);
      setGeneralNotes(json.generalNotes || generalNotes);
      setSections(json.sections.map((s: any) => ({
        id: s.id || Math.random().toString(),
        type: s.type || 'Verse',
        text: s.text || '',
        chords: Array.isArray(s.chords) ? s.chords : []
      })));
      setEditMode(true);
      setIsPasteJsonDialogOpen(false);
      setJsonToPaste('');
      toast({ title: "JSON Applicato" });
    } catch (err: any) {
      toast({ title: "Errore JSON", description: err.message, variant: "destructive" });
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

    const availableAccidentals = selectedLetter ? CHORD_ROOTS.filter(r => r.startsWith(selectedLetter)) : [];

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
          <Layers className="w-3 h-3" /> Archivio {!user && <Badge variant="outline" className="text-[8px]">Locale</Badge>}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNewNote}><Plus className="w-3 h-3" /></Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="pr-2 pb-8">
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedNotes).map(([bandName, setlists]) => (
              <AccordionItem key={bandName} value={`band-${bandName}`} className="border-none mb-2">
                <div className="flex items-center group/band pr-2">
                  <AccordionTrigger hideIcon className="hover:no-underline py-2 bg-secondary/20 px-3 rounded-lg flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-primary text-left">
                      <Users className="w-3 h-3 shrink-0" /> <span className="truncate">{bandName}</span>
                    </div>
                  </AccordionTrigger>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover/band:opacity-100 transition-opacity ml-1"
                    onClick={(e) => openRenameDialog(e, 'band', bandName)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
                <AccordionContent className="pt-2">
                  <Accordion type="multiple" className="w-full ml-3 border-l border-primary/20 pl-3">
                    {Object.entries(setlists).map(([setName, notes]) => (
                      <AccordionItem key={setName} value={`set-${bandName}-${setName}`} className="border-none mb-1">
                        <div className="flex items-center group/set pr-2">
                          <AccordionTrigger hideIcon className="hover:no-underline py-1.5 flex-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">
                              <Music2 className="w-3 h-3 shrink-0" /> <span className="truncate">{setName}</span>
                            </div>
                          </AccordionTrigger>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 opacity-0 group-hover/set:opacity-100 transition-opacity ml-1"
                            onClick={(e) => openRenameDialog(e, 'setlist', setName, bandName)}
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                        <AccordionContent className="pt-1">
                          <div className="space-y-1 ml-2">
                            {notes.map((note) => (
                              <div key={note.id} onClick={() => loadNote(note)} className={cn("group flex flex-col p-2.5 rounded-md cursor-pointer transition-all border", selectedNoteId === note.id ? "bg-primary/10 border-primary/40 text-primary shadow-sm" : "bg-card/40 border-border hover:border-primary/20")}>
                                <span className="text-[11px] font-semibold truncate mb-1">{note.title}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => deleteNote(note.id, e)}><Trash2 className="w-3 h-3" /></Button>
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
                  <SheetHeader className="text-left mb-4"><SheetTitle>Archivio Note</SheetTitle></SheetHeader>
                  <NoteList />
                </SheetContent>
              </Sheet>
              <Input placeholder="Titolo Brano..." value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm font-bold h-8 bg-transparent border-none shadow-none focus-visible:ring-0 p-0" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsPasteJsonDialogOpen(true)} title="Incolla JSON" className="h-8 w-8 text-muted-foreground hover:text-primary"><FileJson className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setEditMode(!editMode)} className={cn("h-8 w-8", editMode ? "text-primary bg-primary/10" : "text-muted-foreground")}><Pencil className="w-4 h-4" /></Button>
              <Button onClick={handleSaveNote} size="icon" className="h-8 w-8 bg-primary shadow-md"><Save className="w-4 h-4" /></Button>
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
                        {isAddingNewBand ? (
                          <div className="flex gap-1">
                            <Input 
                              placeholder="Nome Band..." 
                              value={band} 
                              onChange={(e) => setBand(e.target.value)} 
                              className="h-8 text-xs bg-background/50 flex-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAddingNewBand(false)}>
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value={band} 
                            onValueChange={(val) => {
                              if (val === 'NEW_BAND') {
                                setBand('');
                                setIsAddingNewBand(true);
                              } else {
                                setBand(val);
                                setSetlist(''); // Reset setlist when band changes
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                              <SelectValue placeholder="Scegli Band" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingBands.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                              <SelectItem value="NEW_BAND" className="font-bold text-primary italic">+ Nuova Band...</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Scaletta</label>
                        {isAddingNewSetlist ? (
                          <div className="flex gap-1">
                            <Input 
                              placeholder="Nome Scaletta..." 
                              value={setlist} 
                              onChange={(e) => setSetlist(e.target.value)} 
                              className="h-8 text-xs bg-background/50 flex-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAddingNewSetlist(false)}>
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value={setlist} 
                            disabled={!band && !isAddingNewBand}
                            onValueChange={(val) => {
                              if (val === 'NEW_SETLIST') {
                                setSetlist('');
                                setIsAddingNewSetlist(true);
                              } else {
                                setSetlist(val);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/50">
                              <SelectValue placeholder={!band && !isAddingNewBand ? "Scegli prima Band" : "Scegli Scaletta"} />
                            </SelectTrigger>
                            <SelectContent>
                              {existingSetlists.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                              <SelectItem value="NEW_SETLIST" className="font-bold text-primary italic">+ Nuova Scaletta...</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
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
                <Textarea placeholder="Annotazioni libere..." className="min-h-[120px] text-sm bg-background/50 resize-none" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
              </CollapsibleContent>
            </Collapsible>

            <Card className="border-border shadow-md bg-card/50">
              <CardHeader className="py-2 bg-secondary/40 flex flex-row items-center justify-between px-3">
                <CardTitle className="text-[9px] uppercase tracking-widest font-black">Struttura Brano</CardTitle>
                <Button variant="outline" size="sm" onClick={addSection} className="h-6 text-[8px] font-bold uppercase"><Plus className="w-2 h-2 mr-1" /> Sezione</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {sections.map((section) => (
                      <TableRow key={section.id} className="hover:bg-transparent border-b border-border/20">
                        <TableCell className="p-1.5 w-[90px]">
                          <Select value={section.type} onValueChange={(val: SectionType) => updateSectionType(section.id, val)}>
                            <SelectTrigger className="h-8 text-[9px] border-none bg-primary/10 font-black focus:ring-0"><SelectValue /></SelectTrigger>
                            <SelectContent>{sectionTypes.map(type => <SelectItem key={type} value={type} className="text-[10px] uppercase font-bold">{type}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1.5 flex-1 min-w-[200px]">
                          <div className="flex flex-wrap gap-2 items-center min-h-[40px]">
                            {section.chords?.map((chord, i) => (
                              <Badge key={i} variant="secondary" className="h-6 px-2 text-xs font-bold cursor-pointer hover:bg-destructive/10 hover:text-destructive group transition-colors" onClick={() => removeChordFromSection(section.id, i)}>
                                {chord}<X className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                            <Input value={section.text} onChange={(e) => updateSectionText(section.id, e.target.value)} placeholder="Note..." className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 w-auto min-w-[50px] flex-1" />
                          </div>
                        </TableCell>
                        <TableCell className="p-1 w-auto flex items-center gap-1">
                          <Popover onOpenChange={(open) => !open && setChordPickerStep('letter')}>
                            <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 text-primary border-primary/20"><Plus className="w-4 h-4" /></Button></PopoverTrigger>
                            <PopoverContent className="w-64 p-4" align="end"><ChordPicker sectionId={section.id} /></PopoverContent>
                          </Popover>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40" onClick={() => removeSection(section.id)}><Trash2 className="w-3 h-3" /></Button>
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rinomina {renameType === 'band' ? 'Band' : 'Scaletta'}</DialogTitle>
            <DialogDescription>
              Stai rinominando "{renameOldValue}". Tutte le note associate verranno aggiornate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground">Nuovo Nome</label>
              <Input
                id="name"
                value={renameNewValue}
                onChange={(e) => setRenameNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup()}
                className="bg-secondary/20"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleRenameGroup} className="gap-2">
              <Check className="w-4 h-4" /> Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasteJsonDialogOpen} onOpenChange={setIsPasteJsonDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Incolla JSON Preset</DialogTitle><DialogDescription>Incolla qui la configurazione JSON del brano.</DialogDescription></DialogHeader>
          <div className="py-4"><Textarea placeholder='{"title": "...", "sections": [...]}' value={jsonToPaste} onChange={(e) => setJsonToPaste(e.target.value)} className="min-h-[250px] font-mono text-xs bg-secondary/20" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsPasteJsonDialogOpen(false)}>Annulla</Button><Button onClick={handleApplyPasteJson} disabled={!jsonToPaste.trim()}>Applica JSON</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
