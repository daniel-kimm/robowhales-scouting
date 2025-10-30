const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
console.log("Initializing Firebase in firebase.config.js...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase initialized successfully in firebase.config.js");

module.exports = { app, db };