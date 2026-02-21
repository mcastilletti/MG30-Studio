
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAs-Placeholder",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mg30-studio"}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mg30-studio",
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mg30-studio"}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:000000000000"
};
