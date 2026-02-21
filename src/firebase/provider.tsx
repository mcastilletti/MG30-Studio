
'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, GoogleAuthProvider } from 'firebase/auth';

interface FirebaseContextType {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  googleProvider: GoogleAuthProvider;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: FirebaseContextType;
}) {
  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
}
