import React from 'react';

function MatchTable({ matches, onSelectMatch }) {
  // Sort matches by match number (ascending)
  const sortedMatches = [...matches].sort((a, b) => {
    const matchNumA = parseInt(a.matchInfo?.matchNumber || '0');
    const matchNumB = parseInt(b.matchInfo?.matchNumber || '0');
    return matchNumA - matchNumB;
  });

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
              onClick={() => onSelectMatch && onSelectMatch(match)}
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
    </div>
  );
}

export default MatchTable;
