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

// Determine the intent of the query
function determineQueryIntent(query) {
  const queryLower = query.toLowerCase();
  
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
async function retrieveRelevantData(query, externalDb = null) {
  console.log("=== RAG SYSTEM DETAILED DIAGNOSTICS ===");
  console.log("Query:", query);
  console.log("External DB provided:", !!externalDb);
  console.log("Imported DB available:", !!db);
  
  // Use provided DB, imported DB, or fail
  const firestoreDb = externalDb || db;
  
  // If we still don't have a DB, log the error and return fallback
  if (!firestoreDb) {
    console.error("CRITICAL: No Firestore database available");
    return {
      teams: {},
      matches: [],
      queryContext: { intent: "fallback" },
      message: "Firestore database instance is unavailable"
    };
  }
  
  try {
    console.log("Using Firestore DB instance");
    
    // Extract entities from query
    const teamNumbers = extractTeamNumbers(query);
    const matchNumbers = extractMatchNumbers(query);
    console.log("Extracted team numbers:", teamNumbers);
    console.log("Extracted match numbers:", matchNumbers);
    
    // Determine query intent
    const intent = determineQueryIntent(query);
    console.log("Determined intent:", intent);
    
    // Set up empty result containers
    let teamStats = {};
    const matchData = [];
    
    console.log("Attempting to access scoutingData collection...");
    const scoutingCollection = collection(firestoreDb, "scoutingData");
    console.log("Collection reference created successfully");
    
    // Simple test query first
    console.log("Testing collection with initial query...");
    const testSnapshot = await getDocs(query(scoutingCollection, limit(1)));
    console.log(`Test query returned ${testSnapshot.size} documents`);
    
    console.log("Querying Firestore for all scouting data...");
    const querySnapshot = await getDocs(scoutingCollection);
    
    if (querySnapshot.empty) {
      console.warn("No documents found in scoutingData collection");
      return {
        teams: {},
        matches: [],
        queryContext: { intent, teamNumbers, matchNumbers },
        message: "No scouting data available"
      };
    }
    
    console.log(`Retrieved ${querySnapshot.size} documents`);
    let processedDocs = 0;
    
    // Process all documents
    querySnapshot.forEach(doc => {
      processedDocs++;
      const match = { id: doc.id, ...doc.data() };
      
      console.log(`Processing document ${processedDocs}: Match ${match.matchInfo?.matchNumber}, Team ${match.matchInfo?.teamNumber}`);
      
      // If specific match numbers were requested, filter for those
      if (matchNumbers.length > 0 && !matchNumbers.includes(match.matchInfo?.matchNumber)) {
        return;
      }
      
      // Add to match data array
      matchData.push(match);
      
      // Process team stats
      const teamNumber = match.matchInfo?.teamNumber;
      if (!teamNumber) return;
      
      // Initialize team stats if not already done
      if (!teamStats[teamNumber]) {
        teamStats[teamNumber] = {
          teamNumber,
          matches: [],
          averageScore: 0,
          autoPerformance: 0,
          teleopPerformance: 0,
          endgamePerformance: 0,
          climbSuccess: 0,
          defensiveRating: 0
        };
      }
      
      teamStats[teamNumber].matches.push(match);
    });
    
    // Filter for specific teams if requested
    if (teamNumbers.length > 0) {
      const filteredTeamStats = {};
      teamNumbers.forEach(team => {
        if (teamStats[team]) {
          filteredTeamStats[team] = teamStats[team];
        }
      });
      
      // If we found any of the requested teams, use those
      if (Object.keys(filteredTeamStats).length > 0) {
        teamStats = filteredTeamStats;
      }
    }
    
    // Calculate averages for each team
    Object.keys(teamStats).forEach((teamNumber) => {
      const stats = teamStats[teamNumber];
      const matchCount = stats.matches.length;
      
      if (matchCount > 0) {
        const totalScore = stats.matches.reduce((sum, match) => sum + (match.scores?.totalPoints || 0), 0);
        stats.averageScore = totalScore / matchCount;
        
        const autoScore = stats.matches.reduce((sum, match) => sum + (match.scores?.autoPoints || 0), 0);
        stats.autoPerformance = autoScore / matchCount;
        
        const teleopScore = stats.matches.reduce((sum, match) => sum + (match.scores?.teleopPoints || 0), 0);
        stats.teleopPerformance = teleopScore / matchCount;
        
        const endgameScore = stats.matches.reduce((sum, match) => sum + (match.scores?.bargePoints || 0), 0);
        stats.endgamePerformance = endgameScore / matchCount;
        
        const climbSuccesses = stats.matches.filter(match => 
          match.endgame?.shallowCageClimb || match.endgame?.deepCageClimb
        ).length;
        stats.climbSuccess = climbSuccesses / matchCount;
        
        const defenseRatings = stats.matches
          .filter(match => match.additional?.playedDefense)
          .map(match => match.additional?.defenseRating || 0);
        
        stats.defensiveRating = defenseRatings.length > 0 
          ? defenseRatings.reduce((sum, rating) => sum + rating, 0) / defenseRatings.length 
          : 0;
      }
    });
    
    console.log("Retrieved team stats for teams:", Object.keys(teamStats));
    console.log("Retrieved match data count:", matchData.length);
    
    // Return the relevant data
    return {
      teams: teamStats,
      matches: matchData,
      queryContext: { intent, teamNumbers, matchNumbers }
    };
    
  } catch (error) {
    console.error("Error in retrieveRelevantData:", error);
    console.error("Error stack:", error.stack);
    return {
      teams: {},
      matches: [],
      queryContext: { intent: "fallback" },
      message: "Error retrieving data: " + error.message
    };
  }
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