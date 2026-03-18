import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { X } from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const DEFENSE_LABELS = ['Below Average', 'Average', 'Good', 'Excellent'];

const defenseRatingToNumber = (rating) => {
  switch(rating) {
    case 'belowAverage': return 1;
    case 'average': return 2;
    case 'good': return 3;
    case 'excellent': return 4;
    default: return null;
  }
};

const climbToLabel = (climb) => {
  switch(climb) {
    case 'level1': return 'Level 1';
    case 'level2': return 'Level 2';
    case 'level3': return 'Level 3';
    case 'attempted': return 'Attempted';
    case 'notAttempted': return 'Not Attempted';
    case 'climbed': return 'Climbed';
    default: return climb || 'N/A';
  }
};

const driverSkillToLabel = (skill) => {
  switch(skill) {
    case 'notEffective': return 'Not Effective';
    case 'average': return 'Average';
    case 'veryEffective': return 'Very Effective';
    case 'notObserved': return 'Not Observed';
    default: return skill || 'N/A';
  }
};

const defenseRatingToLabel = (rating) => {
  switch(rating) {
    case 'belowAverage': return 'Below Average';
    case 'average': return 'Average';
    case 'good': return 'Good';
    case 'excellent': return 'Excellent';
    case 'didNotPlayDefense': return 'Did Not Play Defense';
    default: return rating || 'N/A';
  }
};

