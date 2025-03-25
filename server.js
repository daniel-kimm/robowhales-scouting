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
    console.log("Received API request:", req.body);
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Check Firebase connection
    console.log("Checking Firebase connection: DB instance available:", !!db);
    
    // Retrieve relevant data based on the user's query, passing the Firestore instance
    console.log("Retrieving data for query:", message);
    let relevantData;
    try {
      // Check if scoutingData collection has documents directly 
      const { collection, getDocs } = require('firebase/firestore');
      const collRef = collection(db, "scoutingData");
      const snapshot = await getDocs(collRef);
      console.log(`Direct check: scoutingData has ${snapshot.size} documents`);
      
      // Now try to use the RAG system
      relevantData = await retrieveRelevantData(message, db);
      console.log("RAG System returned:", {
        teamCount: Object.keys(relevantData.teams || {}).length,
        matchCount: (relevantData.matches || []).length,
        intent: relevantData.queryContext?.intent,
        error: relevantData.queryContext?.errorDetails || null
      });
      
      if (Object.keys(relevantData.teams || {}).length === 0) {
        console.warn("WARNING: RAG system returned no team data!");
      }
      
    } catch (ragError) {
      console.error("Error retrieving relevant data:", ragError);
      return res.status(500).json({ 
        error: 'Failed to retrieve relevant data',
        details: ragError.message
      });
    }
    
    // Generate a response using OpenAI
    const aiResponse = await generateAIResponse(message, relevantData, conversationHistory);
    
    return res.status(200).json({ 
      response: aiResponse,
      relevantData: {
        teamCount: Object.keys(relevantData.teams || {}).length,
        matchCount: (relevantData.matches || []).length,
        intent: relevantData.queryContext?.intent
      }
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
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

// Add this debug endpoint somewhere before your catch-all handler
app.get('/api/trigger-debug', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`=== DEBUG TRIGGERED AT ${timestamp} ===`);
  
  try {
    // Try direct Firestore access
    const { collection, getDocs } = require('firebase/firestore');
    console.log("Attempting to access Firestore directly...");
    
    const collRef = collection(db, "scoutingData");
    console.log("Collection reference created");
    
    const snapshot = await getDocs(collRef);
    console.log(`Found ${snapshot.size} documents in scoutingData`);
    
    // Process a document as a test
    if (snapshot.size > 0) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      console.log("First document ID:", doc.id);
      console.log("First document data:", JSON.stringify(data, null, 2));
      
      // Test the document structure
      if (data.matchInfo && data.matchInfo.teamNumber) {
        console.log(`Document has valid teamNumber: ${data.matchInfo.teamNumber}`);
        
        // Create a test team stats object
        const teamNumber = data.matchInfo.teamNumber;
        const teamStats = {
          [teamNumber]: {
            teamNumber,
            matches: [data],
            averageScore: data.scores?.totalPoints || 0
          }
        };
        
        console.log("Successfully created test team stats:", teamStats);
      } else {
        console.log("Document has invalid or missing teamNumber");
      }
    }
    
    return res.status(200).json({
      debug: true,
      timestamp,
      documents: snapshot.size,
      message: "Debug triggered successfully - check logs"
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Add a RAG system diagnostic endpoint
app.get('/api/rag-diagnostics', async (req, res) => {
  try {
    const { collection, getDocs } = require('firebase/firestore');
    const collRef = collection(db, "scoutingData");
    const snapshot = await getDocs(collRef);
    
    // Process documents manually to see where the issue might be
    const documents = [];
    const teamStats = {};
    const errors = [];
    
    snapshot.forEach((doc, index) => {
      try {
        const data = doc.data();
        documents.push({
          id: doc.id,
          hasMatchInfo: !!data.matchInfo,
          hasTeamNumber: !!(data.matchInfo && data.matchInfo.teamNumber),
          teamNumber: data.matchInfo?.teamNumber,
          hasScores: !!data.scores,
          totalPoints: data.scores?.totalPoints
        });
        
        // Try to process as the RAG system would
        if (data.matchInfo && data.matchInfo.teamNumber) {
          const teamNumber = data.matchInfo.teamNumber;
          
          if (!teamStats[teamNumber]) {
            teamStats[teamNumber] = {
              teamNumber,
              matches: [],
              totalScore: 0,
              matchCount: 0,
              averageScore: 0
            };
          }
          
          teamStats[teamNumber].matches.push(doc.id);
          teamStats[teamNumber].matchCount++;
          
          if (data.scores && typeof data.scores.totalPoints === 'number') {
            teamStats[teamNumber].totalScore += data.scores.totalPoints;
            teamStats[teamNumber].averageScore = 
              teamStats[teamNumber].totalScore / teamStats[teamNumber].matchCount;
          }
        }
      } catch (docError) {
        errors.push({
          docId: doc.id,
          error: docError.message,
          index
        });
      }
    });
    
    // Calculate team performance metrics
    Object.values(teamStats).forEach(team => {
      team.averageScore = team.totalScore / team.matchCount;
    });
    
    res.status(200).json({
      collectionSize: snapshot.size,
      documentSamples: documents.slice(0, 3), // First 3 documents
      teamStatsCount: Object.keys(teamStats).length,
      teamStatsSample: Object.values(teamStats).slice(0, 3), // First 3 teams
      errors: errors,
      processingSuccessful: errors.length === 0
    });
  } catch (error) {
    console.error("RAG diagnostics error:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
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
      formattedData += `- Average auto score: ${team.autoPerformance.toFixed(1)} points\n`;
      formattedData += `- Average teleop score: ${team.teleopPerformance.toFixed(1)} points\n`;
      formattedData += `- Average endgame score: ${team.endgamePerformance.toFixed(1)} points\n`;
      formattedData += `- Climb success rate: ${(team.climbSuccess * 100).toFixed(1)}%\n`;
      
      if (team.defensiveRating > 0) {
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
      formattedData += `- Total score: ${match.scores?.totalPoints || 0} points\n`;
      formattedData += `- Auto: ${match.scores?.autoPoints || 0} points\n`;
      formattedData += `- Teleop: ${match.scores?.teleopPoints || 0} points\n`;
      formattedData += `- Endgame: ${match.scores?.bargePoints || 0} points\n`;
      
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
      return `This is a test response with the following data: Teams: ${Object.keys(relevantData.teams || {}).join(', ')}. Your message: ${message}`;
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

// Catch-all handler to serve React app - should be AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Server running on port ${PORT}`);
  console.log(`[${timestamp}] Environment: ${process.env.NODE_ENV}`);
  console.log(`[${timestamp}] Firestore DB available: ${!!db}`);
  
  // Log routes
  console.log(`[${timestamp}] Available routes:`);
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`[${timestamp}] - ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
    }
  });
});