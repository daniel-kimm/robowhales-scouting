import React, { useState } from 'react';
import Counter from './Counter';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

function ScoutingForm() {
  const [formData, setFormData] = useState({
    matchInfo: {
      matchNumber: '',
      teamNumber: '',
      alliance: 'red',
      scouterInitials: ''
    },
    autonomous: {
      mobility: false,
      coralLevel1: 0,
      coralLevel2: 0,
      coralLevel3: 0,
      coralLevel4: 0,
      algaeProcessor: 0,
      algaeNet: 0
    },
    teleop: {
      coralLevel1: 0,
      coralLevel2: 0,
      coralLevel3: 0,
      coralLevel4: 0,
      algaeProcessor: 0,
      algaeNet: 0,
      algaeDescored: 0
    },
    endgame: {
      robotParked: false,
      shallowCageClimb: false,
      deepCageClimb: false
    },
    additional: {
      playedDefense: false,
      defenseRating: 5,
      driverSkill: 5,
      robotSpeed: 5,
      robotDied: false,
      robotTipped: false,
      notes: ''
    }
  });

  const handleInputChange = (section, field, value) => {
    // For debugging
    console.log(`Updating ${section}.${field} to:`, value);
    
    // If it's a number field, ensure it's stored properly
    if (field === 'teamNumber' || field === 'matchNumber') {
      // Store as string to prevent unexpected conversions
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      // Handle other fields normally
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    }
  };

  // Calculate points for coral based on level
  const calculateCoralPoints = (level, count, isAuto) => {
    if (isAuto) {
      // Autonomous scoring
      switch(level) {
        case 1: return count * 3; // Level 1: 3 points in auto
        case 2: return count * 4; // Level 2: 4 points in auto
        case 3: return count * 6; // Level 3: 6 points in auto
        case 4: return count * 7; // Level 4: 7 points in auto
        default: return 0;
      }
    } else {
      // Teleop scoring
      switch(level) {
        case 1: return count * 2; // Level 1: 2 points in teleop
        case 2: return count * 3; // Level 2: 3 points in teleop
        case 3: return count * 4; // Level 3: 4 points in teleop
        case 4: return count * 5; // Level 4: 5 points in teleop
        default: return 0;
      }
    }
  };

  // Calculate algae points
  const calculateAlgaePoints = (section) => {
    // Processor: 6 points each
    const processorPoints = section.algaeProcessor * 6;
    
    // Net: 4 points each
    const netPoints = section.algaeNet * 4;
    
    return processorPoints + netPoints;
  };

  // Calculate total points for a section (auto or teleop)
  const calculateSectionPoints = (section, isAuto) => {
    const coralPoints = 
      calculateCoralPoints(1, section[`coralLevel1`], isAuto) +
      calculateCoralPoints(2, section[`coralLevel2`], isAuto) +
      calculateCoralPoints(3, section[`coralLevel3`], isAuto) +
      calculateCoralPoints(4, section[`coralLevel4`], isAuto);
    
    const algaePoints = calculateAlgaePoints(section);
    
    // Add mobility points in auto
    const mobilityPoints = isAuto && section.mobility ? 3 : 0;
    
    return coralPoints + algaePoints + mobilityPoints;
  };

  // Calculate barge points
  const calculateBargePoints = () => {
    return (formData.endgame.robotParked ? 2 : 0) + 
           (formData.endgame.shallowCageClimb ? 6 : 0) + 
           (formData.endgame.deepCageClimb ? 12 : 0);
  };

  // Calculate total score
  const calculateTotalScore = () => {
    const autoPoints = calculateSectionPoints(formData.autonomous, true);
    const teleopPoints = calculateSectionPoints(formData.teleop, false);
    const bargePoints = calculateBargePoints();
    
    return {
      autoPoints,
      teleopPoints,
      bargePoints,
      totalPoints: autoPoints + teleopPoints + bargePoints
    };
  };

  const handleEndgamePositionChange = (position) => {
    // Create an object with all positions set to false
    const positions = {
      robotParked: false,
      shallowCageClimb: false,
      deepCageClimb: false
    };
    
    // Set the selected position to true
    positions[position] = !formData.endgame[position];
    
    // Update the form data with the new positions
    setFormData({
      ...formData,
      endgame: {
        ...formData.endgame,
        ...positions
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate scores
    const scoreData = calculateTotalScore();
    
    // Prepare data for submission
    const submissionData = {
      ...formData,
      scores: scoreData,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Save to Firestore
      await saveMatchData(submissionData);
      
      // Reset form
      alert('Match data submitted successfully!');
      resetForm();
    } catch (error) {
      console.error("Error submitting data: ", error);
      alert('Error submitting data: ' + error.message);
    }
  };
  
  const resetForm = () => {
    setFormData({
      matchInfo: {
        matchNumber: '',
        teamNumber: '',
        alliance: 'red',
        scouterInitials: ''
      },
      autonomous: {
        mobility: false,
        coralLevel1: 0,
        coralLevel2: 0,
        coralLevel3: 0,
        coralLevel4: 0,
        algaeProcessor: 0,
        algaeNet: 0
      },
      teleop: {
        coralLevel1: 0,
        coralLevel2: 0,
        coralLevel3: 0,
        coralLevel4: 0,
        algaeProcessor: 0,
        algaeNet: 0,
        algaeDescored: 0
      },
      endgame: {
        robotParked: false,
        shallowCageClimb: false,
        deepCageClimb: false
      },
      additional: {
        playedDefense: false,
        defenseRating: 5,
        driverSkill: 5,
        robotSpeed: 5,
        robotDied: false,
        robotTipped: false,
        notes: ''
      }
    });
  };

  const saveMatchData = async (data) => {
    const db = getFirestore();
    try {
      // Create a copy of the data to ensure we don't modify the original
      const dataToSubmit = JSON.parse(JSON.stringify(data));
      
      // Ensure team number is stored as a string
      dataToSubmit.matchInfo.teamNumber = String(dataToSubmit.matchInfo.teamNumber);
      
      // Log the final data being submitted
      console.log("Final data being submitted:", dataToSubmit);
      
      await addDoc(collection(db, "scoutingData"), dataToSubmit);
      console.log("Document successfully added!");
    } catch (error) {
      console.error("Error adding document: ", error);
      throw error;
    }
  };

  // Calculate current scores for display
  const currentScores = calculateTotalScore();

  // Handle checkbox change for played defense
  const handlePlayedDefenseChange = (e) => {
    const isChecked = e.target.checked;
    
    // Update playedDefense state
    setFormData({
      ...formData,
      additional: {
        ...formData.additional,
        playedDefense: isChecked,
        // Set defenseRating to 0 if unchecked, keep current value if checked
        defenseRating: isChecked ? formData.additional.defenseRating : 0
      }
    });
  };

  return (
    <div className="container">
      <h2>Match Scouting Form</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Match Info */}
        <div className="section">
          <h2>Match Information</h2>
          <div className="form-group">
            <label htmlFor="matchNumber">Match Number:</label>
            <input 
              type="number" 
              id="matchNumber" 
              value={formData.matchInfo.matchNumber}
              onChange={(e) => handleInputChange('matchInfo', 'matchNumber', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="teamNumber">Team Number:</label>
            <input 
              type="text"
              id="teamNumber" 
              value={formData.matchInfo.teamNumber}
              onChange={(e) => {
                // Only allow numeric input
                const value = e.target.value.replace(/[^0-9]/g, '');
                console.log("Team number input:", value);
                handleInputChange('matchInfo', 'teamNumber', value);
              }}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="alliance">Alliance:</label>
            <select 
              id="alliance" 
              value={formData.matchInfo.alliance}
              onChange={(e) => handleInputChange('matchInfo', 'alliance', e.target.value)}
              required
            >
              <option value="red">Red</option>
              <option value="blue">Blue</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="scouterInitials">Scouter Initials:</label>
            <input 
              type="text" 
              id="scouterInitials" 
              value={formData.matchInfo.scouterInitials}
              onChange={(e) => handleInputChange('matchInfo', 'scouterInitials', e.target.value)}
              maxLength="3"
              placeholder="Your initials"
              required
            />
          </div>
        </div>
        
        {/* Autonomous Period */}
        <div className="section">
          <h2>Autonomous Period</h2>
          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={formData.autonomous.mobility}
                onChange={(e) => handleInputChange('autonomous', 'mobility', e.target.checked)}
              />
              Leave Starting Line (3 points)
            </label>
          </div>
          
          <h3>Coral Scored (Auto)</h3>
          <div className="coral-scoring">
            <Counter 
              label="Level 1 (3 pts):" 
              value={formData.autonomous.coralLevel1}
              onChange={(value) => handleInputChange('autonomous', 'coralLevel1', value)}
            />
            
            <Counter 
              label="Level 2 (4 pts):" 
              value={formData.autonomous.coralLevel2}
              onChange={(value) => handleInputChange('autonomous', 'coralLevel2', value)}
            />
            
            <Counter 
              label="Level 3 (6 pts):" 
              value={formData.autonomous.coralLevel3}
              onChange={(value) => handleInputChange('autonomous', 'coralLevel3', value)}
            />
            
            <Counter 
              label="Level 4 (7 pts):" 
              value={formData.autonomous.coralLevel4}
              onChange={(value) => handleInputChange('autonomous', 'coralLevel4', value)}
            />
          </div>
          
          <h3>Algae Scored (Auto)</h3>
          <div className="algae-scoring">
            <Counter 
              label="Processor (6 pts):" 
              value={formData.autonomous.algaeProcessor}
              onChange={(value) => handleInputChange('autonomous', 'algaeProcessor', value)}
            />
            
            <Counter 
              label="Net (4 pts):" 
              value={formData.autonomous.algaeNet}
              onChange={(value) => handleInputChange('autonomous', 'algaeNet', value)}
            />
          </div>
          
          <div className="form-group">
            <label>Auto Points:</label>
            <div className="calculated-value">{currentScores.autoPoints}</div>
          </div>
        </div>
        
        {/* Teleop Period */}
        <div className="section">
          <h2>Teleop Period</h2>
          
          <h3>Coral Scored (Teleop)</h3>
          <div className="coral-scoring">
            <Counter 
              label="Level 1 (2 pts):" 
              value={formData.teleop.coralLevel1}
              onChange={(value) => handleInputChange('teleop', 'coralLevel1', value)}
            />
            
            <Counter 
              label="Level 2 (3 pts):" 
              value={formData.teleop.coralLevel2}
              onChange={(value) => handleInputChange('teleop', 'coralLevel2', value)}
            />
            
            <Counter 
              label="Level 3 (4 pts):" 
              value={formData.teleop.coralLevel3}
              onChange={(value) => handleInputChange('teleop', 'coralLevel3', value)}
            />
            
            <Counter 
              label="Level 4 (5 pts):" 
              value={formData.teleop.coralLevel4}
              onChange={(value) => handleInputChange('teleop', 'coralLevel4', value)}
            />
          </div>
          
          <h3>Algae Scored (Teleop)</h3>
          <div className="algae-scoring">
            <Counter 
              label="Processor (6 pts):" 
              value={formData.teleop.algaeProcessor}
              onChange={(value) => handleInputChange('teleop', 'algaeProcessor', value)}
              field="algaeProcessor"
            />
            
            <Counter 
              label="Net (4 pts):" 
              value={formData.teleop.algaeNet}
              onChange={(value) => handleInputChange('teleop', 'algaeNet', value)}
              field="algaeNet"
            />
            
            <Counter 
              label="Descored:" 
              value={formData.teleop.algaeDescored}
              onChange={(value) => handleInputChange('teleop', 'algaeDescored', value)}
              field="algaeDescored"
            />
          </div>
          
          <div className="form-group">
            <label>Teleop Points:</label>
            <div className="calculated-value">{currentScores.teleopPoints}</div>
          </div>
        </div>
        
        {/* Endgame */}
        <div className="section">
          <h2>Endgame</h2>
          
          {/* Radio-button style checkboxes for robot position */}
          <div className="form-group">
            
            <div className="radio-style-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.endgame.deepCageClimb}
                  onChange={() => handleEndgamePositionChange('deepCageClimb')}
                />
                Deep Cage Climb (12 points)
              </label>
            </div>
            
            <div className="radio-style-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.endgame.shallowCageClimb}
                  onChange={() => handleEndgamePositionChange('shallowCageClimb')}
                />
                Shallow Cage Climb (6 points)
              </label>
            </div>
            
            <div className="radio-style-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.endgame.robotParked}
                  onChange={() => handleEndgamePositionChange('robotParked')}
                />
                Robot Parked (2 points)
              </label>
            </div>
            
            <div className="radio-style-checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={!formData.endgame.robotParked && !formData.endgame.shallowCageClimb && !formData.endgame.deepCageClimb}
                  onChange={() => {
                    setFormData({
                      ...formData,
                      endgame: {
                        ...formData.endgame,
                        robotParked: false,
                        shallowCageClimb: false,
                        deepCageClimb: false
                      }
                    });
                  }}
                />
                None (0 points)
              </label>
            </div>
          </div>
          
          {/* Display calculated barge points */}
          <div className="form-group">
            <label>Endgame Points:</label>
            <div className="calculated-value">{currentScores.bargePoints}</div>
          </div>
        </div>
        
        {/* Additional Notes */}
        <div className="section">
          <h2>Additional Notes</h2>
          
          {/* Robot Status Checkboxes */}
          <div className="form-group">
            <div className="checkbox-group">
              <label>
                <strong>
                <input 
                  type="checkbox" 
                  checked={formData.additional.robotDied}
                  onChange={(e) => handleInputChange('additional', 'robotDied', e.target.checked)}
                />
                Robot Died/Immobilized
                </strong>
              </label>
            </div>
            
            <div className="checkbox-group">
              <label>
                <strong>
                <input 
                  type="checkbox" 
                  checked={formData.additional.robotTipped}
                  onChange={(e) => handleInputChange('additional', 'robotTipped', e.target.checked)}
                />
                Robot Tipped Over
                </strong>
              </label>
            </div>
            
            <div className="checkbox-group">
              <label>
                <strong>
                <input 
                  type="checkbox" 
                  checked={formData.additional.playedDefense}
                  onChange={handlePlayedDefenseChange}
                />
                Played Defense
                </strong>
              </label>
            </div>
          </div>
          
          {/* Rating Sliders */}
          {formData.additional.playedDefense && (
            <div className="form-group">
              <label htmlFor="defenseRating">Defense Rating (1-10):</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="range" 
                  id="defenseRating" 
                  min="1" 
                  max="10" 
                  value={formData.additional.defenseRating}
                  onChange={(e) => handleInputChange('additional', 'defenseRating', parseInt(e.target.value))}
                />
                <span style={{ marginLeft: '10px' }}>{formData.additional.defenseRating}</span>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="driverSkill">Driver Skill (1-10):</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="range" 
                id="driverSkill" 
                min="1" 
                max="10" 
                value={formData.additional.driverSkill}
                onChange={(e) => handleInputChange('additional', 'driverSkill', parseInt(e.target.value))}
              />
              <span style={{ marginLeft: '10px' }}>{formData.additional.driverSkill}</span>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="robotSpeed">Robot Speed (1-10):</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="range" 
                id="robotSpeed" 
                min="1" 
                max="10" 
                value={formData.additional.robotSpeed}
                onChange={(e) => handleInputChange('additional', 'robotSpeed', parseInt(e.target.value))}
              />
              <span style={{ marginLeft: '10px' }}>{formData.additional.robotSpeed}</span>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes:</label>
            <textarea 
              id="notes" 
              rows="3"
              value={formData.additional.notes}
              onChange={(e) => handleInputChange('additional', 'notes', e.target.value)}
              className="full-width"
            ></textarea>
          </div>
        </div>
        
        {/* Total Score Display */}
        <div className="total-score">
          <h3>Total Score: {currentScores.totalPoints}</h3>
        </div>
        
        <button type="submit" className="submit-btn">Submit Data</button>
      </form>
    </div>
  );
}

export default ScoutingForm;
