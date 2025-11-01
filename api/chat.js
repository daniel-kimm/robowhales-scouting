import { Configuration, OpenAIApi } from 'openai';
import { retrieveRelevantData } from '../src/utils/ragSystem';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase 
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase and export the db instance
let firebaseApp;
let db;

try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  console.log("Firebase initialized successfully in API handler");
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error in API handler:', error.stack);
  } else {
    console.log("Firebase already initialized in API handler");
    // Get the existing app's Firestore instance
    db = getFirestore();
  }
}

// Make db available to imported modules
global.firestoreDb = db;

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  // Set headers to prevent timeout issues
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Log the database instance
    console.log("Firestore DB instance:", db ? "Available" : "Not available");
    
    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 8000) // 8 second timeout
    );
    
    // Retrieve relevant data based on the user's query
    console.log("Retrieving data for query:", message);
    const dataPromise = retrieveRelevantData(db, message, "scoutingDataThor");
    
    const relevantData = await Promise.race([dataPromise, timeoutPromise]);
    console.log("Retrieved data for teams:", Object.keys(relevantData.teams));
    
    // Generate a response using OpenAI with timeout
    const aiPromise = generateAIResponse(message, relevantData, conversationHistory);
    const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
    
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
    
    // Handle timeout errors specifically
    if (error.message === 'Request timeout') {
      return res.status(504).json({ 
        error: 'Request timed out. Try asking a more specific question about fewer teams.',
        timeout: true
      });
    }
    
    // Return proper JSON error response
    return res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

function summarizeDataForAI(relevantData) {
  // Drastically reduce data size by computing averages and summaries
  const summarized = {
    teams: {},
    totalMatches: relevantData.matches.length
  };
  
  // For each team, calculate aggregate statistics
  Object.entries(relevantData.teams).forEach(([teamNum, teamData]) => {
    const matches = teamData.matches || [];
    const matchCount = matches.length;
    
    if (matchCount === 0) return;
    
    // Calculate averages
    const totals = matches.reduce((acc, match) => {
      acc.auto += match.scores?.autoPoints || 0;
      acc.teleop += match.scores?.teleopPoints || 0;
      acc.endgame += match.scores?.bargePoints || 0;
      acc.total += match.scores?.totalPoints || 0;
      acc.coralL4 += (match.autonomous?.coralLevel4 || 0) + (match.teleop?.coralLevel4 || 0);
      acc.algae += (match.autonomous?.algaeNet || 0) + (match.autonomous?.algaeProcessor || 0) + 
                   (match.teleop?.algaeNet || 0) + (match.teleop?.algaeProcessor || 0);
      if (match.endgame?.deepCageClimb) acc.deepClimbs++;
      if (match.endgame?.shallowCageClimb) acc.shallowClimbs++;
      if (match.endgame?.robotParked) acc.parks++;
      return acc;
    }, { auto: 0, teleop: 0, endgame: 0, total: 0, coralL4: 0, algae: 0, deepClimbs: 0, shallowClimbs: 0, parks: 0 });
    
    summarized.teams[teamNum] = {
      teamNumber: teamNum,
      matchesPlayed: matchCount,
      averages: {
        autoPoints: (totals.auto / matchCount).toFixed(1),
        teleopPoints: (totals.teleop / matchCount).toFixed(1),
        endgamePoints: (totals.endgame / matchCount).toFixed(1),
        totalPoints: (totals.total / matchCount).toFixed(1),
        coralLevel4PerMatch: (totals.coralL4 / matchCount).toFixed(1),
        algaePerMatch: (totals.algae / matchCount).toFixed(1)
      },
      endgameStats: {
        deepClimbs: totals.deepClimbs,
        shallowClimbs: totals.shallowClimbs,
        parks: totals.parks,
        deepClimbRate: ((totals.deepClimbs / matchCount) * 100).toFixed(0) + '%',
        climbRate: (((totals.deepClimbs + totals.shallowClimbs) / matchCount) * 100).toFixed(0) + '%'
      },
      // Only include high-level match context
      bestPerformance: {
        matchNumber: matches.reduce((best, m) => (m.scores?.totalPoints || 0) > (best.scores?.totalPoints || 0) ? m : best, matches[0]).matchInfo?.matchNumber,
        score: Math.max(...matches.map(m => m.scores?.totalPoints || 0))
      }
    };
  });
  
  return summarized;
}

async function generateAIResponse(message, relevantData, conversationHistory) {
  try {
    // Limit the amount of data we send to avoid token limits
    const teamCount = Object.keys(relevantData.teams).length;
    const matchCount = relevantData.matches.length;
    
    console.log(`Processing ${teamCount} teams and ${matchCount} matches`);
    
    // Summarize data instead of sending everything to avoid 400 errors
    const summarizedData = summarizeDataForAI(relevantData);
    const formattedData = JSON.stringify(summarizedData, null, 2);
    
    console.log(`Summarized data size: ${formattedData.length} characters`);
    
    const systemPrompt = `
      You are an FRC (FIRST Robotics Competition) scouting assistant for Team 9032 (RoboWhales).
      You analyze match data for the 2025 game Reefscape which involves:
      - Scoring coral pieces on different levels (1-4)
      - Processing algae in processors or nets
      - Climbing to different heights (robot parked, shallow cage, deep cage)
      
      When answering questions:
      1. Use ONLY the aggregated statistics and data provided below. If you don't have enough information, say so.
      2. Be concise but informative.
      3. When discussing teams, always include their team number.
      4. Focus on averages, trends, and key statistics.
      5. For comparisons, use the provided averages and percentages.
      
      Here is the summarized scouting data with averages and key statistics:
      ${formattedData}
      
      Note: Data includes averages across all matches, climb rates, and best performance score for each team.
    `;
    
    // Format conversation history for the API - limit history
    const recentHistory = conversationHistory.slice(-4); // Only keep last 4 messages
    const formattedHistory = recentHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Add the system message and current user query
    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: message }
    ];
    
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
      request_timeout: 6000 // 6 second timeout for OpenAI
    });
    
    return response.data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response: ' + error.message);
  }
} 