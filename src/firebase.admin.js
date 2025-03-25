const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
let adminDb = null;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      "projectId": "robowhales-scouting",
      "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6a7qqn4mUJDpP\nEfJQe1jRQxKoN+QOLGTnbKwIPJIUYQTSH2cOWDjpz0UvQBWt6Yef6bcsZvzl+ZEv\nXeMH+ROGXlJ2uSpnqOL1I4RJIxQQ3mQAe8SLgf1AiZzl8hQ7EoLqWQCF0A2rU7AH\nF0G0x0Vl1QQqQkG/6+qcjpOZJQ3H/KTSpZCGAgYU3SXDHmvFs4UjnKp20TkW5Yke\nUH/QLTrNynuxtpkCCfvBJGS/+2JsjWzvdQ8YgL9OmKPK8yx+JGQ+S5JnCU6emCHT\nJAK+M5T2dO0JtGbT3DGZJx4FbBUsUpHXkfvXBXJT0Sa/LLrTLgHczDQJZ9JLrhr3\nJw9PnLklAgMBAAECggEAAf3/LL8TlX2q+0UTdZEXCJzKVE5LbVV8ooUC/RZFkvpE\nsPEkiHbTzwfzDnLkEaE66Pu9SzAorvGmCTWZTL5ybVN1LOe5JYjmjO5G0JPo+nCd\nZgnR3OQ3eEzL8LK0ftx0nP1mP9Ht0JQ8rkp3vQoRG25PwBaUfOdERZbFMsASA2DA\nmR2AXLXYgC9B8TaLyNXbBtA1GegSaHAfA2QrDwgj3gLY/Hh/YKjzCztb+RIUhCv/\n4Zi0bWbvtUMpVWlS4G/Xb2KaY82GJ3/UGqnAV5TxN8WZoRFQJA+CxJHXnJYQtDWi\nQqVF5/9FyLdEfXpG7JjhAwLNpcXCeZ9hWDvVl7GSsQKBgQD5xSaXobfFFhnLCDQh\npjJPdQFiinwfTtaVYBbWEZMF8tPmvGZnK6FCPpK0zxG0kw3/R83J4/UAfoH0e4eb\npfD83b09uNJn9RlV6u/nMsO6DXAXfTIPZbSR7fFfn2SZWRshdoYU6hGxLh5Po0o+\nDrLj0g3sX91sjmWWX4W5M1JjfQKBgQC/Jz+gvQuQpCO2tIeN5t+S9UUYRl0UOyDx\nxHMIRtBW9Q0jFCoK6LvT1mqEbHMsC2GBRwZb57OlBp9SFVUqNDVUhZrJAACtYgvB\nMo/7POy5RvqoMXPDdcJmskUZQpS8J7sefFEhCvtYBWzE/bg92q6Dp+Zb/XaULkJr\noLWnHg3lmQKBgF23JbfO7UJfmRRHcxLkYAHLLgPyUkTh1L4+ETaUQ4yjREeqMTLe\n9hBLNqKqDlQC8C55hfJ/uxHPzNbPkCXfBQGcBEh+TaQA1gdIqXgbChE7sLQEOV+o\n8F+FLYAXcWrCnPwbmicGAHBi/0MhhTJPVMD9fX1yc9zZ0ZIVQMrB5zVpAoGBAIBK\nt/M+82LHy9bXzO0XhYTzAKKubZ5+p48ZrOZKVQUZyLECvzocUDASD7zM9PKveoWE\nGjHNJO5BsUvsfaIPL6I91XZVrZyvAhEJ1NeYuqmVsQQZADle1OdCgmIUvQKIYNLx\nLw1a16rW1yIMjnFYCVgzJP8XwMnZAjNZGQIL1N+xAoGATjbUHD6vO4f4Ij0cqRxB\ngAVeMjM4MpccL3MuL7I5KI6fothQEq5vSwcUu+SjC8hbiDNkOqfJQB7qYRnHnBzv\nZN01+J/rDQgGQaJEP8e1qPVlmD/6hQuE/u6t/ClTxQYjMlz+3hMo8xXt3m9YOJNC\nKnkawF7vqLoHWo7fFWmJGWw=\n-----END PRIVATE KEY-----\n",
      "clientEmail": "firebase-adminsdk-q6dwy@robowhales-scouting.iam.gserviceaccount.com"
    }),
    databaseURL: "https://robowhales-scouting.firebaseio.com"
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