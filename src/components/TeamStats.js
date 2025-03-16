import React from 'react';
import { Bar } from 'react-chartjs-2';
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
  // Skip if no matches
  if (!matches || matches.length === 0) {
    return (
      <div className="team-stats">
        <h3>Team Statistics</h3>
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
    
    // Calculate averages
    const avgAutoPoints = calculateAverage(teamMatches, 'scores.autoPoints');
    const avgTeleopPoints = calculateAverage(teamMatches, 'scores.teleopPoints');
    const avgBargePoints = calculateAverage(teamMatches, 'scores.bargePoints');
    const avgTotalPoints = calculateAverage(teamMatches, 'scores.totalPoints');
    
    // Calculate offensive efficiency (points per match)
    const offensiveEfficiency = avgTotalPoints;
    
    // Calculate defensive efficiency (average defense rating)
    const defenseMatches = teamMatches.filter(match => match.additional?.playedDefense);
    const avgDefenseRating = calculateAverage(defenseMatches, 'additional.defenseRating');
    const defenseCount = defenseMatches.length;
    
    return {
      teamNumber,
      matchCount: teamMatches.length,
      avgAutoPoints,
      avgTeleopPoints,
      avgBargePoints,
      avgTotalPoints,
      offensiveEfficiency,
      avgDefenseRating,
      defenseCount
    };
  });

  // Prepare data for offensive chart
  const offensiveChartData = {
    labels: teamStats.map(stat => stat.teamNumber),
    datasets: [
      {
        label: 'Auto',
        data: teamStats.map(stat => stat.avgAutoPoints),
        backgroundColor: 'rgba(255, 99, 132, 0.8)', // Less transparent red
      },
      {
        label: 'Teleop',
        data: teamStats.map(stat => stat.avgTeleopPoints),
        backgroundColor: 'rgba(54, 162, 235, 0.8)', // Less transparent blue
      },
      {
        label: 'Endgame',
        data: teamStats.map(stat => stat.avgBargePoints),
        backgroundColor: 'rgba(75, 192, 192, 0.8)', // Less transparent teal
      },
      {
        label: 'Offensive Efficiency',
        data: teamStats.map(stat => stat.offensiveEfficiency),
        backgroundColor: 'rgba(153, 102, 255, 0.8)', // Less transparent purple
      },
    ],
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
      title: {
        display: true,
        text: 'Average Points by Team',
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
      title: {
        display: true,
        text: 'Average Defense Rating by Team',
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

  return (
    <div className="team-stats">
      <h3>Team Statistics</h3>
      
      {/* Offensive Chart */}
      <div className="chart-container">
        <h4>Offensive Performance</h4>
        <Bar data={offensiveChartData} options={chartOptions} />
      </div>
      
      {/* Defensive Chart */}
      <div className="chart-container">
        <h4>Defensive Performance</h4>
        <Bar data={defensiveChartData} options={defenseChartOptions} />
      </div>
      
      {/* Team Stats Cards */}
      <div className="team-stats-cards">
        {teamStats.map(stats => (
          <div key={stats.teamNumber} className="team-stat-card">
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
    </div>
  );
}

// Helper function to calculate average of a nested property
function calculateAverage(matches, propertyPath) {
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

export default TeamStats;
