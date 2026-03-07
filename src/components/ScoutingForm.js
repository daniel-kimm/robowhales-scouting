import React, { useState } from 'react';
import ExtendedCounter from './ExtendedCounter';
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
      fuelScored: 0,
      passFromNeutralZone: 0,
      climbL1: 'notAttempted',
      pickupFromDepot: false,
      pickupFromOutpost: false,
      pickupFromNeutralZone: false
    },
    teleop: {
      fuelScored: 0,
      passFromNeutralZone: 0,
      passFromOppAllianceZone: 0,
      pickupFromDepot: false,
      pickupFromOutpost: false,
      pickupFromNeutralZone: false
    },
    endgame: {
      climb: 'notAttempted'
    },
    additional: {
      driverSkill: 'notObserved',
      defenseRating: 'didNotPlayDefense',
      speedRating: '3',
      crossedBump: false,
      crossedTrench: false,
      diedImmobilized: false,
      makeGoodAlliancePartner: false,
      wasDefended: false,
      excessivePenalties: false,
      notes: ''
    }
  });

  const handleInputChange = (section, field, value) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submissionData = {
      ...formData,
      timestamp: new Date().toISOString()
    };

    try {
      await saveMatchData(submissionData);
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
        fuelScored: 0,
        passFromNeutralZone: 0,
        climbL1: 'notAttempted',
        pickupFromDepot: false,
        pickupFromOutpost: false,
        pickupFromNeutralZone: false
      },
      teleop: {
        fuelScored: 0,
        passFromNeutralZone: 0,
        passFromOppAllianceZone: 0,
        pickupFromDepot: false,
        pickupFromOutpost: false,
        pickupFromNeutralZone: false
      },
      endgame: {
        climb: 'notAttempted'
      },
      additional: {
        driverSkill: 'notObserved',
        defenseRating: 'didNotPlayDefense',
        speedRating: '3',
        crossedBump: false,
        crossedTrench: false,
        diedImmobilized: false,
        makeGoodAlliancePartner: false,
        wasDefended: false,
        excessivePenalties: false,
        notes: ''
      }
    });
  };

  const saveMatchData = async (data) => {
    const db = getFirestore();
    try {
      const dataToSubmit = JSON.parse(JSON.stringify(data));
      dataToSubmit.matchInfo.teamNumber = String(dataToSubmit.matchInfo.teamNumber);

      await addDoc(collection(db, "testData"), dataToSubmit);
      console.log("Document successfully added to testData!");
    } catch (error) {
      console.error("Error adding document: ", error);
      throw error;
    }
  };

  return (
    <div className="container">
      <h1>Match Scouting Form</h1>

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
                const value = e.target.value.replace(/[^0-9]/g, '');
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
              required
            />
          </div>
        </div>

        {/* Autonomous Period */}
        <div className="section">
          <h2>Autonomous Period</h2>

          <ExtendedCounter
            label="Fuel Scored"
            value={formData.autonomous.fuelScored}
            onChange={(value) => handleInputChange('autonomous', 'fuelScored', value)}
          />

          <ExtendedCounter
            label="Pass From Neutral Zone"
            value={formData.autonomous.passFromNeutralZone}
            onChange={(value) => handleInputChange('autonomous', 'passFromNeutralZone', value)}
          />

          <div className="form-group">
            <label>Climb L1:</label>
            <div className="radio-group">
              {[
                { value: 'climbed', label: 'Climbed' },
                { value: 'attempted', label: 'Attempted' },
                { value: 'notAttempted', label: 'Not Attempted' }
              ].map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="autoClimbL1"
                    value={option.value}
                    checked={formData.autonomous.climbL1 === option.value}
                    onChange={(e) => handleInputChange('autonomous', 'climbL1', e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Pickup Locations:</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.autonomous.pickupFromDepot}
                  onChange={(e) => handleInputChange('autonomous', 'pickupFromDepot', e.target.checked)}
                />
                <strong>Pickup From Depot</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.autonomous.pickupFromOutpost}
                  onChange={(e) => handleInputChange('autonomous', 'pickupFromOutpost', e.target.checked)}
                />
                <strong>Pickup From Outpost</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.autonomous.pickupFromNeutralZone}
                  onChange={(e) => handleInputChange('autonomous', 'pickupFromNeutralZone', e.target.checked)}
                />
                <strong>Pickup From Neutral Zone</strong>
              </label>
            </div>
          </div>
        </div>

        {/* Teleop Period */}
        <div className="section">
          <h2>Teleop Period</h2>

          <ExtendedCounter
            label="Fuel Scored"
            value={formData.teleop.fuelScored}
            onChange={(value) => handleInputChange('teleop', 'fuelScored', value)}
          />

          <ExtendedCounter
            label="Pass From Neutral Zone"
            value={formData.teleop.passFromNeutralZone}
            onChange={(value) => handleInputChange('teleop', 'passFromNeutralZone', value)}
          />

          <ExtendedCounter
            label="Pass From Opp Alliance Zone"
            value={formData.teleop.passFromOppAllianceZone}
            onChange={(value) => handleInputChange('teleop', 'passFromOppAllianceZone', value)}
          />

          <div className="form-group">
            <label>Pickup Locations:</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.teleop.pickupFromDepot}
                  onChange={(e) => handleInputChange('teleop', 'pickupFromDepot', e.target.checked)}
                />
                <strong>Pickup From Depot</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.teleop.pickupFromOutpost}
                  onChange={(e) => handleInputChange('teleop', 'pickupFromOutpost', e.target.checked)}
                />
                <strong>Pickup From Outpost</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.teleop.pickupFromNeutralZone}
                  onChange={(e) => handleInputChange('teleop', 'pickupFromNeutralZone', e.target.checked)}
                />
                <strong>Pickup From Neutral Zone</strong>
              </label>
            </div>
          </div>
        </div>

        {/* Endgame */}
        <div className="section">
          <h2>Endgame</h2>

          <div className="form-group">
            <label>Climb:</label>
            <div className="radio-group">
              {[
                { value: 'level1', label: 'Level 1' },
                { value: 'level2', label: 'Level 2' },
                { value: 'level3', label: 'Level 3' },
                { value: 'attempted', label: 'Attempted' },
                { value: 'notAttempted', label: 'Not Attempted' }
              ].map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="endgameClimb"
                    value={option.value}
                    checked={formData.endgame.climb === option.value}
                    onChange={(e) => handleInputChange('endgame', 'climb', e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="section">
          <h2>Additional Notes</h2>

          <div className="form-group">
            <label>Driver Skill:</label>
            <div className="radio-group">
              {[
                { value: 'notEffective', label: 'Not Effective' },
                { value: 'average', label: 'Average' },
                { value: 'veryEffective', label: 'Very Effective' },
                { value: 'notObserved', label: 'Not Observed' }
              ].map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="driverSkill"
                    value={option.value}
                    checked={formData.additional.driverSkill === option.value}
                    onChange={(e) => handleInputChange('additional', 'driverSkill', e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Defense Rating:</label>
            <div className="radio-group">
              {[
                { value: 'belowAverage', label: 'Below Average' },
                { value: 'average', label: 'Average' },
                { value: 'good', label: 'Good' },
                { value: 'excellent', label: 'Excellent' },
                { value: 'didNotPlayDefense', label: 'Did Not Play Defense' }
              ].map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="defenseRating"
                    value={option.value}
                    checked={formData.additional.defenseRating === option.value}
                    onChange={(e) => handleInputChange('additional', 'defenseRating', e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Speed Rating:</label>
            <div className="radio-group">
              {[
                { value: '1', label: '1 (Slow)' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5 (Fast)' }
              ].map((option) => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="speedRating"
                    value={option.value}
                    checked={formData.additional.speedRating === option.value}
                    onChange={(e) => handleInputChange('additional', 'speedRating', e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.crossedBump}
                  onChange={(e) => handleInputChange('additional', 'crossedBump', e.target.checked)}
                />
                <strong>Crossed Bump</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.crossedTrench}
                  onChange={(e) => handleInputChange('additional', 'crossedTrench', e.target.checked)}
                />
                <strong>Crossed Trench</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.diedImmobilized}
                  onChange={(e) => handleInputChange('additional', 'diedImmobilized', e.target.checked)}
                />
                <strong>Died/Immobilized</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.makeGoodAlliancePartner}
                  onChange={(e) => handleInputChange('additional', 'makeGoodAlliancePartner', e.target.checked)}
                />
                <strong>Make good alliance partner?</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.wasDefended}
                  onChange={(e) => handleInputChange('additional', 'wasDefended', e.target.checked)}
                />
                <strong>Was Defended</strong>
              </label>
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.additional.excessivePenalties}
                  onChange={(e) => handleInputChange('additional', 'excessivePenalties', e.target.checked)}
                />
                <strong>Excessive Penalties</strong>
              </label>
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

        <button type="submit" className="submit-btn">Submit Data</button>
      </form>
    </div>
  );
}

export default ScoutingForm;
