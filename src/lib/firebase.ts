
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Configurazione Firebase ottimizzata per Firebase Studio
const firebaseConfig = {
  apiKey: "AIzaSyAs-Placeholder-Key-For-Studio",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio'}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio',
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio'}.appspot.com`,
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Inizializzazione sicura per Next.js (evita inizializzazioni multiple durante l'HMR)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configurazione provider Google per forzare la selezione dell'account
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { db, auth, googleProvider, signInWithPopup, signOut };
