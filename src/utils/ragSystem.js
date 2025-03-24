import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

// Function to extract team numbers from a user query
export function extractTeamNumbers(text) {
  const teamNumberRegex = /\b\d{1,4}\b/g;
  return [...new Set(text.match(teamNumberRegex) || [])];
}

// Function to extract match numbers from a user query
export function extractMatchNumbers(text) {
  // Look for patterns like "match 5", "qualification 10", etc.
  const matchRegex = /\b(?:match|qualification|qual|elim|elimination|finals?)\s*#?\s*(\d+)\b/gi;
  const matches = [];
  let match;
  
  while ((match = matchRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

// Main function to retrieve relevant data based on user query
export async function retrieveRelevantData(query, externalDb = null) {
  let db;
  
  // Use the provided db instance, the global instance, or try to get a new one
  if (externalDb) {
    console.log("Using externally provided Firestore DB instance");
    db = externalDb;
  } else if (global.firestoreDb) {
    console.log("Using global Firestore DB instance");
    db = global.firestoreDb;
  } else {
    try {
      console.log("No Firestore DB provided, creating new instance");
      db = getFirestore();
    } catch (error) {
      console.error("Failed to get Firestore instance:", error);
      return {
        teams: {},
        matches: [],
        queryContext: { intent: "firebase_error" },
        message: "Firebase initialization failed"
      };
    }
  }

  try {
    // Check if db is available
    if (!db) {
      throw new Error("Firestore database instance is not available");
    }
    
    const scoutingCollection = collection(db, "scoutingData");
    console.log("Successfully accessed Firestore collection");
    
    // Extract entities from query
    const teamNumbers = extractTeamNumbers(query);
    const matchNumbers = extractMatchNumbers(query);
    
    // Determine query intent
    const intent = determineQueryIntent(query);
    
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
      for (const teamNumber of teamNumbers) {
        const teamData = await getTeamData(db, teamNumber);
        if (teamData.matches.length > 0) {
          relevantData.teams[teamNumber] = teamData;
        }
      }
    }
    
    // If specific matches are mentioned, get match data
    if (matchNumbers.length > 0) {
      for (const matchNumber of matchNumbers) {
        const matchData = await getMatchData(db, matchNumber);
        relevantData.matches.push(...matchData);
      }
    }
    
    // If no specific entities or we need general stats
    if ((teamNumbers.length === 0 && matchNumbers.length === 0) || 
        intent.includes('comparison') || 
        intent.includes('ranking')) {
      relevantData.generalStats = await getGeneralStats(db);
    }
    
    return relevantData;
  } catch (error) {
    console.error("Error retrieving data from Firestore:", error);
    return {
      teams: {},
      matches: [],
      queryContext: { intent: "fallback" },
      message: "Failed to retrieve data from Firestore: " + error.message
    };
  }
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
  
  // Return fallback if no intents are determined
  return intents.length > 0 ? intents : ['general'];
}

// Function to get data for a specific team
async function getTeamData(db, teamNumber) {
  try {
    console.log(`Fetching data for team ${teamNumber}`);
    const q = query(
      collection(db, "scoutingData"),
      where("matchInfo.teamNumber", "==", teamNumber.toString())
    );
    
    const querySnapshot = await getDocs(q);
    const matches = [];
    let teamStats = {
      auto: { averagePoints: 0 },
      teleop: { averagePoints: 0 },
      endgame: { averagePoints: 0 },
      overall: { averagePoints: 0, matches: 0 }
    };
    
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });
    
    return { matches, teamStats };
  } catch (error) {
    console.error(`Error fetching data for team ${teamNumber}:`, error);
    return { matches: [], teamStats: {} };
  }
}

// Function to get data for a specific match
async function getMatchData(db, matchNumber) {
  try {
    console.log(`Fetching data for match ${matchNumber}`);
    const q = query(
      collection(db, "scoutingData"),
      where("matchInfo.matchNumber", "==", matchNumber.toString())
    );
    
    const querySnapshot = await getDocs(q);
    const matches = [];
    
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });
    
    return matches;
  } catch (error) {
    console.error(`Error fetching data for match ${matchNumber}:`, error);
    return [];
  }
}

// Function to get general statistics
async function getGeneralStats(db) {
  try {
    console.log("Fetching general team statistics");
    // Get all data
    const querySnapshot = await getDocs(collection(db, "scoutingData"));
    const allMatches = [];
    
    querySnapshot.forEach((doc) => {
      allMatches.push({ id: doc.id, ...doc.data() });
    });
    
    // Process data to get stats per team
    const teamStats = {};
    allMatches.forEach((match) => {
      // Skip if no team number
      if (!match.matchInfo?.teamNumber) return;
      
      const teamNumber = match.matchInfo.teamNumber;
      if (!teamStats[teamNumber]) {
        teamStats[teamNumber] = {
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
    
    return { teams: teamStats };
  } catch (error) {
    console.error("Error fetching general stats:", error);
    return { teams: {} };
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