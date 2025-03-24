const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFVw_VDzuIJWWGv9iW70lyxJdtWgIspio",
  authDomain: "robowhales-scouting.firebaseapp.com",
  projectId: "robowhales-scouting",
  storageBucket: "robowhales-scouting.firebasestorage.app",
  messagingSenderId: "94724192757",
  appId: "1:94724192757:web:270a356595fdddc54b08bc",
  measurementId: "G-RW32SXHSRX"
};

// Initialize Firebase
console.log("Initializing Firebase in firebase.config.js...");
let firebaseApp;
let db;

try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  console.log("Firebase initialized successfully in firebase.config.js");
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error in firebase.config.js:', error.stack);
  } else {
    console.log("Firebase already initialized in firebase.config.js");
    db = getFirestore();
  }
}

module.exports = {
  db,
  firebaseApp
};