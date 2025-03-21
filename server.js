const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const path = require('path');
let retrieveRelevantData;
import('./src/utils/ragSystem.js').then(module => {
  retrieveRelevantData = module.retrieveRelevantData;
}).catch(err => {
  console.error('Error importing RAG system:', err);
});

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app's address
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    // Retrieve relevant data based on the user's query
    console.log("Retrieving data for query:", message);
    const relevantData = await retrieveRelevantData(message);
    console.log("Retrieved data for teams:", Object.keys(relevantData.teams));
    
    // Generate a response using OpenAI
    const aiResponse = await generateAIResponse(message, relevantData, conversationHistory);
    
    return res.status(200).json({ 
      response: aiResponse,
      context: {
        teamsAnalyzed: Object.keys(relevantData.teams),
        matchesAnalyzed: relevantData.matches.map(m => m.matchInfo?.matchNumber).filter(Boolean),
        intent: relevantData.queryContext?.intent
      }
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

async function generateAIResponse(message, relevantData, conversationHistory) {
  if (!openai) {
    return "OpenAI API is not configured. Please check your API key.";
  }
  
  try {
    console.log("Generating AI response...");
    
    // Format the data for the AI
    const formattedData = JSON.stringify(relevantData, null, 2);
    
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
    
    // Try the newer API format first
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
      const response = await openai.createChatCompletion({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });
      
      return response.data.choices[0].message.content;
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
    return `I'm having trouble generating a response right now. Please try again later.`;
  }
}

// Add this to server.js
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});