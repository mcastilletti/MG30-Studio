
"use client"

import React, { useEffect, useState } from 'react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useMidiStore } from '@/stores/use-midi-store';
import { LayoutDashboard, Library, Sliders, Settings, Activity, Zap, Info, Wifi, WifiOff, NotebookPen, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { auth, signInWithPopup, googleProvider, signOut } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, initialize, syncActivePreset } = useMidiStore();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      syncActivePreset();
    }
  }, [status, syncActivePreset]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Library', href: '/library', icon: Library },
    { label: 'Editor', href: '/editor', icon: Sliders },
    { label: 'Note', href: '/notes', icon: NotebookPen },
    { label: 'SysEx Analyzer', href: '/tools/sysex-analyzer', icon: Zap },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFD500] flex items-center justify-center overflow-hidden border border-white/10 shadow-sm">
                <img 
                  src="/icon.png" 
                  alt="MG30 Studio Logo" 
                  className="w-[90%] h-[90%] object-contain"
                />
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
              <SidebarGroupLabel>Cloud Sync</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                {user ? (
                  <div className="flex flex-col gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.photoURL || ''} />
                        <AvatarFallback><UserIcon className="w-3 h-3" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate">{user.displayName}</p>
                        <p className="text-[8px] text-muted-foreground truncate">Cloud Active</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[8px] uppercase font-bold gap-2 w-full" onClick={handleLogout}>
                      <LogOut className="w-3 h-3" /> Logout
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full gap-2 text-[10px] font-bold h-9 border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={handleLogin}>
                    <LogIn className="w-3 h-3 text-primary" /> Login to Sync
                  </Button>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Hardware Status</SidebarGroupLabel>
              <SidebarGroupContent className="px-3 py-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[11px] font-medium uppercase">{status}</span>
                  </div>
                  {status === 'connected' ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
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
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};
