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

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

function TeamStats({ matches }) {
  // Add state for filters
  const [offensiveFilters, setOffensiveFilters] = useState({
    auto: true,
    teleop: true,
    endgame: true,
    efficiency: true
  });
  
  // Add state for selected team modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Skip if no matches
  if (!matches || matches.length === 0) {
    return (
      <div className="team-stats">
        <h2>Team Statistics</h2>
        <p>No data available</p>
      </div>
    );
  }

  // Get unique team numbers and sort them in ascending order
  const teamNumbers = [...new Set(matches.map(match => match.matchInfo?.teamNumber).filter(Boolean))];
  teamNumbers.sort((a, b) => {
    // Convert to numbers for proper numeric sorting
    return parseInt(a) - parseInt(b);
  });

  // Calculate stats for each team
  const teamStats = teamNumbers.map(teamNumber => {
    const teamMatches = matches.filter(match => match.matchInfo?.teamNumber === teamNumber);
    
    // Calculate averages for overall stats
    const avgAutoPoints = calculateAverage(teamMatches, 'scores.autoPoints');
    const avgTeleopPoints = calculateAverage(teamMatches, 'scores.teleopPoints');
    const avgBargePoints = calculateAverage(teamMatches, 'scores.bargePoints');
    const avgTotalPoints = calculateAverage(teamMatches, 'scores.totalPoints');
    
    // Calculate detailed averages for modal
    // Auto
    const avgAutoCoralLevel1 = calculateAverage(teamMatches, 'autonomous.coralLevel1');
    const avgAutoCoralLevel2 = calculateAverage(teamMatches, 'autonomous.coralLevel2');
    const avgAutoCoralLevel3 = calculateAverage(teamMatches, 'autonomous.coralLevel3');
    const avgAutoCoralLevel4 = calculateAverage(teamMatches, 'autonomous.coralLevel4');
    const avgAutoAlgaeProcessor = calculateAverage(teamMatches, 'autonomous.algaeProcessor');
    const avgAutoAlgaeNet = calculateAverage(teamMatches, 'autonomous.algaeNet');
    const mobilityPercentage = calculatePercentage(teamMatches, 'autonomous.mobility');
    
    // Teleop
    const avgTeleopCoralLevel1 = calculateAverage(teamMatches, 'teleop.coralLevel1');
    const avgTeleopCoralLevel2 = calculateAverage(teamMatches, 'teleop.coralLevel2');
    const avgTeleopCoralLevel3 = calculateAverage(teamMatches, 'teleop.coralLevel3');
    const avgTeleopCoralLevel4 = calculateAverage(teamMatches, 'teleop.coralLevel4');
    const avgTeleopAlgaeProcessor = calculateAverage(teamMatches, 'teleop.algaeProcessor');
    const avgTeleopAlgaeNet = calculateAverage(teamMatches, 'teleop.algaeNet');
    const avgTeleopAlgaeDescored = calculateAverage(teamMatches, 'teleop.algaeDescored');
    const avgTeleopMissedCycles = calculateAverage(teamMatches, 'teleop.missedCycles');
    
    // Endgame
    const robotParkedPercentage = calculatePercentage(teamMatches, 'endgame.robotParked');
    const shallowCageClimbPercentage = calculatePercentage(teamMatches, 'endgame.shallowCageClimb');
    const deepCageClimbPercentage = calculatePercentage(teamMatches, 'endgame.deepCageClimb');
    
    // Additional stats
    const playedDefensePercentage = calculatePercentage(teamMatches, 'additional.playedDefense');
    const avgDefenseRating = calculateAverage(teamMatches.filter(match => match.additional?.playedDefense), 'additional.defenseRating');
    const avgDriverSkill = calculateAverage(teamMatches, 'additional.driverSkill');
    const avgRobotSpeed = calculateAverage(teamMatches, 'additional.robotSpeed');
    const robotDiedPercentage = calculatePercentage(teamMatches, 'additional.robotDied');
    const robotTippedPercentage = calculatePercentage(teamMatches, 'additional.robotTipped');
    
    // Calculate average cycle time
    // First filter out matches with no cycle time data or invalid data
    const matchesWithCycleTime = teamMatches.filter(match => {
      const cycleTime = match.teleop?.cycleTime;
      return cycleTime && !isNaN(parseFloat(cycleTime));
    });
    
    const avgCycleTime = matchesWithCycleTime.length > 0 
      ? matchesWithCycleTime.reduce((sum, match) => sum + parseFloat(match.teleop.cycleTime), 0) / matchesWithCycleTime.length 
      : null;
    
    // Calculate offensive efficiency (points per match)
    const offensiveEfficiency = avgTotalPoints;
    
    // Calculate defensive efficiency (average defense rating)
    const defenseMatches = teamMatches.filter(match => match.additional?.playedDefense);
    const defenseCount = defenseMatches.length;
    
    // Collect all notes for this team
    const scouterNotes = teamMatches
      .filter(match => match.additional?.notes)
      .map(match => ({
        matchNumber: match.matchInfo?.matchNumber || 'Unknown Match',
        notes: match.additional?.notes,
        scouterInitials: match.matchInfo?.scouterInitials || 'Unknown'
      }));
    
    return {
      teamNumber,
      matchCount: teamMatches.length,
      // Overall stats
      avgAutoPoints,
      avgTeleopPoints,
      avgBargePoints,
      avgTotalPoints,
      offensiveEfficiency,
      avgDefenseRating,
      defenseCount,
      // Detailed stats for modal
      auto: {
        coralLevel1: avgAutoCoralLevel1,
        coralLevel2: avgAutoCoralLevel2,
        coralLevel3: avgAutoCoralLevel3,
        coralLevel4: avgAutoCoralLevel4,
        algaeProcessor: avgAutoAlgaeProcessor,
        algaeNet: avgAutoAlgaeNet,
        mobility: mobilityPercentage
      },
      teleop: {
        coralLevel1: avgTeleopCoralLevel1,
        coralLevel2: avgTeleopCoralLevel2,
        coralLevel3: avgTeleopCoralLevel3,
        coralLevel4: avgTeleopCoralLevel4,
        algaeProcessor: avgTeleopAlgaeProcessor,
        algaeNet: avgTeleopAlgaeNet,
        algaeDescored: avgTeleopAlgaeDescored,
        missedCycles: avgTeleopMissedCycles
      },
      endgame: {
        robotParked: robotParkedPercentage,
        shallowCageClimb: shallowCageClimbPercentage,
        deepCageClimb: deepCageClimbPercentage
      },
      additional: {
        playedDefense: playedDefensePercentage,
        defenseRating: avgDefenseRating,
        driverSkill: avgDriverSkill,
        robotSpeed: avgRobotSpeed,
        robotDied: robotDiedPercentage,
        robotTipped: robotTippedPercentage,
        cycleTime: avgCycleTime
      },
      // Add scouter notes to the team stats
      scouterNotes,
    };
  });

  // Create filtered datasets based on selected filters
  const filteredDatasets = [];
  
  if (offensiveFilters.auto) {
    filteredDatasets.push({
      label: 'Auto',
      data: teamStats.map(stat => stat.avgAutoPoints),
      backgroundColor: 'rgba(255, 99, 132, 0.8)', // Less transparent red
    });
  }
  
  if (offensiveFilters.teleop) {
    filteredDatasets.push({
      label: 'Teleop',
      data: teamStats.map(stat => stat.avgTeleopPoints),
      backgroundColor: 'rgba(54, 162, 235, 0.8)', // Less transparent blue
    });
  }
  
  if (offensiveFilters.endgame) {
    filteredDatasets.push({
      label: 'Endgame',
      data: teamStats.map(stat => stat.avgBargePoints),
      backgroundColor: 'rgba(75, 192, 192, 0.8)', // Less transparent teal
    });
  }
  
  if (offensiveFilters.efficiency) {
    filteredDatasets.push({
      label: 'Offensive Efficiency',
      data: teamStats.map(stat => stat.offensiveEfficiency),
      backgroundColor: 'rgba(153, 102, 255, 0.8)', // Less transparent purple
    });
  }

  // Prepare data for offensive chart with filtered datasets
  const offensiveChartData = {
    labels: teamStats.map(stat => stat.teamNumber),
    datasets: filteredDatasets,
  };

  // Prepare data for defensive chart
  const defensiveChartData = {
    labels: teamStats.map(stat => stat.teamNumber),
    datasets: [
      {
        label: 'Defense Rating',
        data: teamStats.map(stat => stat.avgDefenseRating),
        backgroundColor: 'rgba(255, 159, 64, 0.8)', // Orange
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
        title: {
          display: true,
          text: 'Team Number'
        }
      },
      y: {
        stacked: false,
        title: {
          display: true,
          text: 'Average Points'
        },
        min: 0
      }
    }
  };

  const defenseChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const teamStat = teamStats[context.dataIndex];
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return [
              `${label}: ${value.toFixed(1)}`,
              `Defense Matches: ${teamStat.defenseCount}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Team Number'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Defense Rating (1-10)'
        },
        min: 0,
        max: 10
      }
    }
  };
  
  // Handle filter changes
  const toggleFilter = (filter) => {
    setOffensiveFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };
  
  // Handle team card click
  const handleTeamCardClick = (team) => {
    setSelectedTeam(team);
  };
  
  // Close modal
  const closeModal = () => {
    setSelectedTeam(null);
  };

  return (
    <div className="team-stats">
      
      {/* Offensive Chart Filters */}
      <div className="chart-filters">
        <div className="filter-title">Show:</div>
        <div className="filter-options">
          <label className={`filter-option ${offensiveFilters.auto ? 'active' : ''}`}>
            <input 
              type="checkbox" 
              checked={offensiveFilters.auto} 
              onChange={() => toggleFilter('auto')} 
            />
            <span className="filter-label auto">Auto</span>
          </label>
          
          <label className={`filter-option ${offensiveFilters.teleop ? 'active' : ''}`}>
            <input 
              type="checkbox" 
              checked={offensiveFilters.teleop} 
              onChange={() => toggleFilter('teleop')} 
            />
            <span className="filter-label teleop">Teleop</span>
          </label>
          
          <label className={`filter-option ${offensiveFilters.endgame ? 'active' : ''}`}>
            <input 
              type="checkbox" 
              checked={offensiveFilters.endgame} 
              onChange={() => toggleFilter('endgame')} 
            />
            <span className="filter-label endgame">Endgame</span>
          </label>
          
          <label className={`filter-option ${offensiveFilters.efficiency ? 'active' : ''}`}>
            <input 
              type="checkbox" 
              checked={offensiveFilters.efficiency} 
              onChange={() => toggleFilter('efficiency')} 
            />
            <span className="filter-label efficiency">Off. Efficiency</span>
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
            onClick={() => handleTeamCardClick(stats)}
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
                <div className="stat-value">{stats.avgBargePoints.toFixed(1)}</div>
              </div>
              
              <div className="stat-box efficiency">
                <div className="stat-label">Off. Efficiency</div>
                <div className="stat-value">{stats.offensiveEfficiency.toFixed(1)}</div>
              </div>
              
              <div className="stat-box defense">
                <div className="stat-label">Defense Rating</div>
                <div className="stat-value">
                  {stats.defenseCount > 0 
                    ? `${stats.avgDefenseRating.toFixed(1)} (${stats.defenseCount})` 
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Detailed Team Stats Modal */}
      {selectedTeam && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Team {selectedTeam.teamNumber} Detailed Stats</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="match-count">{selectedTeam.matchCount} matches analyzed</p>
              
              <div className="stats-explanation">
                <p><strong>Note:</strong> Numbers show average per match. Percentages show how often the team successfully completed an action.</p>
              </div>
              
              <div className="detailed-stats">
                <div className="detailed-section auto">
                  <h3>Autonomous Period</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Mobility</div>
                      <div className="detailed-value">{selectedTeam.auto.mobility.toFixed(1)}% of matches</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 1</div>
                      <div className="detailed-value">{selectedTeam.auto.coralLevel1.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 2</div>
                      <div className="detailed-value">{selectedTeam.auto.coralLevel2.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 3</div>
                      <div className="detailed-value">{selectedTeam.auto.coralLevel3.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 4</div>
                      <div className="detailed-value">{selectedTeam.auto.coralLevel4.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Algae Processor</div>
                      <div className="detailed-value">{selectedTeam.auto.algaeProcessor.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Algae Net</div>
                      <div className="detailed-value">{selectedTeam.auto.algaeNet.toFixed(2)} avg</div>
                    </div>
                  </div>
                </div>
                
                <div className="detailed-section teleop">
                  <h3>Teleop Period</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 1</div>
                      <div className="detailed-value">{selectedTeam.teleop.coralLevel1.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 2</div>
                      <div className="detailed-value">{selectedTeam.teleop.coralLevel2.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 3</div>
                      <div className="detailed-value">{selectedTeam.teleop.coralLevel3.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Coral Level 4</div>
                      <div className="detailed-value">{selectedTeam.teleop.coralLevel4.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Missed Cycles</div>
                      <div className="detailed-value">{selectedTeam.teleop.missedCycles.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Algae Processor</div>
                      <div className="detailed-value">{selectedTeam.teleop.algaeProcessor.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Algae Net</div>
                      <div className="detailed-value">{selectedTeam.teleop.algaeNet.toFixed(2)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Algae Descored</div>
                      <div className="detailed-value">{selectedTeam.teleop.algaeDescored.toFixed(2)} avg</div>
                    </div>
                  </div>
                </div>
                
                <div className="detailed-section endgame">
                  <h3>Endgame</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Robot Parked</div>
                      <div className="detailed-value">{selectedTeam.endgame.robotParked.toFixed(1)}% of matches</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Shallow Cage Climb</div>
                      <div className="detailed-value">{selectedTeam.endgame.shallowCageClimb.toFixed(1)}% of matches</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Deep Cage Climb</div>
                      <div className="detailed-value">{selectedTeam.endgame.deepCageClimb.toFixed(1)}% of matches</div>
                    </div>
                  </div>
                </div>
                
                <div className="detailed-section additional">
                  <h3>Additional Stats</h3>
                  <div className="detailed-grid">
                    <div className="detailed-item">
                      <div className="detailed-label">Played Defense</div>
                      <div className="detailed-value">{selectedTeam.additional.playedDefense.toFixed(1)}% of matches</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Defense Rating</div>
                      <div className="detailed-value">
                        {selectedTeam.defenseCount > 0 
                          ? `${selectedTeam.additional.defenseRating.toFixed(1)} avg` 
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Driver Skill</div>
                      <div className="detailed-value">{selectedTeam.additional.driverSkill.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Robot Speed</div>
                      <div className="detailed-value">{selectedTeam.additional.robotSpeed.toFixed(1)} avg</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Cycle Time</div>
                      <div className="detailed-value">
                        {selectedTeam.additional.cycleTime !== null 
                          ? `${selectedTeam.additional.cycleTime.toFixed(1)} sec` 
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Robot Died</div>
                      <div className="detailed-value">{selectedTeam.additional.robotDied.toFixed(1)}% of matches</div>
                    </div>
                    <div className="detailed-item">
                      <div className="detailed-label">Robot Tipped</div>
                      <div className="detailed-value">{selectedTeam.additional.robotTipped.toFixed(1)}% of matches</div>
                    </div>
                  </div>
                </div>
                
                {/* Scouter Notes Section */}
                <div className="detailed-section notes">
                  <h3>Scouter Notes</h3>
                  {selectedTeam.scouterNotes && selectedTeam.scouterNotes.length > 0 ? (
                    <div className="notes-container">
                      {selectedTeam.scouterNotes.map((note, index) => (
                        <div key={index} className="note-item">
                          <div className="note-match"><strong>Match {note.matchNumber}:</strong></div>
                          <div className="note-text">{note.notes}</div>
                          <div className="note-scouter">Scouted by: {note.scouterInitials}</div>
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

// Helper function to calculate average of a nested property
function calculateAverage(matches, propertyPath) {
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
  
  return matches.length > 0 ? sum / matches.length : 0;
}

// Helper function to calculate percentage of boolean properties
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

export default TeamStats;
