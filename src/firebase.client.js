// This file is specifically for client-side Firebase initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFVw_VDzuIJWWGv9iW70lyxJdtWgIspio",
  authDomain: "robowhales-scouting.firebaseapp.com",
  projectId: "robowhales-scouting",
  storageBucket: "robowhales-scouting.firebasestorage.app",
  messagingSenderId: "94724192757",
  appId: "1:94724192757:web:270a356595fdddc54b08bc",
  measurementId: "G-RW32SXHSRX"
};

// Initialize Firebase for client-side
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db }; 