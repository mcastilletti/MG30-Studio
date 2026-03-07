
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  NotebookPen, 
  Plus, 
  Trash2,
  Pencil,
  GripVertical,
  Music2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  MouseSensor,
  TouchSensor,
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SavedNote {
  id: string;
  title: string;
  band: string;
  setlist: string;
  order?: number;
  updatedAt?: any;
}

const FILTER_BAND_KEY = 'mg30_notes_filter_band';
const FILTER_SETLIST_KEY = 'mg30_notes_filter_setlist';

export default function NotesLibraryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, loading: userLoading } = useUser();
  
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<string | null>(null);

  const [renameData, setRenameData] = useState<{ type: 'band' | 'setlist', oldName: string, parentBand?: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Caricamento filtri persistenti
  useEffect(() => {
    const savedBand = localStorage.getItem(FILTER_BAND_KEY);
    const savedSetlist = localStorage.getItem(FILTER_SETLIST_KEY);
    if (savedBand && savedBand !== 'all') setSelectedBand(savedBand);
    if (savedSetlist && savedSetlist !== 'all') setSelectedSetlist(savedSetlist);
  }, []);

  // Salvataggio filtri persistenti
  useEffect(() => {
    localStorage.setItem(FILTER_BAND_KEY, selectedBand || 'all');
  }, [selectedBand]);

  useEffect(() => {
    localStorage.setItem(FILTER_SETLIST_KEY, selectedSetlist || 'all');
  }, [selectedSetlist]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (userLoading) return;

    const isMockUser = user?.uid === 'dev-user-123';
    
    if (!user || isMockUser) {
      const stored = localStorage.getItem('mg30_studio_notes');
      if (stored) {
        try {
          const notes = JSON.parse(stored);
          const sorted = notes.sort((a: SavedNote, b: SavedNote) => (a.order ?? 0) - (b.order ?? 0));
          setSavedNotes(sorted);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
      const sorted = notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setSavedNotes(sorted);
    });

    return () => unsubscribe();
  }, [user, userLoading, firestore]);

  const filteredNotes = useMemo(() => {
    let notesToFilter = [...savedNotes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (selectedBand) {
      notesToFilter = notesToFilter.filter(n => n.band === selectedBand);
    }
    if (selectedSetlist) {
      notesToFilter = notesToFilter.filter(n => n.setlist === selectedSetlist);
    }
    return notesToFilter;
  }, [savedNotes, selectedBand, selectedSetlist]);

  const bands = useMemo(() => {
    const unique = [...new Set(savedNotes.map(n => n.band || 'Senza Band'))];
    return unique.sort();
  }, [savedNotes]);

  const setlists = useMemo(() => {
    if (!selectedBand) return [];
    const unique = [...new Set(savedNotes.filter(n => n.band === selectedBand).map(n => n.setlist || 'Senza Scaletta'))];
    return unique.sort();
  }, [savedNotes, selectedBand]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (id.startsWith('local-')) {
      const updated = savedNotes.filter(n => n.id !== id);
      setSavedNotes(updated);
      localStorage.setItem('mg30_studio_notes', JSON.stringify(updated));
      toast({ title: "Nota eliminata localmente" });
      return;
    }
    try {
      await deleteDoc(doc(firestore, "notes", id));
      toast({ title: "Nota eliminata dal cloud" });
    } catch (err) {
      toast({ title: "Errore eliminazione", variant: "destructive" });
    }
  };

  const handleMove = async (e: React.MouseEvent, noteId: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = filteredNotes.findIndex(n => n.id === noteId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filteredNotes.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentNote = filteredNotes[index];
    const targetNote = filteredNotes[targetIndex];

    const updatedNotes = savedNotes.map(n => {
      if (n.id === currentNote.id) return { ...n, order: targetNote.order };
      if (n.id === targetNote.id) return { ...n, order: currentNote.order };
      return n;
    });

    const sorted = updatedNotes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setSavedNotes(sorted);

    const isMockUser = user?.uid === 'dev-user-123';
    if (user && !isMockUser) {
      const batch = writeBatch(firestore);
      if (!currentNote.id.startsWith('local-')) {
        batch.update(doc(firestore, "notes", currentNote.id), { order: targetNote.order });
      }
      if (!targetNote.id.startsWith('local-')) {
        batch.update(doc(firestore, "notes", targetNote.id), { order: currentNote.order });
      }
      await batch.commit();
    } else {
      localStorage.setItem('mg30_studio_notes', JSON.stringify(sorted));
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const activeIndex = filteredNotes.findIndex(n => n.id === active.id);
        const overIndex = filteredNotes.findIndex(n => n.id === over.id);
        
        const newFilteredOrdered = arrayMove(filteredNotes, activeIndex, overIndex);
        
        const updatedNotes = [...savedNotes];
        newFilteredOrdered.forEach((note, index) => {
            const globalIdx = updatedNotes.findIndex(n => n.id === note.id);
            if (globalIdx !== -1) {
                updatedNotes[globalIdx] = { ...updatedNotes[globalIdx], order: index };
            }
        });

        const sortedGlobal = updatedNotes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSavedNotes(sortedGlobal);
        
        const isMockUser = user?.uid === 'dev-user-123';
        if (user && !isMockUser) {
            const batch = writeBatch(firestore);
            newFilteredOrdered.forEach((note, index) => {
                if (note.id.startsWith('local-')) return;
                const noteRef = doc(firestore, "notes", note.id);
                batch.update(noteRef, { order: index });
            });
            batch.commit().catch(() => {
                toast({ title: "Errore sincronizzazione ordine cloud", variant: "destructive" });
            });
        } else {
            localStorage.setItem('mg30_studio_notes', JSON.stringify(sortedGlobal));
        }
    }
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-20 px-2 md:px-0">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <NotebookPen className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase">Archivio Note</h2>
          </div>
          <Button onClick={() => router.push('/notes/editor')} size="icon" className="w-11 h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </header>

        <div className="flex flex-col md:flex-row gap-3 items-center bg-card/40 p-3 rounded-2xl border border-border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
            <Select value={selectedBand || 'all'} onValueChange={(v) => { setSelectedBand(v === 'all' ? null : v); setSelectedSetlist(null); }}>
              <SelectTrigger className="h-11 bg-background/50 border-border text-[14px] font-bold">
                <SelectValue placeholder="Tutte le band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le band</SelectItem>
                {bands.map(band => <SelectItem key={band} value={band}>{band}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSetlist || 'all'} onValueChange={(v) => setSelectedSetlist(v === 'all' ? null : v)} disabled={!selectedBand}>
              <SelectTrigger className="h-11 bg-background/50 border-border text-[14px] font-bold">
                <SelectValue placeholder="Tutte le scalette" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le scalette</SelectItem>
                {setlists.map(setlist => <SelectItem key={setlist} value={setlist}>{setlist}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)] rounded-2xl">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <Music2 className="w-12 h-12" />
              <h3 className="text-lg font-bold uppercase">Nessun brano</h3>
              <p className="text-xs">Usa i filtri o aggiungi un nuovo brano</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredNotes.map((note, index) => (
                    <SortableNoteCard 
                      key={note.id} 
                      note={note} 
                      onDelete={(e) => handleDelete(e, note.id)} 
                      onMove={(e, dir) => handleMove(e, note.id, dir)}
                      isFirst={index === 0}
                      isLast={index === filteredNotes.length - 1}
                      onClick={() => router.push(`/notes/editor?id=${note.id}`)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>

        <Dialog open={!!renameData} onOpenChange={(open) => !open && setRenameData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="uppercase font-black">Rinomina Gruppo</DialogTitle>
              <DialogDescription>Stai aggiornando "{renameData?.oldName}" per tutti i brani.</DialogDescription>
            </DialogHeader>
            <div className="py-4"><Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameData(null)}>Annulla</Button>
              <Button onClick={handleRenameGroup} disabled={isRenaming}>{isRenaming ? "..." : "Conferma"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function SortableNoteCard({ note, onDelete, onMove, isFirst, isLast, onClick }: { 
  note: SavedNote; 
  onDelete: (e: React.MouseEvent) => void; 
  onMove: (e: React.MouseEvent, dir: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void; 
}) {
  const { 
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
       <Card 
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-4 p-4 hover:border-orange-500/50 transition-all cursor-pointer bg-card/60 border-border overflow-hidden",
          isDragging && "shadow-2xl shadow-orange-500/30 border-orange-500/50"
        )}
       >
        <div className="flex flex-col gap-1 shrink-0">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8" 
            disabled={isFirst} 
            onClick={(e) => onMove(e, 'up')}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8" 
            disabled={isLast} 
            onClick={(e) => onMove(e, 'down')}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        <div 
          {...attributes} 
          {...listeners} 
          className="p-2 -m-2 text-muted-foreground/30 hover:text-orange-500 cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <CardTitle className="text-[15px] font-black uppercase leading-tight whitespace-pre-wrap">
            {note.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1 opacity-50">
            <span className="text-[10px] font-bold uppercase tracking-widest truncate">{note.band}</span>
            <span className="text-[10px]">•</span>
            <span className="text-[10px] font-bold uppercase tracking-widest truncate">{note.setlist}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
