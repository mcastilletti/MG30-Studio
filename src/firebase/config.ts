
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAs-Placeholder",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio'}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio',
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mg30-studio'}.appspot.com`,
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
