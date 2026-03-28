import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TeamStats from './TeamStats';
import MatchTable from './MatchTable';
import { db } from '../firebase.client.js';

function DataAnalysis() {
  const [scoutingData, setScoutingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMatchHistory, setShowMatchHistory] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const scoutingSnapshot = await getDocs(collection(db, "scoutingDataAsheville26"));
      
      const data = [];
      scoutingSnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({ id: doc.id, ...docData });
      });
      
      setScoutingData(data);
      setFilteredData(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const applyFilters = () => {
    let filtered = [...scoutingData];
    
    if (teamFilter && teamFilter.trim() !== '') {
      filtered = filtered.filter(match => {
        if (!match.matchInfo || !match.matchInfo.teamNumber) {
          return false;
        }
        
        const matchTeamNumber = String(match.matchInfo.teamNumber).trim();
        const filterTeamNumber = String(teamFilter).trim();
        
        return matchTeamNumber === filterTeamNumber;
      });
    }
    
    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setTeamFilter('');
    setFilteredData(scoutingData);
  };

  const exportNotesToFile = () => {
    const notesByTeam = {};
    
    filteredData.forEach(match => {
      const teamNumber = match.matchInfo?.teamNumber || 'Unknown Team';
      const matchNumber = match.matchInfo?.matchNumber || 'Unknown Match';
      const scouterName = match.matchInfo?.scouterName || match.matchInfo?.scouterInitials || 'Unknown';
      
      const onCycle = match.additional?.onCycleNotes || '';
      const offCycle = match.additional?.offCycleNotes || '';
      const general = match.additional?.generalNotes || '';
      const legacy = match.additional?.notes || '';
      
      const hasAnyNotes = onCycle.trim() || offCycle.trim() || general.trim() || legacy.trim();
      if (!hasAnyNotes) return;
      
      if (!notesByTeam[teamNumber]) {
        notesByTeam[teamNumber] = [];
      }
      
      const lines = [`Match ${matchNumber} (${scouterName}):`];
      if (onCycle.trim()) lines.push(`    On Cycle: ${onCycle}`);
      if (offCycle.trim()) lines.push(`    Off Cycle: ${offCycle}`);
      if (general.trim()) lines.push(`    General: ${general}`);
      if (legacy.trim() && !onCycle.trim() && !offCycle.trim() && !general.trim()) {
        lines.push(`    Notes: ${legacy}`);
      }
      
      notesByTeam[teamNumber].push({
        matchNumber,
        formatted: lines.map(l => `  ${l}`).join('\n')
      });
    });
    
    const sortedTeams = Object.keys(notesByTeam).sort((a, b) => {
      if (a === 'Unknown Team') return 1;
      if (b === 'Unknown Team') return -1;
      return parseInt(a) - parseInt(b);
    });
    
    const fileContent = sortedTeams.map(teamNumber => {
      const teamNotes = notesByTeam[teamNumber];
      const teamHeader = `Team ${teamNumber}:`;
      const formattedNotes = teamNotes.map(entry => entry.formatted).join('\n');
      return `${teamHeader}\n${formattedNotes}`;
    }).join('\n\n');
    
    // Create a blob with the text content
    const blob = new Blob([fileContent], { type: 'text/plain' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `scouter_notes${teamFilter ? `_team_${teamFilter}` : ''}.txt`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="container">Loading data...</div>;
  }

  if (error) {
    return <div className="container">
      <h2>Error loading data</h2>
      <p>{error}</p>
      <p>Make sure you're connected to the internet and try refreshing the page.</p>
    </div>;
  }

  if (filteredData.length === 0) {
    return <div className="container">
      <h1>Team Performance Analysis</h1>
      <p>No data available. {teamFilter ? `No results found for team ${teamFilter}.` : 'Try adding some scouting data first.'}</p>
      
      <div className="filters">
        <h2>Filters</h2>
        <div className="form-group">
          <label htmlFor="teamFilter">Team Number:</label>
          <input 
            type="text" 
            id="teamFilter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={applyFilters}>Apply Filters</button>
          <button onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>
    </div>;
  }

  return (
    <div className="container">
      <h1>Team Performance Analysis</h1>
      
      <div className="filters">
        <h2>Filters</h2>
        <div className="form-group">
          <label htmlFor="teamFilter">Team Number:</label>
          <input 
            type="text" 
            id="teamFilter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={applyFilters}>Apply Filters</button>
          <button onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>
      
      <TeamStats matches={filteredData} />
      
      <div className="collapsible-header" onClick={() => setShowMatchHistory(!showMatchHistory)}>
        {showMatchHistory ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
        <h2>Match History</h2>
      </div>
      {showMatchHistory && <MatchTable matches={filteredData} onMatchUpdated={fetchData} />}
      
      {/* New export button */}
      {filteredData.length > 0 && (
        <div className="export-section" style={{ marginTop: '30px', marginBottom: '30px' }}>
          <button 
            onClick={exportNotesToFile}
            style={{
              backgroundColor: '#4285f4',
              color: 'white',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Export Scouter Notes to Text File
          </button>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            Download all notes from the currently displayed matches as a text file.
          </p>
        </div>
      )}
      
    </div>
  );
}

export default DataAnalysis;
