const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const fs = require('fs');

// Import the RAG system with better error handling
let retrieveRelevantData = null;
console.log("Attempting to import RAG system...");

import('./src/utils/ragSystem.js')
  .then(module => {
    console.log("RAG system imported successfully");
    retrieveRelevantData = module.retrieveRelevantData;
  })
  .catch(err => {
    console.error('Error importing RAG system:', err);
    // Create a fallback RAG function
    retrieveRelevantData = async (query) => {
      console.log("Using fallback RAG system for query:", query);
      return {
        teams: {},
        matches: [],
        queryContext: { intent: "fallback" },
        message: "RAG system unavailable"
      };
    };
  });

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
    
    // Ensure we have a valid retrieveRelevantData function
    if (typeof retrieveRelevantData !== 'function') {
      console.error("RAG system not properly loaded");
      return res.status(500).json({ 
        error: 'RAG system not initialized',
        details: 'Internal server configuration error'
      });
    }
    
    // Retrieve relevant data based on the user's query
    console.log("Retrieving data for query:", message);
    let relevantData;
    try {
      relevantData = await retrieveRelevantData(message);
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
    hasOpenAiKey: !!process.env.OPENAI_API_KEY
  });
});

async function generateAIResponse(message, relevantData = {}, conversationHistory = []) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    return "I'm not fully configured yet. Please check the server configuration.";
  }
  
  try {
    console.log("Generating AI response...");
    
    // Format the data for the AI, with a fallback if data is missing
    let formattedData = "No specific data available for this query.";
    try {
      formattedData = JSON.stringify(relevantData || {}, null, 2);
    } catch (error) {
      console.error("Error formatting data:", error);
    }
    
    const systemPrompt = `
      You are an FRC (FIRST Robotics Competition) scouting assistant for Team 9032 (RoboWhales).
      You analyze match data for the 2025 game Reefscape.
      
      When answering questions:
      1. Use ONLY the data provided below. If you don't have enough information, say so.
      2. Be concise but informative.
      
      Here is the relevant scouting data:
      ${formattedData}
    `;
    
    // Format conversation history for the API
    const formattedHistory = conversationHistory ? conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })) : [];
    
    // Add the system message and current user query
    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: message }
    ];
    
    console.log("Calling OpenAI API...");
    
    // Try the fetch API first
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (fetchError) {
      console.error("Error with fetch API, trying SDK:", fetchError);
      
      // Fall back to the SDK
      if (openai) {
        const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        });
        
        return response.data.choices[0].message.content;
      } else {
        throw new Error("OpenAI SDK not initialized");
      }
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
    return `I'm having trouble generating a response right now. Please try again later. (Error: ${error.message})`;
  }
}

// Add this to server.js
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// The "catch-all" route handler for any requests that don't match the ones above
// This must be AFTER all other routes
app.get('*', (req, res) => {
  console.log('Trying to serve:', path.join(__dirname, 'build', 'index.html'));
  if (fs.existsSync(path.join(__dirname, 'build', 'index.html'))) {
    console.log('File exists!');
  } else {
    console.log('File NOT found!');
  }
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});