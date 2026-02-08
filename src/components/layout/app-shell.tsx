
"use client"

import React, { useEffect } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useMidiStore } from '@/stores/use-midi-store';
import { LayoutDashboard, Library, Sliders, Settings, Activity, Zap, Info, Wifi, WifiOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, initialize, syncActivePreset } = useMidiStore();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // All'apertura, se connesso, sincronizza solo lo slot attivo
  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Editor', href: '/editor', icon: Sliders },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'SysEx Analyzer', href: '/tools/sysex-analyzer', icon: Zap },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sliders className="text-primary-foreground w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">MG30 STUDIO</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">NUX EDITOR</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Hardware Status</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[11px] font-medium uppercase">{status}</span>
                    </div>
                    {status === 'connected' ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                  </div>
                  {status === 'connected' && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      NUX MG-30 ready for communication.
                    </p>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 bg-background h-screen">
          <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-[1px] bg-border mx-2" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {navItems.find(i => i.href === pathname)?.label || 'App'}
                </span>
                {status === 'connected' && (
                  <Badge variant="outline" className="text-[10px] h-5 border-green-500/50 text-green-500">
                    USB MIDI ACTIVE
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Help</button>
               <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                 <Info className="w-4 h-4 text-muted-foreground" />
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};
