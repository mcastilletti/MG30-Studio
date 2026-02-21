
"use client"

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { Database, ShieldCheck, Info, ExternalLink, AlertCircle, Globe } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Impostazioni</h2>
          <p className="text-muted-foreground">Gestione account, cloud storage e preferenze hardware.</p>
        </header>

        {!user && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-500 font-bold">Autenticazione Richiesta</AlertTitle>
            <AlertDescription className="text-xs">
              Effettua il login con Google dalla barra laterale per attivare il backup cloud dei tuoi preset e delle tue note.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Cloud Storage (Spark Plan)
              </CardTitle>
              <CardDescription>Stato del tuo piano gratuito Firebase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium uppercase">Firestore Database</span>
                <Badge variant="outline" className="text-green-500 border-green-500/30">ATTIVO (GRATUITO)</Badge>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="flex justify-between text-[10px] mb-1 font-bold text-muted-foreground uppercase">
                  <span>Utilizzo Spazio</span>
                  <span>1 GB Limite Gratuito</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[1%]" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Il piano **Spark** di Firebase è gratuito. Include 1GB di database e 5GB di storage per i file.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Sicurezza Account
              </CardTitle>
              <CardDescription>Protezione dei tuoi dati personali</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <div className="space-y-2">
                  <p className="text-xs">Accesso effettuato come:</p>
                  <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded border border-border">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-mono text-xs truncate">{user.email}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    I tuoi dati sono cifrati e accessibili solo tramite il tuo account Google.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground italic">Effettua il login per sincronizzare i dati.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-500 uppercase tracking-widest font-bold">
              <Globe className="w-4 h-4" /> Risoluzione Problemi Login
            </CardTitle>
            <CardDescription>Se ricevi l'errore "unauthorized-domain"</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <p>Se il login fallisce, devi autorizzare l'URL di questo ambiente nella Console di Firebase:</p>
            <ol className="list-decimal ml-4 space-y-2 text-muted-foreground">
              <li>Vai in <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
              <li>Aggiungi il dominio attuale: <code className="bg-secondary px-1 rounded text-primary">{typeof window !== 'undefined' ? window.location.hostname : '...'}</code></li>
            </ol>
            <div className="pt-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold" asChild>
                <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
                  APRI CONSOLE FIREBASE <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" /> Informazioni Generali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">App Version</p>
                <p className="font-mono">1.2.5-stable (Firebase Active)</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Hardware Target</p>
                <p className="font-mono">NUX MG-30 (v3.x)</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <Button variant="link" className="p-0 h-auto text-xs gap-1" asChild>
                <a href="https://github.com/mcastilletti/MG30-Studio" target="_blank" rel="noreferrer">
                  GitHub Repository <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
