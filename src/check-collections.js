const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function runCollectionDiagnostics() {
  try {
    console.log("============ FIRESTORE COLLECTION DIAGNOSTICS ============");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log("Firebase initialized successfully in diagnostics");
    
    // Check all potential collection names
    const collections = [
      "scoutingData",
      "scouting_data",
      "ScoutingData",
      "Matches",
      "matches",
      "Teams",
      "teams",
      "Events",
      "events",
      "users"
    ];
    
    console.log("Attempting to check collections...");
    for (const collName of collections) {
      try {
        console.log(`Checking collection: ${collName}`);
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);
        console.log(`Collection '${collName}' exists with ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          const doc = snapshot.docs[0];
          console.log(`Sample document ID: ${doc.id}`);
          console.log(`Sample document data:`, JSON.stringify(doc.data(), null, 2));
        } else {
          console.log(`Collection '${collName}' is empty`);
        }
      } catch (error) {
        console.log(`Error accessing collection '${collName}':`, error.message);
      }
    }
    
    console.log("============ END FIRESTORE DIAGNOSTICS ============");
    return "Diagnostics completed";
  } catch (error) {
    console.error("Critical error in diagnostics:", error);
    return `Critical error: ${error.message}`;
  }
}

// Run the diagnostics if this script is executed directly
if (require.main === module) {
  runCollectionDiagnostics().then(console.log).catch(console.error);
}

module.exports = { runCollectionDiagnostics }; 
checkAllCollections().then(console.log).catch(console.error); 