import React, { useState } from 'react';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import { removeDuplicateMatches } from '../utils/duplicateRemover';
import './AdminTools.css';
import { db } from '../firebase';

function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dryRun, setDryRun] = useState(true); // Default to dry run for safety
  
  const handleRemoveDuplicates = async () => {
    const confirmMessage = dryRun 
      ? 'This will scan for duplicates without deleting anything. Continue?'
      : 'WARNING: This will PERMANENTLY DELETE duplicate matches. Are you absolutely sure you want to continue?';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const db = getFirestore();
      
      // We'll modify the function to support dry run mode
      // For now we'll just simulate it by showing what would be deleted
      let stats;
      
      if (dryRun) {
        // In dry run mode, we'll detect duplicates but not delete them
        console.log("Starting DRY RUN duplicate detection");
        stats = await identifyDuplicates(db);
      } else {
        // Only delete in non-dry-run mode
        console.log("Starting LIVE duplicate deletion");
        stats = await removeDuplicateMatches(db);
      }
      
      setResult({
        ...stats,
        dryRun
      });
      console.log('Duplicate operation stats:', stats);
    } catch (err) {
      setError(err.message);
      console.error('Error in duplicate operation:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // A "preview" function that uses the same detection logic but doesn't delete
  const identifyDuplicates = async (db, collectionName = "scoutingDataChamps") => {
    // We'll reuse most of the removeDuplicateMatches code but skip the deleteDoc calls
    const matchesSnapshot = await getDocs(collection(db, collectionName));
    const matches = [];
    
    matchesSnapshot.forEach((docSnapshot) => {
      matches.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });
    
    // Group matches by team+match number
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
    
    // Find duplicates but don't delete them
    let totalDuplicates = 0;
    const wouldDelete = [];
    const wouldSkip = [];
    
    for (const [matchKey, matchList] of Object.entries(matchGroups)) {
      if (matchList.length > 1) {
        let actualDuplicatesInGroup = 0;
        const firstMatch = matchList[0];
        
        for (let i = 1; i < matchList.length; i++) {
          const currentMatch = matchList[i];
          
          // Helper functions that should be identical to those in duplicateRemover.js
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
          
          function findDifferences(match1, match2) {
            const differences = [];
            
            // Check matchInfo differences (except scouterInitials)
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
          
          function areMatchesIdentical(match1, match2) {
            // Ignore id and timestamp, compare everything else field by field
            // Compare matchInfo (except scouterInitials)
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
          
          // Use our helper to check if matches are truly identical
          const isDuplicate = areMatchesIdentical(firstMatch, currentMatch);
          
          if (isDuplicate) {
            actualDuplicatesInGroup++;
            wouldDelete.push({
              teamNumber: currentMatch.matchInfo?.teamNumber,
              matchNumber: currentMatch.matchInfo?.matchNumber,
              id: currentMatch.id
            });
          } else {
            const reasons = findDifferences(firstMatch, currentMatch);
            wouldSkip.push({
              teamNumber: currentMatch.matchInfo?.teamNumber,
              matchNumber: currentMatch.matchInfo?.matchNumber,
              id: currentMatch.id,
              reason: `Different data: ${reasons.join(', ')}`
            });
          }
        }
        
        totalDuplicates += actualDuplicatesInGroup;
      }
    }
    
    return {
      totalMatches: matches.length,
      duplicatesFound: totalDuplicates,
      duplicatesDeleted: 0, // Nothing actually deleted in dry run
      deletedMatches: [], // Empty in dry run
      wouldDelete: wouldDelete, // What would be deleted in a real run
      wouldSkip: wouldSkip // What would be skipped in a real run
    };
  };
  
  return (
    <div className="admin-tools">
      <h2>Admin Tools</h2>
      
      <div className="card">
        <h3>Data Cleanup</h3>
        
        <div className="option-toggle">
          <label>
            <input 
              type="checkbox" 
              checked={dryRun} 
              onChange={() => setDryRun(!dryRun)}
            />
            Dry Run Mode (preview duplicates without deleting)
          </label>
        </div>
        
        <button 
          onClick={handleRemoveDuplicates} 
          disabled={loading}
          className={dryRun ? "primary-button" : "danger-button"}
        >
          {loading ? 'Processing...' : dryRun ? 
            'Find Duplicate Matches (Safe Preview)' : 
            'REMOVE Duplicate Matches (Permanent)'}
        </button>
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="result-box">
            <h4>{result.dryRun ? 'Duplicate Detection Results (DRY RUN)' : 'Duplicate Removal Results'}</h4>
            <ul>
              <li>Total matches processed: {result.totalMatches}</li>
              <li>Duplicate matches found: {result.duplicatesFound}</li>
              {!result.dryRun && (
                <li>Duplicates successfully deleted: {result.duplicatesDeleted}</li>
              )}
              {result.dryRun && (
                <li><strong>No matches were deleted</strong> (dry run mode)</li>
              )}
            </ul>
            
            {result.dryRun && result.wouldDelete && result.wouldDelete.length > 0 && (
              <>
                <h4>Matches That Would Be Deleted (TRUE Duplicates):</h4>
                <div className="scrollable-list">
                  <ul>
                    {result.wouldDelete.map((match, index) => (
                      <li key={index}>
                        Team {match.teamNumber}, Match {match.matchNumber} (ID: {match.id})
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {result.dryRun && result.wouldSkip && result.wouldSkip.length > 0 && (
              <>
                <h4>Same Team/Match Number But NOT Duplicates (Would Skip):</h4>
                <div className="scrollable-list">
                  <ul>
                    {result.wouldSkip.map((match, index) => (
                      <li key={index}>
                        Team {match.teamNumber}, Match {match.matchNumber} (ID: {match.id}) - {match.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {!result.dryRun && result.deletedMatches && result.deletedMatches.length > 0 && (
              <>
                <h4>Deleted Matches:</h4>
                <div className="scrollable-list">
                  <ul>
                    {result.deletedMatches.map((match, index) => (
                      <li key={index}>
                        Team {match.teamNumber}, Match {match.matchNumber} (ID: {match.id})
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            
            {!result.dryRun && result.skippedMatches && result.skippedMatches.length > 0 && (
              <>
                <h4>Skipped Matches:</h4>
                <div className="scrollable-list">
                  <ul>
                    {result.skippedMatches.map((match, index) => (
                      <li key={index}>
                        Team {match.teamNumber || '?'}, Match {match.matchNumber || '?'} 
                        (ID: {match.id}) - Reason: {match.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTools; 