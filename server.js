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
      relevantData = await retrieveRelevantData(message, db);
      console.log("Data retrieved successfully");
    } catch (ragError) {
      console.error("Error retrieving relevant data:", ragError);
      return res.status(500).json({ 
        error: 'Failed to retrieve relevant data',
        details: process.env.NODE_ENV === 'development' ? ragError.message : 'Internal server error'
      });
    }
    
    // Generate a response using OpenAI
    const aiResponse = await generateAIResponse(message, relevantData, conversationHistory);
    
    return res.status(200).json({ 
      response: aiResponse,
      context: {
        teamsAnalyzed: Object.keys(relevantData.teams || {}),
        matchesAnalyzed: (relevantData.matches || []).map(m => m.matchInfo?.matchNumber).filter(Boolean),
        intent: relevantData.queryContext?.intent
      }
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
    const scoutingCollection = collection(db, "scoutingData");
    const snapshot = await getDocs(scoutingCollection);
    res.status(200).json({ 
      collection: "scoutingData", 
      documentCount: snapshot.size,
      sample: snapshot.size > 0 ? snapshot.docs[0].data() : null
    });
  } catch (error) {
    console.error("Error checking collections:", error);
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

// Catch-all handler to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});