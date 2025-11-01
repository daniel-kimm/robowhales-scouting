import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase.client.js';
import { Pencil, Trash2, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

function MatchTable({ matches, onSelectMatch, onMatchUpdated }) {
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState({});
  
  // Sort matches by match number (ascending)
  const sortedMatches = [...matches].sort((a, b) => {
    const matchNumA = parseInt(a.matchInfo?.matchNumber || '0');
    const matchNumB = parseInt(b.matchInfo?.matchNumber || '0');
    return matchNumA - matchNumB;
  });

  // Group matches by match number
  const groupedMatches = sortedMatches.reduce((acc, match) => {
    const matchNum = match.matchInfo?.matchNumber || 'Unknown';
    if (!acc[matchNum]) {
      acc[matchNum] = [];
    }
    acc[matchNum].push(match);
    return acc;
  }, {});

  // Toggle match group expansion
  const toggleMatchExpansion = (matchNum) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchNum]: !prev[matchNum]
    }));
  };
  
  const handleRowClick = (match) => {
    if (onSelectMatch) {
      onSelectMatch(match);
    }
    setSelectedMatchDetails(match);
  };
  
  const closeModal = () => {
    setSelectedMatchDetails(null);
    setIsEditing(false);
    setEditedMatch(null);
    setShowDeleteConfirm(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedMatch(JSON.parse(JSON.stringify(selectedMatchDetails)));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedMatch(null);
  };

  const handleInputChange = (section, field, value) => {
    setEditedMatch(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNumberBlur = (section, field, value) => {
    // If the field is empty or invalid, set it to 0
    const numValue = value === '' || value === null || value === undefined ? 0 : parseInt(value) || 0;
    setEditedMatch(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numValue
      }
    }));
  };

  const calculateScores = (matchData) => {
    // Coral points calculation
    const calculateCoralPoints = (level, count, isAuto) => {
      if (isAuto) {
        switch(level) {
          case 1: return count * 3;
          case 2: return count * 4;
          case 3: return count * 6;
          case 4: return count * 7;
          default: return 0;
        }
      } else {
        switch(level) {
          case 1: return count * 2;
          case 2: return count * 3;
          case 3: return count * 4;
          case 4: return count * 5;
          default: return 0;
        }
      }
    };

    const autoPoints = 
      calculateCoralPoints(1, matchData.autonomous.coralLevel1 || 0, true) +
      calculateCoralPoints(2, matchData.autonomous.coralLevel2 || 0, true) +
      calculateCoralPoints(3, matchData.autonomous.coralLevel3 || 0, true) +
      calculateCoralPoints(4, matchData.autonomous.coralLevel4 || 0, true) +
      (matchData.autonomous.algaeProcessor || 0) * 6 +
      (matchData.autonomous.algaeNet || 0) * 4 +
      (matchData.autonomous.mobility ? 3 : 0);

    const teleopPoints = 
      calculateCoralPoints(1, matchData.teleop.coralLevel1 || 0, false) +
      calculateCoralPoints(2, matchData.teleop.coralLevel2 || 0, false) +
      calculateCoralPoints(3, matchData.teleop.coralLevel3 || 0, false) +
      calculateCoralPoints(4, matchData.teleop.coralLevel4 || 0, false) +
      (matchData.teleop.algaeProcessor || 0) * 6 +
      (matchData.teleop.algaeNet || 0) * 4;

    const bargePoints = 
      (matchData.endgame.robotParked ? 2 : 0) +
      (matchData.endgame.shallowCageClimb ? 6 : 0) +
      (matchData.endgame.deepCageClimb ? 12 : 0);

    return {
      autoPoints,
      teleopPoints,
      bargePoints,
      totalPoints: autoPoints + teleopPoints + bargePoints
    };
  };

  const handleSaveEdit = async () => {
    try {
      // Recalculate scores
      const updatedScores = calculateScores(editedMatch);
      const updatedMatch = {
        ...editedMatch,
        scores: updatedScores
      };

      // Update in Firestore
      const matchRef = doc(db, 'scoutingDataThor', selectedMatchDetails.id);
      await updateDoc(matchRef, updatedMatch);

      // Update local state
      setSelectedMatchDetails(updatedMatch);
      setIsEditing(false);
      setEditedMatch(null);

      // Notify parent component to refresh data
      if (onMatchUpdated) {
        onMatchUpdated();
      }

      alert('Match updated successfully!');
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Error updating match: ' + error.message);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      // Delete from Firestore
      const matchRef = doc(db, 'scoutingDataThor', selectedMatchDetails.id);
      await deleteDoc(matchRef);

      // Close modal and notify parent
      closeModal();
      
      if (onMatchUpdated) {
        onMatchUpdated();
      }

      alert('Match deleted successfully!');
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Error deleting match: ' + error.message);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Helper to render editable field
  const renderField = (section, field, type = 'number', label) => {
    const displayMatch = isEditing ? editedMatch : selectedMatchDetails;
    const value = displayMatch[section]?.[field];

    if (!isEditing) {
      if (type === 'checkbox') {
        return value ? 'Yes' : 'No';
      }
      return value || (type === 'number' ? 0 : 'N/A');
    }

    // Edit mode
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => handleInputChange(section, field, e.target.checked)}
        />
      );
    }
    
    if (type === 'number') {
      return (
        <input
          type="number"
          value={value === 0 ? '0' : (value || '')}
          onChange={(e) => handleInputChange(section, field, e.target.value === '' ? '' : parseInt(e.target.value))}
          onBlur={(e) => handleNumberBlur(section, field, e.target.value)}
          className="edit-input"
          min="0"
        />
      );
    }
    
    if (type === 'text') {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleInputChange(section, field, e.target.value)}
          className="edit-input"
        />
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => handleInputChange(section, field, e.target.value)}
          className="edit-textarea"
          rows="4"
        />
      );
    }

    return value || 'N/A';
  };

  return (
    <div className="match-table">
      <div className="match-groups">
        {Object.entries(groupedMatches).map(([matchNum, matchGroup]) => {
          const isExpanded = expandedMatches[matchNum];
          const matchCount = matchGroup.length;
          
          return (
            <div key={matchNum} className="match-group">
              <div 
                className="match-group-header"
                onClick={() => toggleMatchExpansion(matchNum)}
              >
                <div className="match-group-title">
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <span className="match-number">Match {matchNum}</span>
                  <span className="team-count">({matchCount} {matchCount === 1 ? 'team' : 'teams'})</span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="match-group-table-wrapper">
                  <table className="match-group-table">
                    <thead>
                      <tr>
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
                      {matchGroup.map((match) => (
                        <tr 
                          key={match.id} 
                          onClick={() => handleRowClick(match)}
                          className="match-row"
                        >
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
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Match Details Modal */}
      {selectedMatchDetails && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Match {selectedMatchDetails.matchInfo?.matchNumber} Details</h2>
              <div className="modal-actions">
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button 
                      className="icon-button edit-button" 
                      onClick={handleEditClick}
                      title="Edit match"
                    >
                      <Pencil size={20} />
                    </button>
                    <button 
                      className="icon-button delete-button" 
                      onClick={handleDeleteClick}
                      title="Delete match"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
                <button className="modal-close" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="delete-confirmation">
                  <h3>
                    <AlertTriangle size={24} color="#dc2626" />
                    Confirm Delete
                  </h3>
                  <p>Are you sure you want to delete this match? This action cannot be undone.</p>
                  <p><strong>Match #{selectedMatchDetails.matchInfo?.matchNumber} - Team {selectedMatchDetails.matchInfo?.teamNumber}</strong></p>
                  <div className="delete-actions">
                    <button className="cancel-button" onClick={handleCancelDelete}>Cancel</button>
                    <button className="confirm-delete-button" onClick={handleConfirmDelete}>Delete Match</button>
                  </div>
                </div>
              )}

              {/* Edit/Save Actions */}
              {isEditing && !showDeleteConfirm && (
                <div className="edit-actions">
                  <button className="save-button" onClick={handleSaveEdit}>Save Changes</button>
                  <button className="cancel-button" onClick={handleCancelEdit}>Cancel</button>
                </div>
              )}

              {/* View/Edit Content */}
              {!showDeleteConfirm && (
                <>
                  {/* Match Info Section */}
                  <div className="match-detail-section">
                <h3>Match Information</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Team Number:</div>
                    <div className="detail-value">{renderField('matchInfo', 'teamNumber', 'text')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Match Number:</div>
                    <div className="detail-value">{renderField('matchInfo', 'matchNumber', 'text')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Alliance:</div>
                    <div className="detail-value">
                      {isEditing ? (
                        <select
                          value={editedMatch.matchInfo?.alliance || ''}
                          onChange={(e) => handleInputChange('matchInfo', 'alliance', e.target.value)}
                          className="edit-input"
                        >
                          <option value="">Select</option>
                          <option value="red">Red</option>
                          <option value="blue">Blue</option>
                        </select>
                      ) : (
                        selectedMatchDetails.matchInfo?.alliance || 'Unknown'
                      )}
                    </div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Scouter:</div>
                    <div className="detail-value">{renderField('matchInfo', 'scouterInitials', 'text')}</div>
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
                    <div className="detail-value">{renderField('autonomous', 'mobility', 'checkbox')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 1:</div>
                    <div className="detail-value">{renderField('autonomous', 'coralLevel1')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 2:</div>
                    <div className="detail-value">{renderField('autonomous', 'coralLevel2')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 3:</div>
                    <div className="detail-value">{renderField('autonomous', 'coralLevel3')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 4:</div>
                    <div className="detail-value">{renderField('autonomous', 'coralLevel4')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Processor:</div>
                    <div className="detail-value">{renderField('autonomous', 'algaeProcessor')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Net:</div>
                    <div className="detail-value">{renderField('autonomous', 'algaeNet')}</div>
                  </div>
                </div>
              </div>
              
              {/* Teleop Section */}
              <div className="match-detail-section teleop">
                <h3>Teleop Period</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 1:</div>
                    <div className="detail-value">{renderField('teleop', 'coralLevel1')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 2:</div>
                    <div className="detail-value">{renderField('teleop', 'coralLevel2')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 3:</div>
                    <div className="detail-value">{renderField('teleop', 'coralLevel3')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Coral Level 4:</div>
                    <div className="detail-value">{renderField('teleop', 'coralLevel4')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Processor:</div>
                    <div className="detail-value">{renderField('teleop', 'algaeProcessor')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Net:</div>
                    <div className="detail-value">{renderField('teleop', 'algaeNet')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Algae Descored:</div>
                    <div className="detail-value">{renderField('teleop', 'algaeDescored')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Missed Cycles:</div>
                    <div className="detail-value">{renderField('teleop', 'missedCycles')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Cycle Time:</div>
                    <div className="detail-value">{renderField('teleop', 'cycleTime', 'text')}</div>
                  </div>
                </div>
              </div>
              
              {/* Endgame Section */}
              <div className="match-detail-section endgame">
                <h3>Endgame</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Parked:</div>
                    <div className="detail-value">{renderField('endgame', 'robotParked', 'checkbox')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Shallow Cage Climb:</div>
                    <div className="detail-value">{renderField('endgame', 'shallowCageClimb', 'checkbox')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Deep Cage Climb:</div>
                    <div className="detail-value">{renderField('endgame', 'deepCageClimb', 'checkbox')}</div>
                  </div>
                </div>
              </div>
              
              {/* Additional Section */}
              <div className="match-detail-section additional">
                <h3>Additional Information</h3>
                <div className="match-detail-grid">
                  <div className="match-detail-item">
                    <div className="detail-label">Played Defense:</div>
                    <div className="detail-value">{renderField('additional', 'playedDefense', 'checkbox')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Defense Rating:</div>
                    <div className="detail-value">{renderField('additional', 'defenseRating')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Driver Skill:</div>
                    <div className="detail-value">{renderField('additional', 'driverSkill')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Speed:</div>
                    <div className="detail-value">{renderField('additional', 'robotSpeed')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Died:</div>
                    <div className="detail-value">{renderField('additional', 'robotDied', 'checkbox')}</div>
                  </div>
                  <div className="match-detail-item">
                    <div className="detail-label">Robot Tipped:</div>
                    <div className="detail-value">{renderField('additional', 'robotTipped', 'checkbox')}</div>
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div className="match-detail-section notes">
                <h3>Scouter Notes</h3>
                <div className="notes-container">
                  {isEditing ? (
                    renderField('additional', 'notes', 'textarea')
                  ) : (
                    selectedMatchDetails.additional?.notes ? (
                      <div className="note-text">{selectedMatchDetails.additional.notes}</div>
                    ) : (
                      <p className="no-notes">No notes for this match.</p>
                    )
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchTable;