function TeamStats({ matches }) {
  const [offensiveFilters, setOffensiveFilters] = useState({
    total: true,
    auto: false,
    teleop: false,
    endgame: false
  });
  
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  if (!matches || matches.length === 0) {
    return (
      <div className="team-stats">
        <h2>Team Statistics</h2>
        <p>No data available</p>
      </div>
    );
  }

  const teamNumbers = [...new Set(matches.map(match => match.matchInfo?.teamNumber).filter(Boolean))];
  teamNumbers.sort((a, b) => parseInt(a) - parseInt(b));

  const teamStats = teamNumbers.map(teamNumber => {
    const teamMatches = matches.filter(match => match.matchInfo?.teamNumber === teamNumber);
    
    // Auto points: fuel (1 pt each) + Tower L1 climb (15 pts)
    const avgAutoPoints = calculateAverage(teamMatches, match => {
      const auto = match.autonomous || {};
      const fuelPts = (auto.fuelScored || 0) * 1;
      const climbPts = auto.climbL1 === 'climbed' ? 15 : 0;
      return fuelPts + climbPts;
    });

    // Teleop points: fuel only (1 pt each) — passes don't score
    const avgTeleopPoints = calculateAverage(teamMatches, match => {
      const teleop = match.teleop || {};
      return (teleop.fuelScored || 0) * 1;
    });

    // Endgame points: Tower L1=10, L2=20, L3=30
    const avgEndgamePoints = calculateAverage(teamMatches, match => {
      const climb = match.endgame?.climb;
      switch(climb) {
        case 'level1': return 10;
        case 'level2': return 20;
        case 'level3': return 30;
        default: return 0;
      }
    });

    const avgTotalPoints = avgAutoPoints + avgTeleopPoints + avgEndgamePoints;

    // Defense rating (only matches that actually played defense)
    const defenseMatches = teamMatches.filter(m => {
      const rating = m.additional?.defenseRating;
      return rating && rating !== 'didNotPlayDefense';
    });
    const avgDefenseNum = defenseMatches.length > 0
      ? defenseMatches.reduce((sum, m) => sum + (defenseRatingToNumber(m.additional.defenseRating) || 0), 0) / defenseMatches.length
      : 0;

    // Detailed auto averages
    const avgAutoFuel = calculateFieldAverage(teamMatches, 'autonomous.fuelScored');
    const avgAutoPass = calculateFieldAverage(teamMatches, 'autonomous.passFromNeutralZone');
    const avgAutoPush = calculateFieldAverage(teamMatches, 'autonomous.pushFromNeutralZone');
    const climbL1Distribution = calculateDistribution(teamMatches, 'autonomous.climbL1');
    const autoPickupDepot = calculatePercentage(teamMatches, 'autonomous.pickupFromDepot');
    const autoPickupOutpost = calculatePercentage(teamMatches, 'autonomous.pickupFromOutpost');
    const autoPickupNeutral = calculatePercentage(teamMatches, 'autonomous.pickupFromNeutralZone');

    // Detailed teleop averages
    const avgTeleopFuel = calculateFieldAverage(teamMatches, 'teleop.fuelScored');
    const avgTeleopPass = calculateFieldAverage(teamMatches, 'teleop.passFromNeutralZone');
    const avgTeleopPush = calculateFieldAverage(teamMatches, 'teleop.pushFromNeutralZone');
    const avgTeleopOppPass = calculateFieldAverage(teamMatches, 'teleop.passFromOppAllianceZone');
    const teleopPickupDepot = calculatePercentage(teamMatches, 'teleop.pickupFromDepot');
    const teleopPickupOutpost = calculatePercentage(teamMatches, 'teleop.pickupFromOutpost');
    const teleopPickupNeutral = calculatePercentage(teamMatches, 'teleop.pickupFromNeutralZone');

    // Endgame climb distribution
    const climbDistribution = calculateDistribution(teamMatches, 'endgame.climb');

    // Additional stats
    const driverSkillDistribution = calculateDistribution(teamMatches, 'additional.driverSkill');
    const defenseRatingDistribution = calculateDistribution(teamMatches, 'additional.defenseRating');
    const avgSpeedRating = calculateFieldAverage(teamMatches, 'additional.speedRating');
    const crossedBumpPct = calculatePercentage(teamMatches, 'additional.crossedBump');
    const crossedTrenchPct = calculatePercentage(teamMatches, 'additional.crossedTrench');
    const diedImmobilizedPct = calculatePercentage(teamMatches, 'additional.diedImmobilized');
    const goodAlliancePartnerPct = calculatePercentage(teamMatches, 'additional.makeGoodAlliancePartner');
    const wasDefendedPct = calculatePercentage(teamMatches, 'additional.wasDefended');
    const excessivePenaltiesPct = calculatePercentage(teamMatches, 'additional.excessivePenalties');

    const scouterNotes = teamMatches
      .filter(match => match.additional?.onCycleNotes || match.additional?.offCycleNotes || match.additional?.generalNotes || match.additional?.notes)
      .map(match => ({
        matchNumber: match.matchInfo?.matchNumber || 'Unknown',
        onCycleNotes: match.additional?.onCycleNotes || '',
        offCycleNotes: match.additional?.offCycleNotes || '',
        generalNotes: match.additional?.generalNotes || '',
        notes: match.additional?.notes || '',
        scouterInitials: match.matchInfo?.scouterInitials || 'Unknown'
      }));

    return {
      teamNumber,
      matchCount: teamMatches.length,
      avgAutoPoints,
      avgTeleopPoints,
      avgEndgamePoints,
      avgTotalPoints,
      avgDefenseNum,
      defenseCount: defenseMatches.length,
      auto: {
        fuelScored: avgAutoFuel,
        passFromNeutralZone: avgAutoPass,
        pushFromNeutralZone: avgAutoPush,
        climbL1: climbL1Distribution,
        pickupFromDepot: autoPickupDepot,
        pickupFromOutpost: autoPickupOutpost,
        pickupFromNeutralZone: autoPickupNeutral
      },
      teleop: {
        fuelScored: avgTeleopFuel,
        passFromNeutralZone: avgTeleopPass,
        pushFromNeutralZone: avgTeleopPush,
        passFromOppAllianceZone: avgTeleopOppPass,
        pickupFromDepot: teleopPickupDepot,
        pickupFromOutpost: teleopPickupOutpost,
        pickupFromNeutralZone: teleopPickupNeutral
      },
      endgame: {
        climb: climbDistribution
      },
      additional: {
        driverSkill: driverSkillDistribution,
        defenseRating: defenseRatingDistribution,
        speedRating: avgSpeedRating,
        crossedBump: crossedBumpPct,
        crossedTrench: crossedTrenchPct,
        diedImmobilized: diedImmobilizedPct,
        goodAlliancePartner: goodAlliancePartnerPct,
        wasDefended: wasDefendedPct,
        excessivePenalties: excessivePenaltiesPct
      },
      scouterNotes
    };
  });

  // Offensive chart datasets
  const filteredDatasets = [];

  if (offensiveFilters.total) {
    filteredDatasets.push({
      label: 'Total',
      data: teamStats.map(stat => stat.avgTotalPoints),
      backgroundColor: 'rgba(153, 102, 255, 0.8)',
    });
  }
  
  if (offensiveFilters.auto) {
    filteredDatasets.push({
      label: 'Auto',
      data: teamStats.map(stat => stat.avgAutoPoints),
      backgroundColor: 'rgba(255, 99, 132, 0.8)',
    });
  }
  
  if (offensiveFilters.teleop) {
    filteredDatasets.push({
      label: 'Teleop',
      data: teamStats.map(stat => stat.avgTeleopPoints),
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
    });
  }
  
  if (offensiveFilters.endgame) {
    filteredDatasets.push({
      label: 'Endgame',
      data: teamStats.map(stat => stat.avgEndgamePoints),
      backgroundColor: 'rgba(75, 192, 192, 0.8)',
    });
  }

  const offensiveChartData = {
    labels: teamStats.map(stat => stat.teamNumber),
    datasets: filteredDatasets,
  };

  // Defensive chart
  const defensiveChartData = {
    labels: teamStats.map(stat => stat.teamNumber),
    datasets: [
      {
        label: 'Defense Rating',
        data: teamStats.map(stat => stat.avgDefenseNum),
        backgroundColor: 'rgba(255, 159, 64, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        title: { display: true, text: 'Team Number' }
      },
      y: {
        stacked: false,
        title: { display: true, text: 'Avg Points Contributed' },
        min: 0
      }
    }
  };

  const defenseChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            const teamStat = teamStats[context.dataIndex];
            const value = context.parsed.y || 0;
            return [
              `Defense Rating: ${value.toFixed(2)}`,
              `Defense Matches: ${teamStat.defenseCount}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Team Number' }
      },
      y: {
        title: { display: true, text: 'Defense Rating' },
        min: 0,
        max: 4,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return DEFENSE_LABELS[value - 1] || '';
          }
        }
      }
    }
  };
  
  const toggleFilter = (filter) => {
    setOffensiveFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  };

  return (
    <div className="team-stats">
      
      {/* Offensive Chart Filters */}
      <div className="chart-filters">
        <div className="filter-title">Show:</div>
        <div className="filter-options">
          <label className={`filter-option ${offensiveFilters.total ? 'active' : ''}`}>
            <input type="checkbox" checked={offensiveFilters.total} onChange={() => toggleFilter('total')} />
            <span className="filter-label total">Total</span>
          </label>
          <label className={`filter-option ${offensiveFilters.auto ? 'active' : ''}`}>
            <input type="checkbox" checked={offensiveFilters.auto} onChange={() => toggleFilter('auto')} />
            <span className="filter-label auto">Auto</span>
          </label>
          <label className={`filter-option ${offensiveFilters.teleop ? 'active' : ''}`}>
            <input type="checkbox" checked={offensiveFilters.teleop} onChange={() => toggleFilter('teleop')} />
            <span className="filter-label teleop">Teleop</span>
          </label>
          <label className={`filter-option ${offensiveFilters.endgame ? 'active' : ''}`}>
            <input type="checkbox" checked={offensiveFilters.endgame} onChange={() => toggleFilter('endgame')} />
            <span className="filter-label endgame">Endgame</span>
          </label>
        </div>
      </div>
      
      {/* Offensive Chart */}
      <div className="chart-container">
        <h2>Offensive Performance</h2>
        <Bar data={offensiveChartData} options={chartOptions} />
      </div>
      
      {/* Defensive Chart */}
      <div className="chart-container">
        <h2>Defensive Performance</h2>
        <Bar data={defensiveChartData} options={defenseChartOptions} />
      </div>
      
      {/* Team Stats Cards */}
      <div className="team-stats-cards">
        {teamStats.map(stats => (
          <div 
            key={stats.teamNumber} 
            className="team-stat-card" 
            onClick={() => setSelectedTeam(stats)}
          >
            <h3 className="team-number">Team {stats.teamNumber}</h3>
            <p className="match-count">{stats.matchCount} matches</p>
            
            <div className="stat-grid">
              <div className="stat-box auto">
                <div className="stat-label">Auto</div>
                <div className="stat-value">{stats.avgAutoPoints.toFixed(1)}</div>
              </div>
              <div className="stat-box teleop">
                <div className="stat-label">Teleop</div>
                <div className="stat-value">{stats.avgTeleopPoints.toFixed(1)}</div>
              </div>
              <div className="stat-box endgame">
                <div className="stat-label">Endgame</div>
                <div className="stat-value">{stats.avgEndgamePoints.toFixed(1)}</div>
              </div>
              <div className="stat-box total">
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.avgTotalPoints.toFixed(1)}</div>
              </div>
              <div className="stat-box defense">
                <div className="stat-label">Defense</div>
                <div className="stat-value">
                  {stats.defenseCount > 0 
                    ? `${defenseRatingToLabel(DEFENSE_LABELS[Math.round(stats.avgDefenseNum) - 1]?.toLowerCase() || '')} (${stats.defenseCount})` 
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Detailed Team Stats Modal */}
      {selectedTeam && (
        <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Team {selectedTeam.teamNumber} Detailed Stats</h2>
              <button className="modal-close" onClick={() => setSelectedTeam(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="match-count">{selectedTeam.matchCount} matches analyzed</p>
              
              <div className="stats-explanation">
                <p><strong>Note:</strong> Numbers show average per match. Percentages show how often the team performed an action.</p>
              </div>
              
              <div className="detailed-stats">
                {/* Autonomous */}
                <div className="detailed-section auto">
                  <h3>Autonomous Period</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Fuel Scored</div>
                      <div className="detailed-value">{selectedTeam.auto.fuelScored.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pass From Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.auto.passFromNeutralZone.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Push From Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.auto.pushFromNeutralZone.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Climb L1</div>
                      <div className="detailed-value">
                        {formatDistribution(selectedTeam.auto.climbL1, climbToLabel)}
                      </div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Depot</div>
                      <div className="detailed-value">{selectedTeam.auto.pickupFromDepot.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Outpost</div>
                      <div className="detailed-value">{selectedTeam.auto.pickupFromOutpost.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.auto.pickupFromNeutralZone.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Teleop */}
                <div className="detailed-section teleop">
                  <h3>Teleop Period</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Fuel Scored</div>
                      <div className="detailed-value">{selectedTeam.teleop.fuelScored.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pass From Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.teleop.passFromNeutralZone.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Push From Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.teleop.pushFromNeutralZone.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pass From Opp Alliance Zone</div>
                      <div className="detailed-value">{selectedTeam.teleop.passFromOppAllianceZone.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Depot</div>
                      <div className="detailed-value">{selectedTeam.teleop.pickupFromDepot.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Outpost</div>
                      <div className="detailed-value">{selectedTeam.teleop.pickupFromOutpost.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Pickup: Neutral Zone</div>
                      <div className="detailed-value">{selectedTeam.teleop.pickupFromNeutralZone.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Endgame */}
                <div className="detailed-section endgame">
                  <h3>Endgame</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item full-width-item">
                      <div className="detailed-label">Climb</div>
                      <div className="detailed-value">
                        {formatDistribution(selectedTeam.endgame.climb, climbToLabel)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional */}
                <div className="detailed-section additional">
                  <h3>Additional Stats</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Driver Skill</div>
                      <div className="detailed-value">
                        {formatDistribution(selectedTeam.additional.driverSkill, driverSkillToLabel)}
                      </div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Defense Rating</div>
                      <div className="detailed-value">
                        {formatDistribution(selectedTeam.additional.defenseRating, defenseRatingToLabel)}
                      </div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Speed Rating</div>
                      <div className="detailed-value">{selectedTeam.additional.speedRating.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Crossed Bump</div>
                      <div className="detailed-value">{selectedTeam.additional.crossedBump.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Crossed Trench</div>
                      <div className="detailed-value">{selectedTeam.additional.crossedTrench.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Died/Immobilized</div>
                      <div className="detailed-value">{selectedTeam.additional.diedImmobilized.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Good Alliance Partner</div>
                      <div className="detailed-value">{selectedTeam.additional.goodAlliancePartner.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Was Defended</div>
                      <div className="detailed-value">{selectedTeam.additional.wasDefended.toFixed(0)}%</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Excessive Penalties</div>
                      <div className="detailed-value">{selectedTeam.additional.excessivePenalties.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Scouter Notes */}
                <div className="detailed-section notes">
                  <h3>Scouter Notes</h3>
                  {selectedTeam.scouterNotes && selectedTeam.scouterNotes.length > 0 ? (
                    <div className="notes-container">
                      {selectedTeam.scouterNotes.map((note, index) => (
                        <div key={index} className="note-item">
                          <div className="note-match"><strong>Match {note.matchNumber}</strong> — Scouted by: {note.scouterInitials}</div>
                          <div className="note-details">
                            {note.onCycleNotes && (
                              <div className="note-text"><strong>On Cycle:</strong> {note.onCycleNotes}</div>
                            )}
                            {note.offCycleNotes && (
                              <div className="note-text"><strong>Off Cycle:</strong> {note.offCycleNotes}</div>
                            )}
                            {note.generalNotes && (
                              <div className="note-text"><strong>General:</strong> {note.generalNotes}</div>
                            )}
                            {note.notes && !note.onCycleNotes && !note.offCycleNotes && !note.generalNotes && (
                              <div className="note-text">{note.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-notes">No scouter notes available for this team.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculate average using a value extractor function
function calculateAverage(matches, extractValue) {
  if (!matches || matches.length === 0) return 0;
  const sum = matches.reduce((total, match) => total + (extractValue(match) || 0), 0);
  return sum / matches.length;
}

// Calculate average for a nested field path like 'autonomous.fuelScored'
function calculateFieldAverage(matches, propertyPath) {
  if (!matches || matches.length === 0) return 0;
  const parts = propertyPath.split('.');
  const sum = matches.reduce((total, match) => {
    let value = match;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return total;
    }
    return total + (Number(value) || 0);
  }, 0);
  return sum / matches.length;
}

// Calculate percentage of true boolean values
function calculatePercentage(matches, propertyPath) {
  if (!matches || matches.length === 0) return 0;
  const parts = propertyPath.split('.');
  const count = matches.reduce((total, match) => {
    let value = match;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return total;
    }
    return total + (value ? 1 : 0);
  }, 0);
  return (count / matches.length) * 100;
}

// Calculate distribution of string values (returns { value: count, ... })
function calculateDistribution(matches, propertyPath) {
  if (!matches || matches.length === 0) return {};
  const parts = propertyPath.split('.');
  const dist = {};
  matches.forEach(match => {
    let value = match;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return;
    }
    const key = String(value);
    dist[key] = (dist[key] || 0) + 1;
  });
  return dist;
}

// Format a distribution object as readable text
function formatDistribution(dist, labelFn) {
  const entries = Object.entries(dist || {});
  if (entries.length === 0) return 'N/A';
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${labelFn ? labelFn(key) : key}: ${count} (${((count / total) * 100).toFixed(0)}%)`)
    .join(', ');
}

export default TeamStats;
