
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
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
  UserSquare2, 
  ListMusic, 
  Music2, 
  Trash2,
  Pencil,
  GripVertical,
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

  // Sensori ottimizzati per PC e Android
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Impedisce il drag se si clicca solo un pulsante
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Pressione prolungata per iniziare il drag su mobile
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
    const notesToFilter = [...savedNotes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return notesToFilter.filter(n => {
      const bandMatch = !selectedBand || n.band === selectedBand;
      const setlistMatch = !selectedSetlist || n.setlist === selectedSetlist;
      return bandMatch && setlistMatch;
    });
  }, [savedNotes, selectedBand, selectedSetlist]);

  const groupedByBand = useMemo(() => {
    const groups: Record<string, Record<string, SavedNote[]>> = {};
    const sourceNotes = selectedBand ? filteredNotes : savedNotes;
    
    sourceNotes.forEach(note => {
      const b = note.band || 'Senza Band';
      const s = note.setlist || 'Senza Scaletta';
      if (!groups[b]) groups[b] = {};
      if (!groups[b][s]) groups[b][s] = [];
      groups[b][s].push(note);
    });

    for (const band in groups) {
      for (const setlist in groups[band]) {
        groups[band][setlist].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    }

    return groups;
  }, [filteredNotes, selectedBand, savedNotes]);

  const bands = useMemo(() => [...new Set(savedNotes.map(n => n.band || 'Senza Band'))], [savedNotes]);
  const setlists = useMemo(() => {
    if (!selectedBand) return [];
    return [...new Set(savedNotes.filter(n => n.band === selectedBand).map(n => n.setlist || 'Senza Scaletta'))];
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

  const handleRenameGroup = async () => {
    if (!renameData || !newName.trim()) return;
    setIsRenaming(true);

    const isMockUser = user?.uid === 'dev-user-123';
    const notesToUpdate = savedNotes.filter(n => {
      if (renameData.type === 'band') return n.band === renameData.oldName;
      if (renameData.type === 'setlist') return n.band === renameData.parentBand && n.setlist === renameData.oldName;
      return false;
    });

    try {
      if (user && !isMockUser) {
        const batch = writeBatch(firestore);
        notesToUpdate.forEach(note => {
          const noteRef = doc(firestore, "notes", note.id);
          batch.update(noteRef, {
            [renameData.type]: newName.trim()
          });
        });
        await batch.commit();
      } else {
        const updated = savedNotes.map(n => {
          const match = renameData.type === 'band' 
            ? n.band === renameData.oldName
            : (n.band === renameData.parentBand && n.setlist === renameData.oldName);
          
          if (match) {
            return { ...n, [renameData.type]: newName.trim() };
          }
          return n;
        });
        setSavedNotes(updated);
        localStorage.setItem('mg30_studio_notes', JSON.stringify(updated));
      }

      toast({ 
        title: "Rinominato con successo", 
        description: `${renameData.oldName} -> ${newName}` 
      });
      setRenameData(null);
      setNewName('');
    } catch (err) {
      toast({ title: "Errore durante la rinomina", variant: "destructive" });
    } finally {
      setIsRenaming(false);
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const activeNote = savedNotes.find(n => n.id === active.id);
        const overNote = savedNotes.find(n => n.id === over.id);

        if (!activeNote || !overNote) return;

        // Eseguiamo l'ordinamento all'interno dello stesso contesto (band/setlist)
        const isSameContext = activeNote.band === overNote.band && activeNote.setlist === overNote.setlist;
        if (!isSameContext) return; // Supportiamo il drag solo all'interno della stessa scaletta
        
        const contextNotes = savedNotes.filter(n => n.band === activeNote.band && n.setlist === activeNote.setlist);
        const oldIndex = contextNotes.findIndex(n => n.id === active.id);
        const newIndex = contextNotes.findIndex(n => n.id === over.id);
        
        const newContextOrdered = arrayMove(contextNotes, oldIndex, newIndex);
        const updatedWithOrder = newContextOrdered.map((note, index) => ({ ...note, order: index }));

        const otherNotes = savedNotes.filter(n => !(n.band === activeNote.band && n.setlist === activeNote.setlist));
        const finalNotes = [...otherNotes, ...updatedWithOrder].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        setSavedNotes(finalNotes);
        
        const isMockUser = user?.uid === 'dev-user-123';
        if (user && !isMockUser) {
            const batch = writeBatch(firestore);
            updatedWithOrder.forEach(note => {
                if (note.id.startsWith('local-')) return;
                const noteRef = doc(firestore, "notes", note.id);
                batch.update(noteRef, { order: note.order });
            });
            batch.commit().catch(() => {
                toast({ title: "Errore sincronizzazione ordine cloud", variant: "destructive" });
            });
        } else {
            localStorage.setItem('mg30_studio_notes', JSON.stringify(finalNotes));
        }
    }
  }

  const renderNotesList = (notes: SavedNote[]) => (
    <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
      <div className="grid grid-cols-1 gap-3">
        {notes.map((note) => (
          <SortableNoteCard 
            key={note.id} 
            note={note} 
            onDelete={(e) => handleDelete(e, note.id)} 
            onClick={() => router.push(`/notes/editor?id=${note.id}`)}
          />
        ))}
      </div>
    </SortableContext>
  );

  const hasFilters = selectedBand || selectedSetlist;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-2 md:px-0">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <NotebookPen className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Archivio Note</h2>
          </div>
          <Button onClick={() => router.push('/notes/editor')} size="icon" className="w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-3 rounded-full shadow-lg shadow-orange-900/20">
            <Plus className="w-6 h-6" />
          </Button>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 p-4 rounded-2xl border border-border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <Select value={selectedBand || 'all'} onValueChange={(v) => { setSelectedBand(v === 'all' ? null : v); setSelectedSetlist(null); }}>
              <SelectTrigger className="h-12 bg-background/50 border-border text-base">
                <SelectValue placeholder="Seleziona una band..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le band</SelectItem>
                {bands.map(band => <SelectItem key={band} value={band}>{band}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSetlist || 'all'} onValueChange={(v) => setSelectedSetlist(v === 'all' ? null : v)} disabled={!selectedBand}>
              <SelectTrigger className="h-12 bg-background/50 border-border text-base">
                <SelectValue placeholder="Seleziona una scaletta..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le scalette</SelectItem>
                {setlists.map(setlist => <SelectItem key={setlist} value={setlist}>{setlist}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-320px)] rounded-2xl pr-2 md:pr-4">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <Music2 className="w-16 h-16" />
              <h3 className="text-xl font-bold uppercase">Nessun brano trovato</h3>
              <p className="text-sm text-muted-foreground">Prova a cambiare i filtri di ricerca</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {hasFilters ? renderNotesList(filteredNotes) : (
                <Accordion type="multiple" defaultValue={Object.keys(groupedByBand)} className="space-y-4">
                  {Object.entries(groupedByBand).map(([bandName, setlists]) => (
                    <AccordionItem key={bandName} value={bandName} className="border-none bg-secondary/10 rounded-2xl overflow-hidden">
                      <div className="flex items-center group/band">
                        <AccordionTrigger className="flex-1 px-4 md:px-6 py-5 hover:no-underline hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <UserSquare2 className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="text-left">
                              <h4 className="text-lg md:text-xl font-black uppercase tracking-tight">{bandName}</h4>
                              <p className="text-xs text-muted-foreground">{Object.keys(setlists).length} Scalette caricate</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="mx-2 md:mx-4 opacity-0 group-hover/band:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameData({ type: 'band', oldName: bandName });
                            setNewName(bandName);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                      <AccordionContent className="px-2 md:px-6 pb-6 pt-2">
                        <div className="space-y-6 ml-1 md:ml-4 border-l-2 border-primary/20 pl-3 md:pl-6">
                          {Object.entries(setlists).map(([setName, notes]) => (
                            <div key={setName} className="space-y-3">
                              <div className="flex items-center gap-4 group/setlist">
                                <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                  <ListMusic className="w-4 h-4" /> {setName}
                                </h5>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover/setlist:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameData({ type: 'setlist', oldName: setName, parentBand: bandName });
                                    setNewName(setName);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                              {renderNotesList(notes)}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </DndContext>
          )}
        </ScrollArea>

        <Dialog open={!!renameData} onOpenChange={(open) => !open && setRenameData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="uppercase font-black">
                Rinomina {renameData?.type === 'band' ? 'Band' : 'Scaletta'}
              </DialogTitle>
              <DialogDescription>
                Stai rinominando "{renameData?.oldName}". Tutti i brani associati verranno aggiornati.
              </DialogDescription>
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
              <Button variant="outline" onClick={() => setRenameData(null)}>Annulla</Button>
              <Button onClick={handleRenameGroup} disabled={isRenaming}>
                {isRenaming ? "Rinomina in corso..." : "Conferma"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function SortableNoteCard({ note, onDelete, onClick }: { note: SavedNote; onDelete: (e: React.MouseEvent) => void; onClick: () => void; }) {
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
          "group relative flex items-center gap-3 p-4 hover:border-orange-500/50 transition-all cursor-pointer bg-card/60 border-border overflow-hidden",
          isDragging && "shadow-2xl shadow-orange-500/30 border-orange-500/50"
        )}
       >
        <div 
          {...attributes} 
          {...listeners} 
          className="p-3 -m-3 text-muted-foreground/30 hover:text-orange-500 cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        <CardTitle className="text-sm md:text-base font-black uppercase leading-tight flex-1 whitespace-pre-wrap">
          {note.title}
        </CardTitle>

        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={onDelete}
          >
              <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
