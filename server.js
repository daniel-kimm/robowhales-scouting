const express = require('express');
const cors = require('cors');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const fs = require('fs');
const { db } = require('./src/firebase.config');
const { testFirebaseConnection, exportAllData } = require('./src/firebase.debug');
const { retrieveRelevantData } = require('./src/utils/ragSystem');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow any origin in production
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
  // If the request is for an API endpoint, set proper JSON headers
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'build')));

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// API endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Retrieve relevant data based on the user's query
    const relevantData = await retrieveRelevantData(message, db);
    
    // Generate a response using OpenAI
    const aiResponse = await generateAIResponse(message, relevantData, conversationHistory);
    
    return res.status(200).json({ 
      response: aiResponse
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// Add a simple test route to verify the API is working
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'API is running',
    env: process.env.NODE_ENV || 'development',
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasFirestore: !!db
  });
});

// Add a diagnostic endpoint
app.get('/api/firebase-debug', async (req, res) => {
  try {
    console.log("Running Firebase diagnostics...");
    const results = await testFirebaseConnection();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error running diagnostics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a data export endpoint
app.get('/api/export-data', async (req, res) => {
  try {
    console.log("Exporting all data...");
    const data = await exportAllData();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a collection check endpoint
app.get('/api/check-collections', async (req, res) => {
  try {
    const { collection, getDocs } = require('firebase/firestore');
    console.log("Checking collections...");
    const possibleCollections = [
      "scoutingData",
      "scouting_data",
      "ScoutingData", 
      "matches",
      "teams",
      "events",
      "users"
    ];
    
    const results = {};
    
    for (const collName of possibleCollections) {
      try {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);
        results[collName] = {
          exists: true,
          count: snapshot.size,
          sample: snapshot.size > 0 ? snapshot.docs[0].data() : null
        };
      } catch (err) {
        results[collName] = { exists: false, error: err.message };
      }
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error("Error checking collections:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update the diagnose-collections endpoint
app.get('/api/diagnose-collections', async (req, res) => {
  try {
    console.log("Running collection diagnostics...");
    
    // Initialize Firebase directly in this function
    const { initializeApp } = require('firebase/app');
    const { getFirestore, collection, getDocs } = require('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: "AIzaSyDFVw_VDzuIJWWGv9iW70lyxJdtWgIspio",
      authDomain: "robowhales-scouting.firebaseapp.com",
      projectId: "robowhales-scouting",
      storageBucket: "robowhales-scouting.firebasestorage.app",
      messagingSenderId: "94724192757",
      appId: "1:94724192757:web:270a356595fdddc54b08bc",
      measurementId: "G-RW32SXHSRX"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
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
    
    const results = {};
    
    for (const collName of collections) {
      try {
        const collRef = collection(db, collName);
        const snapshot = await getDocs(collRef);
        
        results[collName] = {
          exists: true,
          count: snapshot.size
        };
        
        if (snapshot.size > 0) {
          // Get sample document
          const doc = snapshot.docs[0];
          results[collName].sampleDocId = doc.id;
          results[collName].sampleData = doc.data();
        }
      } catch (error) {
        results[collName] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    // Return the results in the response
    res.status(200).json(results);
  } catch (error) {
    console.error("Error running diagnostics:", error);
    res.status(500).json({ error: error.message });
  }
});

async function generateAIResponse(message, relevantData, conversationHistory = []) {
  try {
    // Format the relevant data for prompting
    let formattedData = "";
    
    // Team data formatter
    if (relevantData.teams && Object.keys(relevantData.teams).length > 0) {
      formattedData += "### Team Data\n\n";
      
      Object.entries(relevantData.teams).forEach(([teamNumber, stats]) => {
        formattedData += `#### Team ${teamNumber}\n`;
        formattedData += `- Average Score: ${stats.averageScore.toFixed(1)} points\n`;
        
        if (stats.autoPerformance !== undefined) {
          formattedData += `- Average Auto: ${stats.autoPerformance.toFixed(1)} points\n`;
        }
        
        if (stats.teleopPerformance !== undefined) {
          formattedData += `- Average Teleop: ${stats.teleopPerformance.toFixed(1)} points\n`;
        }
        
        if (stats.endgamePerformance !== undefined) {
          formattedData += `- Average Endgame: ${stats.endgamePerformance.toFixed(1)} points\n`;
        }
        
        formattedData += `- Match Count: ${stats.matchCount}\n\n`;
        
        // Important: Add individual match details
        if (stats.matches && stats.matches.length > 0) {
          formattedData += "##### Individual Match Scores:\n";
          
          // Sort matches by match number
          const sortedMatches = [...stats.matches].sort((a, b) => 
            parseInt(a.matchInfo.matchNumber) - parseInt(b.matchInfo.matchNumber)
          );
          
          sortedMatches.forEach(match => {
            const totalPoints = match.scores?.totalPoints || 0;
            const autoPoints = match.scores?.autoPoints || 0;
            const teleopPoints = match.scores?.teleopPoints || 0;
            const endgamePoints = match.scores?.bargePoints || 0;
            
            formattedData += `- Match ${match.matchInfo.matchNumber}: ${totalPoints} total points (Auto: ${autoPoints}, Teleop: ${teleopPoints}, Endgame: ${endgamePoints})\n`;
            
            // Add notes if available
            if (match.additional?.notes) {
              formattedData += `  - Notes: ${match.additional.notes}\n`;
            }
          });
          
          // If this is a best_match intent, explicitly identify the best match
          if (relevantData.queryContext?.intent === "best_match") {
            const bestMatch = [...stats.matches].sort((a, b) => 
              (b.scores?.totalPoints || 0) - (a.scores?.totalPoints || 0)
            )[0];
            
            if (bestMatch) {
              formattedData += `\n##### Best Match:\n`;
              formattedData += `- Match ${bestMatch.matchInfo.matchNumber} was the highest scoring with ${bestMatch.scores?.totalPoints || 0} total points\n`;
              formattedData += `  - Auto: ${bestMatch.scores?.autoPoints || 0}, Teleop: ${bestMatch.scores?.teleopPoints || 0}, Endgame: ${bestMatch.scores?.bargePoints || 0}\n`;
            }
          }
          
          formattedData += "\n";
        }
      });
    }
    
    // Create the prompt with instructions tailored to the query intent
    let systemPrompt = `You are a helpful FRC (FIRST Robotics Competition) scouting assistant. You help teams analyze match data and provide insights based on scouting information.

For the given query, provide a detailed analysis based on the data provided below. 

${formattedData}

When answering:
- If asked about a team's "best game" or "best match", provide the specific match details (match number and score breakdown).
- When discussing overall performance, include both averages AND the individual match that had the highest score.
- If specific match numbers are mentioned, focus on those match details.
- If no data is available for a specific team or match, clearly state this limitation.
- Keep your analysis concise but informative, focused on the question asked.`;

    // Send the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    return response.data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, there was an error generating a response. Please try again.";
  }
}

// This catch-all route must be AFTER all API routes
// It will handle all non-API routes and serve the React app
app.get('*', (req, res) => {
  // Only skip API routes if they haven't been handled already
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For all other routes, serve the React app
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// No other routes should come after the catch-all

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});