const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, limit } = require('firebase/firestore');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const { getRelevantManualSections } = require('./src/utils/gameManual');

const app = express();
const PORT = 3002;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFVw_VDzuIJWWGv9iW70lyxJdtWgIspio",
  authDomain: "robowhales-scouting.firebaseapp.com",
  projectId: "robowhales-scouting",
  storageBucket: "robowhales-scouting.appspot.com",
  messagingSenderId: "94724192757",
  appId: "1:94724192757:web:270a356595fdddc54b08bc",
  measurementId: "G-RW32SXHSRX"
};

// Initialize Firebase with error handling
let db;
try {
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error', error.stack);
  } else {
    console.log("Firebase already initialized");
  }
}

// Initialize OpenAI with error handling
let openai = null;
try {
  console.log("Initializing OpenAI...");
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  openai = new OpenAIApi(configuration);
  console.log("OpenAI initialized successfully");
} catch (error) {
  console.error('OpenAI initialization error:', error);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Extract team numbers from a user query
function extractTeamNumbers(text) {
  const teamNumberRegex = /\b\d{1,4}\b/g;
  return [...new Set(text.match(teamNumberRegex) || [])];
}

// Extract match numbers from a user query
function extractMatchNumbers(text) {
  const matchRegex = /\b(?:match|qualification|qual|elim|elimination|finals?)\s*#?\s*(\d+)\b/gi;
  const matches = [];
  let match;
  
  while ((match = matchRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

// Determine the intent of the query
function determineQueryIntent(query) {
  const intents = [];
  const queryLower = query.toLowerCase();
  
  // Check for different intents
  if (queryLower.includes('compar') || queryLower.includes('vs') || queryLower.includes('versus')) {
    intents.push('comparison');
  }
  
  if (queryLower.includes('best') || queryLower.includes('top') || queryLower.includes('rank')) {
    intents.push('ranking');
  }
  
  if (queryLower.includes('match') || queryLower.includes('game') || queryLower.includes('played')) {
    intents.push('match_analysis');
  }
  
  if (queryLower.includes('strategy') || queryLower.includes('alliance') || queryLower.includes('partner')) {
    intents.push('strategy');
  }
  
  if (queryLower.includes('climb') || queryLower.includes('cage') || queryLower.includes('endgame')) {
    intents.push('climbing');
  }
  
  if (queryLower.includes('coral') || queryLower.includes('scoring') || queryLower.includes('points')) {
    intents.push('scoring');
  }
  
  if (queryLower.includes('auto') || queryLower.includes('autonomous')) {
    intents.push('autonomous');
  }
  
  if (queryLower.includes('teleop') || queryLower.includes('driver')) {
    intents.push('teleop');
  }
  
  if (queryLower.includes('defen') || queryLower.includes('block') || queryLower.includes('guard')) {
    intents.push('defense');
  }
  
  // Default to general analysis if no specific intent is detected
  if (intents.length === 0) {
    intents.push('general_analysis');
  }
  
  return intents;
}

// Get data for a specific team
async function getTeamData(db, teamNumber) {
  try {
    console.log(`Getting data for team ${teamNumber}`);
    const teamQuery = query(
      collection(db, "scoutingData"),
      where("matchInfo.teamNumber", "==", teamNumber)
    );
    
    const querySnapshot = await getDocs(teamQuery);
    const matches = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${matches.length} matches for team ${teamNumber}`);
    
    // Sort matches by match number
    matches.sort((a, b) => {
      const matchNumA = parseInt(a.matchInfo?.matchNumber || '0');
      const matchNumB = parseInt(b.matchInfo?.matchNumber || '0');
      return matchNumA - matchNumB;
    });
    
    return {
      matches,
      stats: calculateTeamStats(matches)
    };
  } catch (error) {
    console.error(`Error getting data for team ${teamNumber}:`, error);
    return { matches: [], stats: null };
  }
}

// Get data for a specific match
async function getMatchData(db, matchNumber) {
  try {
    console.log(`Getting data for match ${matchNumber}`);
    const matchQuery = query(
      collection(db, "scoutingData"),
      where("matchInfo.matchNumber", "==", matchNumber)
    );
    
    const querySnapshot = await getDocs(matchQuery);
    const matches = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${matches.length} entries for match ${matchNumber}`);
    return matches;
  } catch (error) {
    console.error(`Error getting data for match ${matchNumber}:`, error);
    return [];
  }
}

// Get general statistics across all teams
async function getGeneralStats(db) {
  try {
    console.log("Getting general statistics");
    // Get all scouting data (consider pagination for large datasets)
    const querySnapshot = await getDocs(collection(db, "scoutingData"));
    const allMatches = [];
    
    querySnapshot.forEach((doc) => {
      allMatches.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${allMatches.length} total match entries`);
    
    // Group matches by team
    const teamData = {};
    
    allMatches.forEach(match => {
      const teamNumber = match.matchInfo?.teamNumber;
      if (!teamNumber) return;
      
      if (!teamData[teamNumber]) {
        teamData[teamNumber] = {
          matches: [],
        };
      }
      
      teamData[teamNumber].matches.push(match);
    });
    
    // Calculate stats for each team
    Object.keys(teamData).forEach(teamNumber => {
      teamData[teamNumber].stats = calculateTeamStats(teamData[teamNumber].matches);
    });
    
    // Calculate overall statistics
    const overallStats = {
      totalMatches: allMatches.length,
      totalTeams: Object.keys(teamData).length,
      averageScore: calculateAverageScore(allMatches),
      topTeams: {
        overall: getTopTeams(teamData, 'averageScore', 5),
        autonomous: getTopTeams(teamData, 'averageAutoScore', 5),
        teleop: getTopTeams(teamData, 'averageTeleopScore', 5),
        climbing: getTopTeams(teamData, 'climbSuccessRate', 5),
        coral: getTopTeams(teamData, 'totalCoral', 5),
        algae: getTopTeams(teamData, 'totalAlgae', 5),
        defense: getTopDefensiveTeams(teamData, 5)
      }
    };
    
    return {
      teams: teamData,
      overall: overallStats
    };
  } catch (error) {
    console.error("Error getting general statistics:", error);
    return { teams: {}, overall: null };
  }
}

// Calculate statistics for a team
function calculateTeamStats(matches) {
  if (matches.length === 0) return null;
  
  const stats = {
    totalMatches: matches.length,
    totalScore: 0,
    averageScore: 0,
    totalAutoScore: 0,
    averageAutoScore: 0,
    totalTeleopScore: 0,
    averageTeleopScore: 0,
    totalEndgameScore: 0,
    averageEndgameScore: 0,
    climbAttempts: 0,
    climbSuccesses: 0,
    climbSuccessRate: 0,
    totalCoral: 0,
    totalAlgae: 0,
    matchScores: [],
    coralBreakdown: {
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0
    },
    algaeBreakdown: {
      processor: 0,
      net: 0
    },
    recentTrend: null,
    defenseRatings: [],
    averageDefenseRating: 0,
    maxDefenseRating: 0
  };
  
  matches.forEach(match => {
    // Accumulate scores
    const totalScore = match.scores?.totalPoints || 0;
    const autoScore = match.scores?.autoPoints || 0;
    const teleopScore = match.scores?.teleopPoints || 0;
    const endgameScore = match.scores?.bargePoints || 0;
    
    stats.totalScore += totalScore;
    stats.totalAutoScore += autoScore;
    stats.totalTeleopScore += teleopScore;
    stats.totalEndgameScore += endgameScore;
    
    stats.matchScores.push({
      matchNumber: match.matchInfo?.matchNumber,
      totalScore,
      autoScore,
      teleopScore,
      endgameScore
    });
    
    // Track climbing
    if (match.endgame?.deepCageClimb || match.endgame?.shallowCageClimb) {
      stats.climbSuccesses++;
    }
    if (match.endgame?.deepCageClimb || match.endgame?.shallowCageClimb || match.endgame?.robotParked) {
      stats.climbAttempts++;
    }
    
    // Track coral scoring
    stats.coralBreakdown.level1 += (match.autonomous?.coralLevel1 || 0) + (match.teleop?.coralLevel1 || 0);
    stats.coralBreakdown.level2 += (match.autonomous?.coralLevel2 || 0) + (match.teleop?.coralLevel2 || 0);
    stats.coralBreakdown.level3 += (match.autonomous?.coralLevel3 || 0) + (match.teleop?.coralLevel3 || 0);
    stats.coralBreakdown.level4 += (match.autonomous?.coralLevel4 || 0) + (match.teleop?.coralLevel4 || 0);
    
    stats.totalCoral += 
      (match.autonomous?.coralLevel1 || 0) + (match.teleop?.coralLevel1 || 0) +
      (match.autonomous?.coralLevel2 || 0) + (match.teleop?.coralLevel2 || 0) +
      (match.autonomous?.coralLevel3 || 0) + (match.teleop?.coralLevel3 || 0) +
      (match.autonomous?.coralLevel4 || 0) + (match.teleop?.coralLevel4 || 0);
    
    // Track algae scoring
    stats.algaeBreakdown.processor += (match.autonomous?.algaeProcessor || 0) + (match.teleop?.algaeProcessor || 0);
    stats.algaeBreakdown.net += (match.autonomous?.algaeNet || 0) + (match.teleop?.algaeNet || 0);
    
    stats.totalAlgae += 
      (match.autonomous?.algaeProcessor || 0) + (match.teleop?.algaeProcessor || 0) +
      (match.autonomous?.algaeNet || 0) + (match.teleop?.algaeNet || 0);
    
    // Track defense ratings more carefully
    if (match.defense && typeof match.defense.rating === 'number') {
      stats.defenseRatings.push(match.defense.rating);
      if (!stats.maxDefenseRating || match.defense.rating > stats.maxDefenseRating) {
        stats.maxDefenseRating = match.defense.rating;
      }
    }
  });
  
  // Calculate averages
  stats.averageScore = stats.totalScore / matches.length;
  stats.averageAutoScore = stats.totalAutoScore / matches.length;
  stats.averageTeleopScore = stats.totalTeleopScore / matches.length;
  stats.averageEndgameScore = stats.totalEndgameScore / matches.length;
  stats.climbSuccessRate = stats.climbAttempts > 0 ? (stats.climbSuccesses / stats.climbAttempts) * 100 : 0;
  
  // Calculate recent trend (last 3 matches vs previous matches)
  if (matches.length >= 4) {
    const recentMatches = matches.slice(-3);
    const previousMatches = matches.slice(0, -3);
    
    const recentAvg = recentMatches.reduce((sum, match) => sum + (match.scores?.totalPoints || 0), 0) / recentMatches.length;
    const previousAvg = previousMatches.reduce((sum, match) => sum + (match.scores?.totalPoints || 0), 0) / previousMatches.length;
    
    stats.recentTrend = {
      direction: recentAvg > previousAvg ? 'improving' : recentAvg < previousAvg ? 'declining' : 'stable',
      percentage: previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
    };
  }
  
  // Calculate average defense rating
  if (stats.defenseRatings.length > 0) {
    stats.averageDefenseRating = stats.defenseRatings.reduce((sum, rating) => sum + rating, 0) / 
                                 stats.defenseRatings.length;
  }
  
  return stats;
}

// Calculate average score across all matches
function calculateAverageScore(matches) {
  if (matches.length === 0) return 0;
  
  const totalScore = matches.reduce((sum, match) => sum + (match.scores?.totalPoints || 0), 0);
  return totalScore / matches.length;
}

// Get top teams based on a specific stat
function getTopTeams(teamData, statKey, count) {
  return Object.entries(teamData)
    .filter(([_, data]) => data.stats && data.stats[statKey] !== undefined)
    .sort((a, b) => b[1].stats[statKey] - a[1].stats[statKey])
    .slice(0, count)
    .map(([teamNumber, data]) => ({
      teamNumber,
      value: data.stats[statKey],
      matches: data.matches.length
    }));
}

// Main function to retrieve relevant data based on user query
async function retrieveRelevantData(query) {
  try {
    console.log("Starting RAG retrieval for query:", query);
    
    // Extract entities from query
    const teamNumbers = extractTeamNumbers(query);
    const matchNumbers = extractMatchNumbers(query);
    
    // Determine query intent
    const intent = determineQueryIntent(query);
    
    console.log("Extracted entities:", { teamNumbers, matchNumbers, intent });
    
    let relevantData = {
      teams: {},
      matches: [],
      generalStats: null,
      queryContext: {
        teamNumbers,
        matchNumbers,
        intent
      }
    };
    
    // If specific teams are mentioned, get their data
    if (teamNumbers.length > 0) {
      console.log("Getting data for specific teams:", teamNumbers);
      for (const teamNumber of teamNumbers) {
        const teamData = await getTeamData(db, teamNumber);
        if (teamData.matches.length > 0) {
          relevantData.teams[teamNumber] = teamData;
        }
      }
    }
    
    // If specific matches are mentioned, get match data
    if (matchNumbers.length > 0) {
      console.log("Getting data for specific matches:", matchNumbers);
      for (const matchNumber of matchNumbers) {
        const matchData = await getMatchData(db, matchNumber);
        relevantData.matches.push(...matchData);
      }
    }
    
    // If no specific entities or we need general stats
    if ((teamNumbers.length === 0 && matchNumbers.length === 0) || 
        intent.includes('comparison') || 
        intent.includes('ranking')) {
      console.log("Getting general statistics");
      relevantData.generalStats = await getGeneralStats(db);
    }
    
    // Special handling for defense queries
    if (intent.includes('defense')) {
      // Get general stats if not already done
      if (!relevantData.generalStats) {
        relevantData.generalStats = await getGeneralStats(db);
      }
      
      // Add specialized defensive team rankings
      if (relevantData.generalStats && relevantData.generalStats.teams) {
        relevantData.topDefensiveTeams = getTopDefensiveTeams(relevantData.generalStats.teams, 10);
      }
    }
    
    console.log("RAG retrieval completed successfully");
    return relevantData;
  } catch (error) {
    console.error("Error in RAG retrieval:", error);
    throw error;
  }
}

async function generateAIResponse(message, relevantData, conversationHistory) {
  if (!openai) {
    return "OpenAI API is not configured. Please check your API key.";
  }
  
  try {
    console.log("Generating AI response...");
    
    // Format the data for the AI
    const formattedData = JSON.stringify(relevantData, null, 2);
    
    // Get relevant game manual sections
    const relevantManualSections = getRelevantManualSections(message);
    
    const systemPrompt = `
      You are an FRC (FIRST Robotics Competition) scouting assistant for Team 9032 (RoboWhales).
      You analyze match data for the 2025 game Reefscape.
      
      # GAME MANUAL INFORMATION
      ${relevantManualSections}
      
      When answering questions:
      1. Use the game manual information above and the scouting data below.
      2. If you don't have enough information, say so rather than making up facts.
      3. Be concise but informative.
      4. When discussing teams, always include their team number.
      5. If asked about strategy, consider team strengths and weaknesses based on their performance data.
      6. When discussing defensive capabilities, ALWAYS prioritize average defense ratings, then maximum defense ratings.
      7. When ranking teams, ALWAYS use averages rather than totals for fair comparison.
      
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
          model: "gpt-4o-mini",
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

app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    
    // Use the RAG system to retrieve data
    const relevantData = await retrieveRelevantData(req.body.message);
    
    // If OpenAI is configured, generate a response
    if (process.env.OPENAI_API_KEY) {
      const aiResponse = await generateAIResponse(
        req.body.message, 
        relevantData, 
        req.body.conversationHistory
      );
      
      res.json({ 
        response: aiResponse,
        context: {
          teamsAnalyzed: Object.keys(relevantData.teams),
          matchesAnalyzed: relevantData.matches.map(m => m.matchInfo?.matchNumber).filter(Boolean),
          intent: relevantData.queryContext?.intent
        }
      });
    } else {
      // Fallback if OpenAI is not configured
      res.json({ 
        response: `This is a test response with RAG system. I found data for teams: ${Object.keys(relevantData.teams).join(', ')}. Your message was: ${req.body.message}`,
        context: {
          teamsAnalyzed: Object.keys(relevantData.teams),
          matchesAnalyzed: relevantData.matches.map(m => m.matchInfo?.matchNumber).filter(Boolean),
          intent: relevantData.queryContext?.intent
        }
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server with Firestore and OpenAI running on http://localhost:${PORT}`);
}); 