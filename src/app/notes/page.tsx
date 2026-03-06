
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  NotebookPen, 
  Search, 
  Plus, 
  UserSquare2, 
  ListMusic, 
  Music2, 
  ChevronRight, 
  Trash2,
  Calendar,
  Pencil,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
  const [search, setSearch] = useState('');

  // Rename states
  const [renameData, setRenameData] = useState<{ type: 'band' | 'setlist', oldName: string, parentBand?: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    const isMockUser = user?.uid === 'dev-user-123';
    
    if (!user || isMockUser) {
      const stored = localStorage.getItem('mg30_studio_notes');
      if (stored) {
        try {
          setSavedNotes(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const q = query(collection(firestore, "notes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavedNote));
      setSavedNotes(notes);
    });

    return () => unsubscribe();
  }, [user, userLoading, firestore]);

  const filteredNotes = useMemo(() => {
    return savedNotes.filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.band || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.setlist || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [savedNotes, search]);

  const groupedByBand = useMemo(() => {
    const groups: Record<string, Record<string, SavedNote[]>> = {};
    // Sort all notes by order before grouping
    const sorted = [...filteredNotes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    sorted.forEach(note => {
      const b = note.band || 'Senza Band';
      const s = note.setlist || 'Senza Scaletta';
      if (!groups[b]) groups[b] = {};
      if (!groups[b][s]) groups[b][s] = [];
      groups[b][s].push(note);
    });
    return groups;
  }, [filteredNotes]);

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

  const handleMoveNote = async (noteId: string, direction: 'up' | 'down', bandName: string, setName: string) => {
    const setNotes = savedNotes
      .filter(n => n.band === bandName && n.setlist === setName)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const index = setNotes.findIndex(n => n.id === noteId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= setNotes.length) return;

    const updatedNotesList = [...setNotes];
    const temp = updatedNotesList[index];
    updatedNotesList[index] = updatedNotesList[targetIndex];
    updatedNotesList[targetIndex] = temp;

    const reorderedSet = updatedNotesList.map((note, i) => ({
      ...note,
      order: i
    }));

    const isMockUser = user?.uid === 'dev-user-123';
    if (user && !isMockUser) {
      try {
        const batch = writeBatch(firestore);
        reorderedSet.forEach(note => {
          batch.update(doc(firestore, "notes", note.id), { order: note.order });
        });
        await batch.commit();
      } catch (err) {
        toast({ title: "Errore durante lo spostamento cloud", variant: "destructive" });
        return;
      }
    } else {
      const allUpdated = savedNotes.map(n => {
        const found = reorderedSet.find(rn => rn.id === n.id);
        return found ? found : n;
      });
      setSavedNotes(allUpdated);
      localStorage.setItem('mg30_studio_notes', JSON.stringify(allUpdated));
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <NotebookPen className="w-10 h-10 text-orange-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight uppercase">Archivio Note</h2>
              <p className="text-muted-foreground text-base">Gestisci scalette, brani e accordi per i tuoi live.</p>
            </div>
          </div>
          <Button onClick={() => router.push('/notes/editor')} className="h-14 px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold gap-3 rounded-2xl shadow-lg shadow-orange-900/20">
            <Plus className="w-6 h-6" /> NUOVO BRANO
          </Button>
        </header>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Cerca brano, band o scaletta..." 
              className="pl-12 h-12 bg-background/50 border-border text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)] rounded-2xl pr-4">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <Music2 className="w-16 h-16" />
              <h3 className="text-xl font-bold uppercase">Nessun brano trovato</h3>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(groupedByBand)} className="space-y-4">
              {Object.entries(groupedByBand).map(([bandName, setlists]) => (
                <AccordionItem key={bandName} value={bandName} className="border-none bg-secondary/10 rounded-2xl overflow-hidden">
                  <div className="flex items-center group/band">
                    <AccordionTrigger className="flex-1 px-6 py-5 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <UserSquare2 className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xl font-black uppercase tracking-tight">{bandName}</h4>
                          <p className="text-sm text-muted-foreground">{Object.keys(setlists).length} Scalette caricate</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mx-4 opacity-0 group-hover/band:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameData({ type: 'band', oldName: bandName });
                        setNewName(bandName);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  <AccordionContent className="px-3 md:px-6 pb-6 pt-2">
                    <div className="space-y-6 ml-2 md:ml-4 border-l-2 border-primary/20 pl-3 md:pl-6">
                      {Object.entries(setlists).map(([setName, notes]) => (
                        <div key={setName} className="space-y-3">
                          <div className="flex items-center gap-4 group/setlist">
                            <h5 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {notes.map((note, noteIndex) => (
                              <NoteCard 
                                key={note.id} 
                                note={note} 
                                onDelete={(e) => handleDelete(e, note.id)} 
                                onClick={() => router.push(`/notes/editor?id=${note.id}`)}
                                onMoveUp={() => handleMoveNote(note.id, 'up', bandName, setName)}
                                onMoveDown={() => handleMoveNote(note.id, 'down', bandName, setName)}
                                isFirst={noteIndex === 0}
                                isLast={noteIndex === notes.length - 1}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>

        {/* Rename Dialog */}
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

function NoteCard({ 
  note, 
  onDelete, 
  onClick, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast 
}: { 
  note: SavedNote, 
  onDelete: (e: React.MouseEvent) => void, 
  onClick: () => void,
  onMoveUp: () => void,
  onMoveDown: () => void,
  isFirst: boolean,
  isLast: boolean
}) {
  return (
    <Card 
      onClick={onClick}
      className="group relative hover:border-orange-500/50 transition-all cursor-pointer bg-card/60 border-border overflow-hidden"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" className="text-[10px] font-bold tracking-widest uppercase bg-orange-500/10 text-orange-500">
            {note.id.startsWith('local-') ? 'LOCALE' : 'CLOUD'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-start gap-3">
          {/* Frecce a sinistra */}
          <div className="flex flex-col gap-1.5 shrink-0">
             <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary bg-background/40 disabled:opacity-20 shadow-sm" 
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary bg-background/40 disabled:opacity-20 shadow-sm" 
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          
          <CardTitle className="text-lg font-black uppercase leading-tight pt-1 whitespace-normal">
            {note.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserSquare2 className="w-3.5 h-3.5" /> <span className="truncate">{note.band}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListMusic className="w-3.5 h-3.5" /> <span className="truncate">{note.setlist}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/30 bg-secondary/20">
        <div className="flex items-center justify-between w-full">
           <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Note</span>
           <ChevronRight className="w-4 h-4 text-orange-500" />
        </div>
      </CardFooter>
    </Card>
  );
}
