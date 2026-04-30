import React, { useState } from 'react';
import ExtendedCounter from './ExtendedCounter';
import { enqueueSubmission, tryUpload, flushQueue } from '../utils/offlineQueue';

function ScoutingForm() {
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [formData, setFormData] = useState({
    matchInfo: {
      matchNumber: '',
      teamNumber: '',
      alliance: 'red',
      scouterName: ''
    },
    autonomous: {
      fuelScored: 0,
      passFromNeutralZone: 0,
      pushFromNeutralZone: 0,
      climbL1: 'notAttempted',
      pickupFromDepot: false,
      pickupFromOutpost: false,
      pickupFromNeutralZone: false,
      notes: ''
    },
    teleop: {
      fuelScored: 0,
      passFromNeutralZone: 0,
      pushFromNeutralZone: 0,
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
      cycleSpeedRating: '3',
      speedRating: '3',
      crossedBump: false,
      crossedTrench: false,
      diedImmobilized: false,
      makeGoodAlliancePartner: false,
      wasDefended: false,
      excessivePenalties: false,
      onCycleNotes: '',
      offCycleNotes: '',
      generalNotes: ''
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

    // Build the submission payload and normalize any non-string fields the
    // way the original code did (so existing analysis code keeps working).
    const submissionData = {
      ...formData,
      timestamp: new Date().toISOString()
    };
    let cleaned;
    try {
      cleaned = JSON.parse(JSON.stringify(submissionData));
      cleaned.matchInfo.teamNumber = String(cleaned.matchInfo.teamNumber);
    } catch (err) {
      alert('Could not prepare match data: ' + (err.message || err));
      return;
    }

    // STEP 1 (critical): persist locally BEFORE any network call. If this
    // fails the scouter must NOT lose their data, so we surface a hard error
    // and bail out without resetting the form.
    let entry;
    try {
      entry = enqueueSubmission(cleaned);
    } catch (err) {
      console.error('Local save failed:', err);
      alert(
        'COULD NOT SAVE MATCH LOCALLY.\n\n' +
          (err.message || err) +
          '\n\nDo NOT leave this page. Try Submit again, or screenshot the form as a backup.'
      );
      return;
    }

    // The data is now safe on disk. We can safely reset the form.
    resetForm();
    setSubmitState({ status: 'uploading', message: 'Saved on device. Uploading…' });

    // STEP 2: try to upload. tryUpload handles its own error tracking and
    // queue removal on success — it never throws.
    const uploaded = await tryUpload(entry);
    if (uploaded) {
      setSubmitState({ status: 'uploaded', message: 'Match uploaded successfully.' });
      // Opportunistically flush anything else that was waiting.
      flushQueue().catch((err) => console.error('Background flush error:', err));
    } else {
      setSubmitState({
        status: 'queued',
        message: 'Saved on this device. Will upload automatically when online.'
      });
    }

    setTimeout(() => setSubmitState({ status: 'idle', message: '' }), 5000);
  };

  const resetForm = () => {
    setFormData({
      matchInfo: {
        matchNumber: '',
        teamNumber: '',
        alliance: 'red',
        scouterName: ''
      },
      autonomous: {
        fuelScored: 0,
        passFromNeutralZone: 0,
        pushFromNeutralZone: 0,
        climbL1: 'notAttempted',
        pickupFromDepot: false,
        pickupFromOutpost: false,
        pickupFromNeutralZone: false,
        notes: ''
      },
      teleop: {
        fuelScored: 0,
        passFromNeutralZone: 0,
        pushFromNeutralZone: 0,
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
        cycleSpeedRating: '3',
        speedRating: '3',
        crossedBump: false,
        crossedTrench: false,
        diedImmobilized: false,
        makeGoodAlliancePartner: false,
        wasDefended: false,
        excessivePenalties: false,
        onCycleNotes: '',
        offCycleNotes: '',
        generalNotes: ''
      }
    });
  };

  return (
    <div className="container">
      <h1>Match Scouting Form</h1>

      {submitState.status !== 'idle' && (
        <div
          className={`submit-status submit-status--${submitState.status}`}
          role="status"
          aria-live="polite"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            margin: '0 0 16px',
            fontWeight: 600,
            background:
              submitState.status === 'uploaded'
                ? '#def7e2'
                : submitState.status === 'queued'
                ? '#fff4cc'
                : '#e3eefc',
            color:
              submitState.status === 'uploaded'
                ? '#1f5a2c'
                : submitState.status === 'queued'
                ? '#6a5200'
                : '#1f3a5a'
          }}
        >
          {submitState.message}
        </div>
      )}

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
            <label htmlFor="scouterName">Scouter Name:</label>
            <input
              type="text"
              id="scouterName"
              value={formData.matchInfo.scouterName}
              onChange={(e) => handleInputChange('matchInfo', 'scouterName', e.target.value)}
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

          <ExtendedCounter
            label="Push From Neutral Zone"
            value={formData.autonomous.pushFromNeutralZone}
            onChange={(value) => handleInputChange('autonomous', 'pushFromNeutralZone', value)}
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

          <div className="form-group">
            <label htmlFor="autoNotes">Auto Path Notes:</label>
            <textarea
              id="autoNotes"
              rows="3"
              value={formData.autonomous.notes}
              onChange={(e) => handleInputChange('autonomous', 'notes', e.target.value)}
              className="full-width"
            ></textarea>
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
            label="Push From Neutral Zone"
            value={formData.teleop.pushFromNeutralZone}
            onChange={(value) => handleInputChange('teleop', 'pushFromNeutralZone', value)}
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
            <label>Cycle Speed Rating:</label>
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
                    name="cycleSpeedRating"
                    value={option.value}
                    checked={formData.additional.cycleSpeedRating === option.value}
                    onChange={(e) => handleInputChange('additional', 'cycleSpeedRating', e.target.value)}
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
            <label htmlFor="onCycleNotes">On Cycle Notes:</label>
            <textarea
              id="onCycleNotes"
              rows="3"
              value={formData.additional.onCycleNotes}
              onChange={(e) => handleInputChange('additional', 'onCycleNotes', e.target.value)}
              className="full-width"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="offCycleNotes">Off Cycle Notes:</label>
            <textarea
              id="offCycleNotes"
              rows="3"
              value={formData.additional.offCycleNotes}
              onChange={(e) => handleInputChange('additional', 'offCycleNotes', e.target.value)}
              className="full-width"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="generalNotes">General Notes:</label>
            <textarea
              id="generalNotes"
              rows="3"
              value={formData.additional.generalNotes}
              onChange={(e) => handleInputChange('additional', 'generalNotes', e.target.value)}
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
