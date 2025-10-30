const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
let adminDb = null;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      "projectId": process.env.REACT_APP_FIREBASE_PROJECT_ID,
      "privateKey": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      "clientEmail": process.env.FIREBASE_CLIENT_EMAIL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  
  adminDb = admin.firestore();
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

// Function to get all documents from a collection
async function getAllDocuments(collectionName) {
  if (!adminDb) {
    return { error: "Admin database not initialized" };
  }
  
  try {
    const snapshot = await adminDb.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { 
      count: documents.length,
      data: documents
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Function to list all collections
async function listAllCollections() {
  if (!adminDb) {
    return { error: "Admin database not initialized" };
  }
  
  try {
    const collections = await adminDb.listCollections();
    const collectionNames = collections.map(collection => collection.id);
    
    return {
      count: collectionNames.length,
      collections: collectionNames
    };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  adminDb,
  getAllDocuments,
  listAllCollections
}; 