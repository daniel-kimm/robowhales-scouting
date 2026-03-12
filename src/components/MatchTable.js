import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase.client.js';
import { Pencil, Trash2, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const CLIMB_OPTIONS = [
  { value: 'level1', label: 'Level 1' },
  { value: 'level2', label: 'Level 2' },
  { value: 'level3', label: 'Level 3' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'notAttempted', label: 'Not Attempted' }
];

const AUTO_CLIMB_OPTIONS = [
  { value: 'climbed', label: 'Climbed' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'notAttempted', label: 'Not Attempted' }
];

const DRIVER_SKILL_OPTIONS = [
  { value: 'notEffective', label: 'Not Effective' },
  { value: 'average', label: 'Average' },
  { value: 'veryEffective', label: 'Very Effective' },
  { value: 'notObserved', label: 'Not Observed' }
];

const DEFENSE_RATING_OPTIONS = [
  { value: 'belowAverage', label: 'Below Average' },
  { value: 'average', label: 'Average' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'didNotPlayDefense', label: 'Did Not Play Defense' }
];

const SPEED_RATING_OPTIONS = [
  { value: '1', label: '1 (Slow)' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5 (Fast)' }
];

const labelFor = (value, options) => {
  const opt = options.find(o => o.value === value);
  return opt ? opt.label : (value || 'N/A');
};

function MatchTable({ matches, onSelectMatch, onMatchUpdated }) {
  const [selectedMatchDetails, setSelectedMatchDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMatch, setEditedMatch] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState({});
  
  const sortedMatches = [...matches].sort((a, b) => {
    return parseInt(a.matchInfo?.matchNumber || '0') - parseInt(b.matchInfo?.matchNumber || '0');
  });

  const groupedMatches = sortedMatches.reduce((acc, match) => {
    const matchNum = match.matchInfo?.matchNumber || 'Unknown';
    if (!acc[matchNum]) acc[matchNum] = [];
    acc[matchNum].push(match);
    return acc;
  }, {});

  const toggleMatchExpansion = (matchNum) => {
    setExpandedMatches(prev => ({ ...prev, [matchNum]: !prev[matchNum] }));
  };
  
  const handleRowClick = (match) => {
    if (onSelectMatch) onSelectMatch(match);
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
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleNumberBlur = (section, field, value) => {
    const numValue = value === '' || value === null || value === undefined ? 0 : parseInt(value) || 0;
    setEditedMatch(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: numValue }
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const updatedMatch = { ...editedMatch };

      const matchRef = doc(db, 'scoutingDataAsheville26', selectedMatchDetails.id);
      await updateDoc(matchRef, updatedMatch);

      setSelectedMatchDetails(updatedMatch);
      setIsEditing(false);
      setEditedMatch(null);

      if (onMatchUpdated) onMatchUpdated();
      alert('Match updated successfully!');
    } catch (error) {
      console.error('Error updating match:', error);
      alert('Error updating match: ' + error.message);
    }
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);

  const handleConfirmDelete = async () => {
    try {
      const matchRef = doc(db, 'scoutingDataAsheville26', selectedMatchDetails.id);
      await deleteDoc(matchRef);
      closeModal();
      if (onMatchUpdated) onMatchUpdated();
      alert('Match deleted successfully!');
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Error deleting match: ' + error.message);
    }
  };

  // Render a field in view or edit mode
  const renderField = (section, field, type = 'number') => {
    const displayMatch = isEditing ? editedMatch : selectedMatchDetails;
    const value = displayMatch[section]?.[field];

    if (!isEditing) {
      if (type === 'checkbox') return value ? 'Yes' : 'No';
      return value || (type === 'number' ? 0 : 'N/A');
    }

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

  // Render a select dropdown for radio-style fields
  const renderSelect = (section, field, options) => {
    const displayMatch = isEditing ? editedMatch : selectedMatchDetails;
    const value = displayMatch[section]?.[field];

    if (!isEditing) {
      return labelFor(value, options);
    }

    return (
      <select
        value={value || ''}
        onChange={(e) => handleInputChange(section, field, e.target.value)}
        className="edit-input"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  };

  // Calculate summary point values for the table row
  const getAutoPoints = (match) => {
    const auto = match.autonomous || {};
    const fuelPts = (auto.fuelScored || 0) * 1;
    const climbPts = auto.climbL1 === 'climbed' ? 15 : 0;
    return fuelPts + climbPts;
  };

  const getTeleopPoints = (match) => {
    const teleop = match.teleop || {};
    return (teleop.fuelScored || 0) * 1;
  };

  const getEndgamePoints = (match) => {
    const climb = match.endgame?.climb;
    switch(climb) {
      case 'level1': return 10;
      case 'level2': return 20;
      case 'level3': return 30;
      default: return 0;
    }
  };

  const getEndgameLabel = (match) => {
    const climb = match.endgame?.climb;
    const pts = getEndgamePoints(match);
    const label = labelFor(climb, CLIMB_OPTIONS);
    return pts > 0 ? `${label} (${pts})` : label;
  };

  return (
    <div className="match-table">
      <div className="match-groups">
        {Object.entries(groupedMatches).map(([matchNum, matchGroup]) => {
          const isExpanded = expandedMatches[matchNum];
          const matchCount = matchGroup.length;
          
          return (
            <div key={matchNum} className="match-group">
              <div className="match-group-header" onClick={() => toggleMatchExpansion(matchNum)}>
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
                      </tr>
                    </thead>
                    <tbody>
                      {matchGroup.map((match) => (
                        <tr key={match.id} onClick={() => handleRowClick(match)} className="match-row">
                          <td>{match.matchInfo?.teamNumber || 'N/A'}</td>
                          <td className={match.matchInfo?.alliance || 'unknown'}>
                            {match.matchInfo?.alliance || 'Unknown'}
                          </td>
                          <td>{match.matchInfo?.scouterInitials || '—'}</td>
                          <td>{getAutoPoints(match)}</td>
                          <td>{getTeleopPoints(match)}</td>
                          <td>{getEndgameLabel(match)}</td>
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
                    <button className="icon-button edit-button" onClick={handleEditClick} title="Edit match">
                      <Pencil size={20} />
                    </button>
                    <button className="icon-button delete-button" onClick={handleDeleteClick} title="Delete match">
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
                    <button className="cancel-button" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
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

              {!showDeleteConfirm && (
                <>
                  {/* Match Info */}
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
                  
                  {/* Autonomous */}
                  <div className="match-detail-section auto">
                    <h3>Autonomous Period</h3>
                    <div className="match-detail-grid">
                      <div className="match-detail-item">
                        <div className="detail-label">Fuel Scored:</div>
                        <div className="detail-value">{renderField('autonomous', 'fuelScored')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pass From Neutral Zone:</div>
                        <div className="detail-value">{renderField('autonomous', 'passFromNeutralZone')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Climb L1:</div>
                        <div className="detail-value">{renderSelect('autonomous', 'climbL1', AUTO_CLIMB_OPTIONS)}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Depot:</div>
                        <div className="detail-value">{renderField('autonomous', 'pickupFromDepot', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Outpost:</div>
                        <div className="detail-value">{renderField('autonomous', 'pickupFromOutpost', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Neutral Zone:</div>
                        <div className="detail-value">{renderField('autonomous', 'pickupFromNeutralZone', 'checkbox')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Teleop */}
                  <div className="match-detail-section teleop">
                    <h3>Teleop Period</h3>
                    <div className="match-detail-grid">
                      <div className="match-detail-item">
                        <div className="detail-label">Fuel Scored:</div>
                        <div className="detail-value">{renderField('teleop', 'fuelScored')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pass From Neutral Zone:</div>
                        <div className="detail-value">{renderField('teleop', 'passFromNeutralZone')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pass From Opp Alliance Zone:</div>
                        <div className="detail-value">{renderField('teleop', 'passFromOppAllianceZone')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Depot:</div>
                        <div className="detail-value">{renderField('teleop', 'pickupFromDepot', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Outpost:</div>
                        <div className="detail-value">{renderField('teleop', 'pickupFromOutpost', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Pickup: Neutral Zone:</div>
                        <div className="detail-value">{renderField('teleop', 'pickupFromNeutralZone', 'checkbox')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Endgame */}
                  <div className="match-detail-section endgame">
                    <h3>Endgame</h3>
                    <div className="match-detail-grid">
                      <div className="match-detail-item">
                        <div className="detail-label">Climb:</div>
                        <div className="detail-value">{renderSelect('endgame', 'climb', CLIMB_OPTIONS)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional */}
                  <div className="match-detail-section additional">
                    <h3>Additional Information</h3>
                    <div className="match-detail-grid">
                      <div className="match-detail-item">
                        <div className="detail-label">Driver Skill:</div>
                        <div className="detail-value">{renderSelect('additional', 'driverSkill', DRIVER_SKILL_OPTIONS)}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Defense Rating:</div>
                        <div className="detail-value">{renderSelect('additional', 'defenseRating', DEFENSE_RATING_OPTIONS)}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Speed Rating:</div>
                        <div className="detail-value">{renderSelect('additional', 'speedRating', SPEED_RATING_OPTIONS)}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Crossed Bump:</div>
                        <div className="detail-value">{renderField('additional', 'crossedBump', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Crossed Trench:</div>
                        <div className="detail-value">{renderField('additional', 'crossedTrench', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Died/Immobilized:</div>
                        <div className="detail-value">{renderField('additional', 'diedImmobilized', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Good Alliance Partner:</div>
                        <div className="detail-value">{renderField('additional', 'makeGoodAlliancePartner', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Was Defended:</div>
                        <div className="detail-value">{renderField('additional', 'wasDefended', 'checkbox')}</div>
                      </div>
                      <div className="match-detail-item">
                        <div className="detail-label">Excessive Penalties:</div>
                        <div className="detail-value">{renderField('additional', 'excessivePenalties', 'checkbox')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div className="match-detail-section notes">
                    <h3>Scouter Notes</h3>
                    <div className="match-detail-grid">
                      <div className="match-detail-item full-width-item">
                        <div className="detail-label">On Cycle Notes:</div>
                        <div className="detail-value">
                          {isEditing ? (
                            renderField('additional', 'onCycleNotes', 'textarea')
                          ) : (
                            selectedMatchDetails.additional?.onCycleNotes || <span className="no-notes">—</span>
                          )}
                        </div>
                      </div>
                      <div className="match-detail-item full-width-item">
                        <div className="detail-label">Off Cycle Notes:</div>
                        <div className="detail-value">
                          {isEditing ? (
                            renderField('additional', 'offCycleNotes', 'textarea')
                          ) : (
                            selectedMatchDetails.additional?.offCycleNotes || <span className="no-notes">—</span>
                          )}
                        </div>
                      </div>
                      <div className="match-detail-item full-width-item">
                        <div className="detail-label">General Notes:</div>
                        <div className="detail-value">
                          {isEditing ? (
                            renderField('additional', 'generalNotes', 'textarea')
                          ) : (
                            selectedMatchDetails.additional?.generalNotes || <span className="no-notes">—</span>
                          )}
                        </div>
                      </div>
                      {selectedMatchDetails.additional?.notes && !selectedMatchDetails.additional?.onCycleNotes && !selectedMatchDetails.additional?.offCycleNotes && !selectedMatchDetails.additional?.generalNotes && (
                        <div className="match-detail-item full-width-item">
                          <div className="detail-label">Notes (legacy):</div>
                          <div className="detail-value">
                            {isEditing ? (
                              renderField('additional', 'notes', 'textarea')
                            ) : (
                              selectedMatchDetails.additional.notes
                            )}
                          </div>
                        </div>
                      )}
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
