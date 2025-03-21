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
export async function retrieveRelevantData(query) {
  const db = getFirestore();
  const scoutingCollection = collection(db, "scoutingData");
  
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
  
  return relevantData;
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
}

// Get data for a specific match
async function getMatchData(db, matchNumber) {
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
  
  return matches;
}

// Get general statistics across all teams
async function getGeneralStats(db) {
  // Get all scouting data (consider pagination for large datasets)
  const querySnapshot = await getDocs(collection(db, "scoutingData"));
  const allMatches = [];
  
  querySnapshot.forEach((doc) => {
    allMatches.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
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

function getTopTeamsNormalized(teamData, statKey, count, minimum = 3) {
  return Object.entries(teamData)
    .filter(([_, data]) => data.stats && 
                           data.stats[statKey] !== undefined && 
                           data.matches.length >= minimum)
    .sort((a, b) => b[1].stats[statKey] - a[1].stats[statKey])
    .slice(0, count)
    .map(([teamNumber, data]) => ({
      teamNumber,
      value: data.stats[statKey],
      matches: data.matches.length
    }));
}

// Add a specialized function for defense rankings
function getTopDefensiveTeams(teamData, count = 5) {
  return Object.entries(teamData)
    .filter(([_, data]) => data.stats && data.stats.defenseRatings && data.stats.defenseRatings.length > 0)
    .sort((a, b) => {
      // First sort by average defense rating
      const avgDiff = b[1].stats.averageDefenseRating - a[1].stats.averageDefenseRating;
      if (Math.abs(avgDiff) > 0.001) return avgDiff;
      
      // If averages are identical, sort by max rating
      return b[1].stats.maxDefenseRating - a[1].stats.maxDefenseRating;
    })
    .slice(0, count)
    .map(([teamNumber, data]) => ({
      teamNumber,
      averageDefenseRating: data.stats.averageDefenseRating,
      maxDefenseRating: data.stats.maxDefenseRating,
      matches: data.matches.length,
      ratingsCount: data.stats.defenseRatings.length
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