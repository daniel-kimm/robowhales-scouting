const { initializeApp } = require('firebase/app');
const { getFirestore, listCollections } = require('firebase/firestore');

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

async function checkAllCollections() {
  try {
    console.log("Initializing Firebase...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Check all available collections
    console.log("Attempting to list all collections...");
    
    // Note: Firestore client SDK doesn't have direct listCollections
    // Let's try to access a few potential collection names
    const possibleCollections = [
      "scoutingData",
      "scouting_data",
      "ScoutingData", 
      "matches",
      "teams",
      "events",
      "users"
    ];
    
    for (const collName of possibleCollections) {
      try {
        const { collection, getDocs } = require('firebase/firestore');
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);
        console.log(`Collection '${collName}': ${snapshot.size} documents found`);
        
        if (snapshot.size > 0) {
          // Show the first document as sample
          const firstDoc = snapshot.docs[0].data();
          console.log(`Sample document from '${collName}':`, JSON.stringify(firstDoc, null, 2));
        }
      } catch (err) {
        console.log(`Error checking collection '${collName}':`, err.message);
      }
    }
    
    return "Collections check complete";
  } catch (error) {
    console.error("Error checking collections:", error);
    return { error: error.message };
  }
}

// Run the function
checkAllCollections().then(console.log).catch(console.error); 