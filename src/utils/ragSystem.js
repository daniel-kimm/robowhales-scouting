const { collection, getDocs, query, where, limit } = require('firebase/firestore');
const { db } = require('../firebase.config.js');

// Function to extract team numbers from a user query
function extractTeamNumbers(text) {
  const teamNumberRegex = /\b\d{1,4}\b/g;
  return [...new Set(text.match(teamNumberRegex) || [])];
}

// Function to extract match numbers from a user query
function extractMatchNumbers(text) {
  // Look for patterns like "match 5", "qualification 10", etc.
  const matchRegex = /\b(?:match|qualification|qual|elim|elimination|finals?)\s*#?\s*(\d+)\b/gi;
  const matches = [];
  let match;
  
  while ((match = matchRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

// Function to determine the intent of the query - improve to better detect match-specific requests
function determineQueryIntent(query) {
  const queryLower = query.toLowerCase();
  
  // Add new patterns for single match / best match queries
  if (/\b(?:best|highest|top|strongest|most impressive|best performing|highest scoring)\s+(?:game|match|performance|showing)\b/i.test(queryLower)) {
    return "best_match";
  }
  
  if (/\b(?:match|game)\s+(?:score|details|numbers|statistics|stats|information|data)\b/i.test(queryLower)) {
    return "match_details";
  }
  
  // Existing patterns
  if (/\b(?:compare|versus|vs\.?|against|better)\b/i.test(queryLower)) {
    return "team_comparison";
  }
  
  if (/\b(?:best|top|strongest|highest|most effective)\b/i.test(queryLower)) {
    return "top_teams";
  }
  
  if (/\b(?:match|qualification|quals?|elims?|playoffs?)\s+(?:\d+|results|outcome|scores?)\b/i.test(queryLower)) {
    return "match_analysis";
  }
  
  if (/\b(?:defense|defensive|block|blocking|counter)\b/i.test(queryLower)) {
    return "defensive_analysis";
  }
  
  if (/\b(?:alliance|selection|pick|draft|partner)\b/i.test(queryLower)) {
    return "alliance_selection";
  }
  
  if (/\b(?:strategy|plan|approach|tactic)\b/i.test(queryLower)) {
    return "strategy_recommendation";
  }
  
  return "general_question";
}

// Main function to retrieve relevant data based on user query
async function retrieveRelevantData(userMessage, db) {
  try {
    // Parse the user query to determine intent and extract key information
    const { intent, teamNumbers, matchNumbers } = parseUserQuery(userMessage);
    
    // Create the collection reference
    const scoutingCollection = collection(db, "scoutingData");
    
    // Get all documents
    const querySnapshot = await getDocs(scoutingCollection);
    
    if (querySnapshot.empty) {
      return {
        teams: {},
        matches: [],
        queryContext: { 
          intent, 
          teamNumbers, 
          matchNumbers,
          note: "NO_DATA_FOUND"
        }
      };
    }
    
    // Process the documents into team statistics
    let teamStats = {};
    let matchData = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      if (!data.matchInfo || !data.matchInfo.teamNumber) {
        return; // Skip this document
      }
      
      const teamNumber = data.matchInfo.teamNumber;
      const match = {
        id: doc.id,
        matchInfo: data.matchInfo,
        scores: data.scores || {},
        autonomous: data.autonomous || {},
        teleop: data.teleop || {},
        endgame: data.endgame || {},
        additional: data.additional || {},
        timestamp: data.timestamp
      };
      
      // Add to match data
      matchData.push(match);
      
      // Initialize team stats if needed
      if (!teamStats[teamNumber]) {
        teamStats[teamNumber] = {
          teamNumber,
          matches: [],
          totalScore: 0,
          matchCount: 0,
          averageScore: 0
        };
      }
      
      // Add match to team's matches
      teamStats[teamNumber].matches.push(match);
      teamStats[teamNumber].matchCount++;
      
      // Update score metrics if available
      if (data.scores && typeof data.scores.totalPoints === 'number') {
        teamStats[teamNumber].totalScore += data.scores.totalPoints;
      }
    });
    
    // Calculate average scores and other metrics
    Object.values(teamStats).forEach(team => {
      team.averageScore = team.totalScore / team.matchCount;
      
      // Add other metrics as needed
      // Calculate auto performance if available
      let autoTotal = 0;
      let teleopTotal = 0;
      let endgameTotal = 0;
      let climbSuccesses = 0;
      let defenseRatingTotal = 0;
      let defenseRatingCount = 0;
      
      team.matches.forEach(match => {
        if (match.scores && typeof match.scores.autoPoints === 'number') {
          autoTotal += match.scores.autoPoints;
        }
        
        if (match.scores && typeof match.scores.teleopPoints === 'number') {
          teleopTotal += match.scores.teleopPoints;
        }
        
        if (match.scores && typeof match.scores.bargePoints === 'number') {
          endgameTotal += match.scores.bargePoints;
        }
        
        // Check endgame status for climb
        if (match.endgame && (match.endgame.shallowCageClimb || match.endgame.deepCageClimb)) {
          climbSuccesses++;
        }
        
        // Add defense rating if available
        if (match.additional && typeof match.additional.defenseRating === 'number') {
          defenseRatingTotal += match.additional.defenseRating;
          defenseRatingCount++;
        }
      });
      
      // Only add these metrics if we have data
      if (team.matchCount > 0) {
        team.autoPerformance = autoTotal / team.matchCount;
        team.teleopPerformance = teleopTotal / team.matchCount;
        team.endgamePerformance = endgameTotal / team.matchCount;
        team.climbSuccess = climbSuccesses / team.matchCount;
      }
      
      if (defenseRatingCount > 0) {
        team.defensiveRating = defenseRatingTotal / defenseRatingCount;
      }
    });
    
    // Filter teams and matches based on intent and query
    let relevantTeams = teamStats;
    let relevantMatches = matchData;
    
    // If specific teams were mentioned, filter to just those teams
    if (teamNumbers.length > 0) {
      relevantTeams = {};
      teamNumbers.forEach(teamNum => {
        if (teamStats[teamNum]) {
          relevantTeams[teamNum] = teamStats[teamNum];
        }
      });
    }
    
    // Return the processed data
    return {
      teams: relevantTeams,
      matches: relevantMatches,
      queryContext: { intent, teamNumbers, matchNumbers }
    };
  } catch (error) {
    console.error("Error retrieving relevant data:", error);
    return {
      teams: {},
      matches: [],
      queryContext: { 
        intent: "error", 
        errorDetails: error.message
      }
    };
  }
}

// Simple query parsing function - update to better detect match-specific requests
function parseUserQuery(message) {
  // Default values
  const lowerMessage = message.toLowerCase();
  
  // Determine intent using the improved function
  const intent = determineQueryIntent(lowerMessage);
  
  const teamNumbers = extractTeamNumbers(message);
  const matchNumbers = extractMatchNumbers(message);
  
  return { intent, teamNumbers, matchNumbers };
}

// Function to get top defensive teams
function getTopDefensiveTeams(teams, limit = 5) {
  return Object.entries(teams)
    .filter(([_, stats]) => stats.defensiveRating > 0)
    .sort(([_, statsA], [__, statsB]) => statsB.defensiveRating - statsA.defensiveRating)
    .slice(0, limit)
    .map(([teamNumber, stats]) => ({
      teamNumber,
      defensiveRating: stats.defensiveRating,
      matchCount: stats.matches.length
    }));
}

module.exports = {
  retrieveRelevantData,
  extractTeamNumbers,
  extractMatchNumbers
}; 