const express = require('express');
const cors = require('cors');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const fs = require('fs');
const { db } = require('./src/firebase.config');
const { testFirebaseConnection, exportAllData } = require('./src/firebase.debug');
const { 
  retrieveRelevantData, 
  extractTeamNumbers, 
  extractMatchNumbers, 
  getTopDefensiveTeams,
  getTopTeamsByMetric,
  getTopCoralScoringTeams,
  getTopAlgaeScoringTeams 
} = require('./src/utils/ragSystem');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3002;

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
    const { message } = req.body;
    console.log("Received message:", message);
    
    // Get relevant data based on the message
    const relevantData = await retrieveRelevantData(db, message, "scoutingDataDCMP");
    
    // Generate AI response
    const aiResponse = await generateAIResponse(message, relevantData);
    
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error processing chat message:", error);
    res.status(500).json({ error: "Failed to process your message" });
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
    
    // Check query type to determine rankings to include
    const queryLower = message.toLowerCase();
    
    // Check for defensive team questions
    if (queryLower.includes('defensive') || queryLower.includes('defense') || 
        queryLower.includes('best defensive') || queryLower.includes('top defensive')) {
      
      // Get the top defensive teams - now filtered by playedDefense
      const topDefensiveTeams = getTopDefensiveTeams(relevantData.teams, 10);
      
      formattedData += "### Top Defensive Teams (Ranked)\n\n";
      topDefensiveTeams.forEach((team, index) => {
        formattedData += `${index + 1}. Team ${team.teamNumber}: Defense Rating ${team.defensiveRating.toFixed(1)}/10 (${team.matchCount} defensive matches out of ${team.totalMatches} total)\n`;
      });
      
      // If no teams played defense, make that clear
      if (topDefensiveTeams.length === 0) {
        formattedData += "No teams in the dataset have played defense in their matches.\n";
      }
      
      formattedData += "\n";
    }
    
    // Check for questions about coral scoring
    if (queryLower.includes('coral') || queryLower.includes('level 4') || 
        queryLower.includes('level 3') || queryLower.includes('level 2') || 
        queryLower.includes('level 1')) {
      
      // Determine which level is being asked about
      let level = null;
      if (queryLower.includes('level 4')) level = 4;
      else if (queryLower.includes('level 3')) level = 3;
      else if (queryLower.includes('level 2')) level = 2;
      else if (queryLower.includes('level 1')) level = 1;
      
      // Log raw data first for debugging
      console.log("===== RAW TEAM DATA =====");
      Object.entries(relevantData.teams).forEach(([teamNumber, stats]) => {
        const metricKey = level ? `avgCoralLevel${level}` : 'avgTotalCoral';
        console.log(`Team ${teamNumber}: ${metricKey} = ${stats[metricKey]}`);
      });
      console.log("========================");
      
      // Get teams ranked by the specific coral level or total coral
      const coralTeams = getTopCoralScoringTeams(relevantData.teams, level, 10);
      
      // More detailed debug logging of sorting results
      console.log(`===== RANKED CORAL TEAMS (LEVEL ${level || 'TOTAL'}) =====`);
      coralTeams.forEach((team, index) => {
        console.log(`${index + 1}. Team ${team.teamNumber}: ${team.metricValue.toFixed(2)}`);
      });
      console.log("======================================");
      
      // Force a resort of coralTeams to be extra certain
      coralTeams.sort((a, b) => parseFloat(b.metricValue) - parseFloat(a.metricValue));
      
      formattedData += level ? 
        `### Top Teams for Level ${level} Coral Scoring (Ranked)\n\n` : 
        "### Top Teams for Overall Coral Scoring (Ranked)\n\n";
      
      // Be very explicit about the order when outputting
      coralTeams.forEach((team, index) => {
        const teamNum = team.teamNumber;
        const value = parseFloat(team.metricValue).toFixed(1);
        
        formattedData += `${index + 1}. Team ${teamNum}: `;
        
        if (level) {
          formattedData += `Avg. Level ${level} Coral: ${value} pieces`;
          formattedData += ` (Total Coral: ${team.stats.avgTotalCoral.toFixed(1)} pieces per match)\n`;
        } else {
          formattedData += `Avg. Total Coral: ${value} pieces per match\n`;
          // Include breakdown by level
          formattedData += `   Level 1: ${team.stats.avgCoralLevel1.toFixed(1)}, `;
          formattedData += `Level 2: ${team.stats.avgCoralLevel2.toFixed(1)}, `;
          formattedData += `Level 3: ${team.stats.avgCoralLevel3.toFixed(1)}, `;
          formattedData += `Level 4: ${team.stats.avgCoralLevel4.toFixed(1)}\n`;
        }
      });
      formattedData += "\n";
    }
    
    // Check for questions about algae scoring
    if (queryLower.includes('algae') || queryLower.includes('processor') || 
        queryLower.includes('net')) {
      
      // Determine which location is being asked about
      let location = null;
      if (queryLower.includes('processor')) location = 'processor';
      else if (queryLower.includes('net')) location = 'net';
      
      // Get teams ranked by the specific algae location or total algae
      const algaeTeams = getTopAlgaeScoringTeams(relevantData.teams, location, 10);
      
      formattedData += location ? 
        `### Top Teams for Algae ${location.charAt(0).toUpperCase() + location.slice(1)} Scoring (Ranked)\n\n` : 
        "### Top Teams for Overall Algae Scoring (Ranked)\n\n";
      
      algaeTeams.forEach((team, index) => {
        formattedData += `${index + 1}. Team ${team.teamNumber}: `;
        
        if (location) {
          formattedData += `Avg. Algae ${location.charAt(0).toUpperCase() + location.slice(1)}: ${team.metricValue.toFixed(1)} pieces`;
          formattedData += ` (Total Algae: ${team.stats.avgTotalAlgae.toFixed(1)} pieces per match)\n`;
        } else {
          formattedData += `Avg. Total Algae: ${team.metricValue.toFixed(1)} pieces per match\n`;
          // Include breakdown by location
          formattedData += `   Processor: ${team.stats.avgAlgaeProcessor.toFixed(1)}, `;
          formattedData += `Net: ${team.stats.avgAlgaeNet.toFixed(1)}\n`;
        }
      });
      formattedData += "\n";
    }
    
    // Store the best matches for clear reference
    let bestMatchesByTeam = {};
    
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
        
        // Correct the rating scales from /5 to /10
        if (stats.defensiveRating !== undefined) {
          formattedData += `- Defense Rating: ${stats.defensiveRating.toFixed(1)}/10\n`;
        }
        
        if (stats.robotSpeedRating !== undefined) {
          formattedData += `- Robot Speed Rating: ${stats.robotSpeedRating.toFixed(1)}/10\n`;
        }
        
        if (stats.driverSkillRating !== undefined) {
          formattedData += `- Driver Skill Rating: ${stats.driverSkillRating.toFixed(1)}/10\n`;
        }
        
        if (stats.climbSuccess !== undefined) {
          formattedData += `- Climb Success Rate: ${(stats.climbSuccess * 100).toFixed(1)}%\n`;
        }
        
        // Add detailed coral scoring metrics
        formattedData += `\n##### Game Piece Scoring:\n`;
        
        // Coral scoring breakdown
        if (stats.avgTotalCoral !== undefined) {
          formattedData += `- Avg. Coral Pieces: ${stats.avgTotalCoral.toFixed(1)} per match\n`;
          formattedData += `  - Level 1: ${stats.avgCoralLevel1.toFixed(1)}\n`;
          formattedData += `  - Level 2: ${stats.avgCoralLevel2.toFixed(1)}\n`;
          formattedData += `  - Level 3: ${stats.avgCoralLevel3.toFixed(1)}\n`;
          formattedData += `  - Level 4: ${stats.avgCoralLevel4.toFixed(1)}\n`;
        }
        
        // Algae scoring breakdown
        if (stats.avgTotalAlgae !== undefined) {
          formattedData += `- Avg. Algae Pieces: ${stats.avgTotalAlgae.toFixed(1)} per match\n`;
          formattedData += `  - Processor: ${stats.avgAlgaeProcessor.toFixed(1)}\n`;
          formattedData += `  - Net: ${stats.avgAlgaeNet.toFixed(1)}\n`;
        }
        
        formattedData += `- Match Count: ${stats.matchCount}\n\n`;
        
        // Important: Add individual match details
        if (stats.matches && stats.matches.length > 0) {
          // Find the best match first
          const bestMatch = [...stats.matches].sort((a, b) => 
            (b.scores?.totalPoints || 0) - (a.scores?.totalPoints || 0)
          )[0];
          
          if (bestMatch) {
            bestMatchesByTeam[teamNumber] = {
              matchNumber: bestMatch.matchInfo.matchNumber,
              totalPoints: bestMatch.scores?.totalPoints || 0,
              autoPoints: bestMatch.scores?.autoPoints || 0,
              teleopPoints: bestMatch.scores?.teleopPoints || 0,
              endgamePoints: bestMatch.scores?.bargePoints || 0
            };
            
            // Add best match summary at the top for emphasis
            formattedData += `##### BEST MATCH FOR TEAM ${teamNumber}:\n`;
            formattedData += `- Match ${bestMatch.matchInfo.matchNumber}: ${bestMatch.scores?.totalPoints || 0} total points\n`;
            formattedData += `  - Auto: ${bestMatch.scores?.autoPoints || 0}, Teleop: ${bestMatch.scores?.teleopPoints || 0}, Endgame: ${bestMatch.scores?.bargePoints || 0}\n\n`;
          }
          
          formattedData += "##### All Match Scores:\n";
          
          // Sort matches by match number
          const sortedMatches = [...stats.matches].sort((a, b) => 
            parseInt(a.matchInfo.matchNumber) - parseInt(b.matchInfo.matchNumber)
          );
          
          sortedMatches.forEach(match => {
            const totalPoints = match.scores?.totalPoints || 0;
            const autoPoints = match.scores?.autoPoints || 0;
            const teleopPoints = match.scores?.teleopPoints || 0;
            const endgamePoints = match.scores?.bargePoints || 0;
            
            // Mark the best match with an asterisk for clarity
            const isBestMatch = match.matchInfo.matchNumber === bestMatchesByTeam[teamNumber]?.matchNumber;
            const bestMatchMarker = isBestMatch ? " [BEST MATCH]" : "";
            
            // Format the match line
            let matchLine = `- Match ${match.matchInfo.matchNumber}${bestMatchMarker}: ${totalPoints} total points (Auto: ${autoPoints}, Teleop: ${teleopPoints}, Endgame: ${endgamePoints})`;
            
            // Correct the rating scales from /5 to /10
            if (match.additional?.defenseRating) {
              matchLine += `, Defense: ${match.additional.defenseRating}/10`;
            }
            
            if (match.additional?.robotSpeed) {
              matchLine += `, Speed: ${match.additional.robotSpeed}/10`;
            }
            
            if (match.additional?.driverSkill) {
              matchLine += `, Driver: ${match.additional.driverSkill}/10`;
            }
            
            formattedData += matchLine + '\n';
            
            // Add detailed scoring for this match
            if (match.teleop) {
              let scoringDetails = "  - Scored: ";
              
              // Coral scoring
              const coralPieces = [];
              if (typeof match.teleop.coralLevel1 === 'number' && match.teleop.coralLevel1 > 0) {
                coralPieces.push(`${match.teleop.coralLevel1} coral in Level 1`);
              }
              if (typeof match.teleop.coralLevel2 === 'number' && match.teleop.coralLevel2 > 0) {
                coralPieces.push(`${match.teleop.coralLevel2} coral in Level 2`);
              }
              if (typeof match.teleop.coralLevel3 === 'number' && match.teleop.coralLevel3 > 0) {
                coralPieces.push(`${match.teleop.coralLevel3} coral in Level 3`);
              }
              if (typeof match.teleop.coralLevel4 === 'number' && match.teleop.coralLevel4 > 0) {
                coralPieces.push(`${match.teleop.coralLevel4} coral in Level 4`);
              }
              
              // Algae scoring
              const algaePieces = [];
              if (typeof match.teleop.algaeProcessor === 'number' && match.teleop.algaeProcessor > 0) {
                algaePieces.push(`${match.teleop.algaeProcessor} algae in Processor`);
              }
              if (typeof match.teleop.algaeNet === 'number' && match.teleop.algaeNet > 0) {
                algaePieces.push(`${match.teleop.algaeNet} algae in Net`);
              }
              
              // Combine scoring details
              const scoringItems = [...coralPieces, ...algaePieces];
              if (scoringItems.length > 0) {
                scoringDetails += scoringItems.join(', ');
                formattedData += scoringDetails + '\n';
              }
            }
            
            // Add notes if available
            if (match.additional?.notes) {
              formattedData += `  - Notes: ${match.additional.notes}\n`;
            }
          });
          
          formattedData += "\n";
        }
      });
    }
    
    // Add a summary of best matches for extra emphasis
    if (Object.keys(bestMatchesByTeam).length > 0) {
      formattedData += "### SUMMARY OF BEST MATCHES:\n\n";
      
      Object.entries(bestMatchesByTeam).forEach(([teamNumber, matchData]) => {
        formattedData += `- Team ${teamNumber}'s best match: Match ${matchData.matchNumber} with ${matchData.totalPoints} points\n`;
      });
      
      formattedData += "\n";
    }
    
    // Update the system prompt with a clear guideline about only referencing teams in the data
    let systemPrompt = `You are a helpful FRC (FIRST Robotics Competition) scouting assistant. You help teams analyze match data and provide insights based on scouting information.

For the given query, provide a detailed analysis based on the data provided below. This data is factual and accurate - rely on it completely for your answer.

IMPORTANT: When pre-ranked data is provided at the beginning of the information, USE THAT RANKING ORDER in your response. Do not reorder or recalculate rankings yourself.

${formattedData}

IMPORTANT INSTRUCTIONS:
- ONLY reference and analyze teams that are specifically mentioned in the data provided. DO NOT mention or analyze teams that are not in this dataset.
- When ranked data is provided (like "Top Teams for X"), maintain the exact same ranking order in your response.
- When asked about a team's "best game" or "best match", ALWAYS reference the match explicitly labeled as [BEST MATCH] in the data.
- Double-check your numbers against the data provided to ensure accuracy.
- If the user asks about a "best match", focus your response primarily on the match labeled as [BEST MATCH].
- If specific match numbers are mentioned, focus on those match details.
- If no data is available for a specific team or match, clearly state this limitation.
- Keep your analysis concise but informative, focused on the question asked.
- If asked about a team not in the data, explicitly state "There is no data available for Team X" rather than making up information.`;

    // Fixed: Use the correct OpenAI API call syntax
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ],
      temperature: 0.5,  // Lower temperature for more consistent answers
      max_tokens: 800
    });
    
    return response.data.choices[0].message.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, there was an error generating a response. Please try again.";
  }
}

// This catch-all route must be AFTER all API routes
// It will handle all non-API routes and serve the React app
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For all other routes, serve the React app
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// No other routes should come after the catch-all

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});