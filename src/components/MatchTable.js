import React, { useState } from 'react';

function MatchTable({ matches, onSelectMatch }) {
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);
  
  // Sort matches by match number (ascending)
  const sortedMatches = [...matches].sort((a, b) => {
    const matchNumA = parseInt(a.matchInfo?.matchNumber || '0');
    const matchNumB = parseInt(b.matchInfo?.matchNumber || '0');
    return matchNumA - matchNumB;
  });
  
  const handleRowClick = (match) => {
    if (onSelectMatch) {
      onSelectMatch(match);
    }
    setSelectedMatchDetails(match);
  };
  
  const closeModal = () => {
    setSelectedMatchDetails(null);
  };

  return (
    <div className="match-table">
      <table>
        <thead>
          <tr>
            <th>Match</th>
            <th>Team</th>
            <th>Alliance</th>
            <th>Scouter</th>
            <th>Auto</th>
            <th>Teleop</th>
            <th>Endgame</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sortedMatches.map((match) => (
            <tr 
              key={match.id} 
              onClick={() => handleRowClick(match)}
              className="match-row"
            >
              <td>{match.matchInfo?.matchNumber || 'N/A'}</td>
              <td>{match.matchInfo?.teamNumber || 'N/A'}</td>
              <td className={match.matchInfo?.alliance || 'unknown'}>
                {match.matchInfo?.alliance || 'Unknown'}
              </td>
              <td>{match.matchInfo?.scouterInitials || '—'}</td>
              <td>{match.scores?.autoPoints || 0}</td>
              <td>{match.scores?.teleopPoints || 0}</td>
              <td>{match.scores?.bargePoints || 0}</td>
              <td>{match.scores?.totalPoints || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Match Details Modal */}
      {selectedMatchDetails && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Match {selectedMatchDetails.matchInfo?.matchNumber} Details</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Match Info Section */}
              <div className="match-detail-section">
                <h3>Match Information</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Team Number:</div>
                    <div className="detail-value">{selectedMatchDetails.matchInfo?.teamNumber || 'N/A'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Match Number:</div>
                    <div className="detail-value">{selectedMatchDetails.matchInfo?.matchNumber || 'N/A'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Alliance:</div>
                    <div className={`detail-value ${selectedMatchDetails.matchInfo?.alliance || 'unknown'}`}>
                      {selectedMatchDetails.matchInfo?.alliance || 'Unknown'}
                    </div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Scouter:</div>
                    <div className="detail-value">{selectedMatchDetails.matchInfo?.scouterInitials || 'Unknown'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Timestamp:</div>
                    <div className="detail-value">
                      {selectedMatchDetails.timestamp ? new Date(selectedMatchDetails.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Autonomous Section */}
              <div className="match-detail-section auto">
                <h3>Autonomous Period</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Mobility:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.mobility ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 1:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.coralLevel1 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 2:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.coralLevel2 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 3:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.coralLevel3 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 4:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.coralLevel4 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Processor:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.algaeProcessor || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Net:</div>
                    <div className="detail-value">{selectedMatchDetails.autonomous?.algaeNet || 0}</div>
                  </div>
                </div>
              </div>
              
              {/* Teleop Section */}
              <div className="match-detail-section teleop">
                <h3>Teleop Period</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 1:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.coralLevel1 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 2:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.coralLevel2 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 3:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.coralLevel3 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 4:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.coralLevel4 || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Processor:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.algaeProcessor || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Net:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.algaeNet || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Descored:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.algaeDescored || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Missed Cycles:</div>
                    <div className="detail-value">{selectedMatchDetails.teleop?.missedCycles || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Cycle Time:</div>
                    <div className="detail-value">
                      {selectedMatchDetails.teleop?.cycleTime ? `${selectedMatchDetails.teleop.cycleTime} sec` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Endgame Section */}
              <div className="match-detail-section endgame">
                <h3>Endgame</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Parked:</div>
                    <div className="detail-value">{selectedMatchDetails.endgame?.robotParked ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Shallow Cage Climb:</div>
                    <div className="detail-value">{selectedMatchDetails.endgame?.shallowCageClimb ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Deep Cage Climb:</div>
                    <div className="detail-value">{selectedMatchDetails.endgame?.deepCageClimb ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              
              {/* Additional Section */}
              <div className="match-detail-section additional">
                <h3>Additional Information</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Played Defense:</div>
                    <div className="detail-value">{selectedMatchDetails.additional?.playedDefense ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Defense Rating:</div>
                    <div className="detail-value">
                      {selectedMatchDetails.additional?.playedDefense ? selectedMatchDetails.additional?.defenseRating || 'N/A' : 'N/A'}
                    </div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Driver Skill:</div>
                    <div className="detail-value">{selectedMatchDetails.additional?.driverSkill || 'N/A'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Speed:</div>
                    <div className="detail-value">{selectedMatchDetails.additional?.robotSpeed || 'N/A'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Died:</div>
                    <div className="detail-value">{selectedMatchDetails.additional?.robotDied ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Tipped:</div>
                    <div className="detail-value">{selectedMatchDetails.additional?.robotTipped ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div className="match-detail-section notes">
                <h3>Scouter Notes</h3>
                <div className="notes-container">
                  {selectedMatchDetails.additional?.notes ? (
                    <div className="note-text">{selectedMatchDetails.additional.notes}</div>
                  ) : (
                    <p className="no-notes">No notes for this match.</p>
                  )}
                </div>
              </div>
              
              {/* Score Summary Section */}
              <div className="match-detail-section score-summary">
                <h3>Score Summary</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Auto Points:</div>
                    <div className="detail-value">{selectedMatchDetails.scores?.autoPoints || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Teleop Points:</div>
                    <div className="detail-value">{selectedMatchDetails.scores?.teleopPoints || 0}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Endgame Points:</div>
                    <div className="detail-value">{selectedMatchDetails.scores?.bargePoints || 0}</div>
                  </div>
                  <div className="match-detail-item total-score">
                    <div className="detail-label">Total Points:</div>
                    <div className="detail-value">{selectedMatchDetails.scores?.totalPoints || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchTable;
