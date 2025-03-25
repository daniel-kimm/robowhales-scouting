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
  console.log("Generating AI response with data:", {
    teamsCount: Object.keys(relevantData.teams || {}).length,
    matchesCount: (relevantData.matches || []).length,
    intent: relevantData.queryContext?.intent
  });
  
  // Format the relevant data for prompting
  let formattedData = "";
  
  // Format teams data
  if (Object.keys(relevantData.teams || {}).length > 0) {
    formattedData += "TEAM PERFORMANCE DATA:\n";
    
    Object.values(relevantData.teams).forEach(team => {
      formattedData += `Team ${team.teamNumber}:\n`;
      formattedData += `- Matches played: ${team.matches.length}\n`;
      formattedData += `- Average total score: ${team.averageScore.toFixed(1)} points\n`;
      
      // Only include these if they exist
      if (typeof team.autoPerformance === 'number') {
        formattedData += `- Average auto score: ${team.autoPerformance.toFixed(1)} points\n`;
      }
      
      if (typeof team.teleopPerformance === 'number') {
        formattedData += `- Average teleop score: ${team.teleopPerformance.toFixed(1)} points\n`;
      }
      
      if (typeof team.endgamePerformance === 'number') {
        formattedData += `- Average endgame score: ${team.endgamePerformance.toFixed(1)} points\n`;
      }
      
      if (typeof team.climbSuccess === 'number') {
        formattedData += `- Climb success rate: ${(team.climbSuccess * 100).toFixed(1)}%\n`;
      }
      
      if (typeof team.defensiveRating === 'number' && team.defensiveRating > 0) {
        formattedData += `- Defensive rating: ${team.defensiveRating.toFixed(1)}/10\n`;
      }
      
      formattedData += "\n";
    });
  }
  
  // Format match data if needed
  if ((relevantData.matches || []).length > 0 && relevantData.queryContext?.intent === "match_analysis") {
    formattedData += "MATCH DATA:\n";
    
    relevantData.matches.forEach(match => {
      formattedData += `Match ${match.matchInfo?.matchNumber || 'unknown'} - Team ${match.matchInfo?.teamNumber || 'unknown'} (${match.matchInfo?.alliance || 'unknown'}):\n`;
      
      if (match.scores && typeof match.scores.totalPoints === 'number') {
        formattedData += `- Total score: ${match.scores.totalPoints} points\n`;
      }
      
      if (match.scores && typeof match.scores.autoPoints === 'number') {
        formattedData += `- Auto: ${match.scores.autoPoints} points\n`;
      }
      
      if (match.scores && typeof match.scores.teleopPoints === 'number') {
        formattedData += `- Teleop: ${match.scores.teleopPoints} points\n`;
      }
      
      if (match.scores && typeof match.scores.bargePoints === 'number') {
        formattedData += `- Endgame: ${match.scores.bargePoints} points\n`;
      }
      
      if (match.additional?.notes) {
        formattedData += `- Notes: ${match.additional.notes}\n`;
      }
      
      formattedData += "\n";
    });
  }
  
  // If no data is available
  if (formattedData === "") {
    formattedData = "No specific scouting data is available for this query.";
  }
  
  // Create system prompt
  const systemPrompt = `
    You are an FRC scouting assistant for Team 9032.
    
    When analyzing team performance:
    1. ALWAYS prioritize average scores over total scores
    2. Consider the number of matches played when comparing teams
    3. Include defensive capabilities in your analysis
    4. For rankings, teams with fewer than 3 matches should be noted as having limited data
    
    Here is the relevant scouting data:
    ${formattedData}
  `;
  
  console.log("SYSTEM PROMPT:", systemPrompt);
  
  // Format conversation history
  const formattedHistory = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Create messages array
  const messages = [
    { role: "system", content: systemPrompt },
    ...formattedHistory,
    { role: "user", content: message }
  ];
  
  try {
    if (!openai) {
      console.log("OpenAI API not initialized, returning mock response");
      return `I found the following team data: ${Object.keys(relevantData.teams || {}).join(', ')}. The RAG system processed ${Object.keys(relevantData.teams || {}).length} teams from ${(relevantData.matches || []).length} matches.`;
    }
    
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 800
    });
    
    return response.data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, there was an error generating a response. Please try again.";
  }
}

// Make sure this catch-all route is AFTER all your API routes but BEFORE any 404 handlers
app.get('*', (req, res) => {
  // Skip API routes - they should have already been handled by now
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve the index.html for all other routes
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});