import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

/**
 * Detects and removes duplicate match entries from Firestore
 * @param {Object} db - Firestore database instance
 * @param {string} collectionName - Collection to check for duplicates
 * @returns {Object} - Statistics about deleted duplicates
 */
export const removeDuplicateMatches = async (db, collectionName = "scoutingDataChamps") => {
  try {
    // Step 1: Fetch all match data with document IDs
    const matchesSnapshot = await getDocs(collection(db, collectionName));
    const matches = [];
    
    matchesSnapshot.forEach((docSnapshot) => {
      matches.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });
    
    console.log(`Found ${matches.length} total matches in ${collectionName}`);
    
    // Step 2: Group by team number + match number (our duplicate criteria)
    const matchGroups = {};
    matches.forEach(match => {
      const teamNumber = String(match.matchInfo?.teamNumber || 'unknown');
      const matchNumber = String(match.matchInfo?.matchNumber || 'unknown');
      
      if (teamNumber === 'unknown' || matchNumber === 'unknown') {
        return;
      }
      
      const matchKey = `${teamNumber}-${matchNumber}`;
      
      if (!matchGroups[matchKey]) {
        matchGroups[matchKey] = [];
      }
      
      matchGroups[matchKey].push(match);
    });
    
    // Step 3: Find duplicates and delete them
    let totalDuplicates = 0;
    let deletedCount = 0;
    const deletedMatches = [];
    const skippedMatches = [];
    
    for (const [matchKey, matchList] of Object.entries(matchGroups)) {
      if (matchList.length > 1) {
        let actualDuplicatesInGroup = 0;
        const firstMatch = matchList[0];
        
        for (let i = 1; i < matchList.length; i++) {
          try {
            const currentMatch = matchList[i];
            console.log(`Checking potential duplicate: ${currentMatch.id}`);
            
            // Exact field-by-field comparison
            const isDuplicate = areMatchesIdentical(firstMatch, currentMatch);
            
            if (isDuplicate) {
              actualDuplicatesInGroup++;
              await deleteDoc(doc(db, collectionName, currentMatch.id));
              deletedCount++;
              deletedMatches.push({
                teamNumber: currentMatch.matchInfo?.teamNumber,
                matchNumber: currentMatch.matchInfo?.matchNumber,
                id: currentMatch.id
              });
              console.log(`Deleted TRUE duplicate: ${matchKey} (ID: ${currentMatch.id})`);
            } else {
              const reasons = findDifferences(firstMatch, currentMatch);
              skippedMatches.push({
                teamNumber: currentMatch.matchInfo?.teamNumber,
                matchNumber: currentMatch.matchInfo?.matchNumber,
                id: currentMatch.id,
                reason: `Different data: ${reasons.join(', ')}`
              });
              console.log(`NOT a duplicate: ${currentMatch.id} - Differences: ${reasons.join(', ')}`);
            }
          } catch (error) {
            console.error(`Error processing match ${matchList[i].id}:`, error);
            skippedMatches.push({
              id: matchList[i].id,
              reason: `Error: ${error.message}`
            });
          }
        }
        
        totalDuplicates += actualDuplicatesInGroup;
      }
    }
    
    return {
      totalMatches: matches.length,
      duplicatesFound: totalDuplicates,
      duplicatesDeleted: deletedCount,
      deletedMatches: deletedMatches,
      skippedMatches: skippedMatches
    };
    
  } catch (error) {
    console.error("Error removing duplicate matches:", error);
    throw error;
  }
};

// Helper function to check if two matches are identical in all important aspects
function areMatchesIdentical(match1, match2) {
  // Ignore id and timestamp, compare everything else field by field
  // Compare matchInfo (except scouterInitials which can differ)
  if (String(match1.matchInfo?.teamNumber) !== String(match2.matchInfo?.teamNumber)) return false;
  if (String(match1.matchInfo?.matchNumber) !== String(match2.matchInfo?.matchNumber)) return false;
  if (String(match1.matchInfo?.alliance) !== String(match2.matchInfo?.alliance)) return false;
  
  // Compare scores
  if (!objectsEqual(match1.scores, match2.scores)) return false;
  
  // Compare teleop
  if (!objectsEqual(match1.teleop, match2.teleop)) return false;
  
  // Compare autonomous
  if (!objectsEqual(match1.autonomous, match2.autonomous)) return false;
  
  // Compare endgame
  if (!objectsEqual(match1.endgame, match2.endgame)) return false;
  
  // Compare additional
  if (!objectsEqual(match1.additional, match2.additional)) return false;
  
  // If we get here, all important fields match
  return true;
}

// Helper function to find what fields differ between matches (for better reporting)
function findDifferences(match1, match2) {
  const differences = [];
  
  // Check matchInfo differences
  if (String(match1.matchInfo?.alliance) !== String(match2.matchInfo?.alliance)) {
    differences.push('alliance');
  }
  
  // Check other major sections
  if (!objectsEqual(match1.scores, match2.scores)) {
    differences.push('scores');
  }
  
  if (!objectsEqual(match1.teleop, match2.teleop)) {
    differences.push('teleop');
  }
  
  if (!objectsEqual(match1.autonomous, match2.autonomous)) {
    differences.push('autonomous');
  }
  
  if (!objectsEqual(match1.endgame, match2.endgame)) {
    differences.push('endgame');
  }
  
  if (!objectsEqual(match1.additional, match2.additional)) {
    differences.push('additional');
  }
  
  return differences.length > 0 ? differences : ['unknown'];
}

// Deep comparison of objects
function objectsEqual(obj1, obj2) {
  // Handle null/undefined
  if (!obj1 && !obj2) return true;
  if (!obj1 || !obj2) return false;
  
  // Get all keys from both objects
  const keys1 = Object.keys(obj1 || {});
  const keys2 = Object.keys(obj2 || {});
  
  // If number of keys differs, objects are different
  if (keys1.length !== keys2.length) return false;
  
  // Check each key/value pair
  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];
    
    // Handle nested objects
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      if (!objectsEqual(val1, val2)) return false;
    } 
    // Handle primitives - convert to string for consistent comparison
    else if (String(val1) !== String(val2)) {
      return false;
    }
  }
  
  return true;
} 