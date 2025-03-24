const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit } = require('firebase/firestore');

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
async function testFirebaseConnection() {
  console.log("------- FIREBASE DEBUG DIAGNOSTICS -------");
  let firebaseApp;
  let db;
  let results = {
    initSuccess: false,
    dbCreated: false,
    collectionAccess: false,
    queryExecuted: false,
    dataRetrieved: false,
    error: null
  };

  try {
    console.log("1. Attempting to initialize Firebase app...");
    firebaseApp = initializeApp(firebaseConfig);
    results.initSuccess = true;
    console.log("✓ Firebase app initialized successfully");
    
    console.log("2. Attempting to get Firestore instance...");
    db = getFirestore(firebaseApp);
    results.dbCreated = true;
    console.log("✓ Firestore instance created");
    
    console.log("3. Attempting to access 'scoutingData' collection...");
    const scoutingCollection = collection(db, "scoutingData");
    results.collectionAccess = true;
    console.log("✓ Collection reference created");
    
    console.log("4. Attempting to query Firestore...");
    const querySnapshot = await getDocs(collection(db, "scoutingData"));
    results.queryExecuted = true;
    console.log("✓ Query executed successfully");
    
    console.log("5. Checking if data was returned...");
    console.log(`Retrieved ${querySnapshot.size} documents`);
    
    if (querySnapshot.size > 0) {
      results.dataRetrieved = true;
      console.log("✓ Data retrieved successfully");
      
      // Log the first document as sample
      let firstDoc = null;
      querySnapshot.forEach(doc => {
        if (!firstDoc) {
          firstDoc = { id: doc.id, ...doc.data() };
        }
      });
      
      console.log("Sample document:", JSON.stringify(firstDoc, null, 2));
    } else {
      console.log("⚠ No documents found in collection");
    }
    
  } catch (error) {
    results.error = error.message;
    console.error("❌ Error during Firebase diagnostics:", error);
  }

  console.log("------- FIREBASE DIAGNOSTICS RESULTS -------");
  console.log(JSON.stringify(results, null, 2));
  console.log("--------------------------------------------");
  
  return results;
}

// Add a function to export all data for debug purposes
async function exportAllData() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const querySnapshot = await getDocs(collection(db, "scoutingData"));
    
    const allData = [];
    querySnapshot.forEach(doc => {
      allData.push({ id: doc.id, ...doc.data() });
    });
    
    console.log("Exported all data:", JSON.stringify(allData, null, 2));
    return allData;
  } catch (error) {
    console.error("Failed to export data:", error);
    return { error: error.message };
  }
}

module.exports = {
  testFirebaseConnection,
  exportAllData
}; 