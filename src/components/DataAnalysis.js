import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import TeamStats from './TeamStats';
import MatchTable from './MatchTable';
import { db } from '../firebase.client.js';

function DataAnalysis() {
  const [scoutingData, setScoutingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load data from Firestore
    const fetchData = async () => {
      try {
        console.log("Fetching data from Firestore...");
        
        // Changed collection name from "scoutingDataDCMP" to "scoutingDataChamps"
        const scoutingSnapshot = await getDocs(collection(db, "scoutingDataChamps"));
        
        console.log("Data received:", scoutingSnapshot.size, "documents");
        const data = [];
        scoutingSnapshot.forEach((doc) => {
          const docData = doc.data();
          console.log("Document data:", docData);
          data.push({ id: doc.id, ...docData });
        });
        console.log("Processed data:", data);
        
        setScoutingData(data);
        setFilteredData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const applyFilters = () => {
    console.log("Applying filter for team:", teamFilter);
    console.log("Current data:", scoutingData);
    
    let filtered = [...scoutingData];
    
    if (teamFilter && teamFilter.trim() !== '') {
      filtered = filtered.filter(match => {
        // Skip if matchInfo or teamNumber is missing
        if (!match.matchInfo || !match.matchInfo.teamNumber) {
          return false;
        }
        
        // Convert both to strings for comparison
        const matchTeamNumber = String(match.matchInfo.teamNumber).trim();
        const filterTeamNumber = String(teamFilter).trim();
        
        console.log(`Comparing: "${matchTeamNumber}" with "${filterTeamNumber}"`);
        
        // Simple string equality
        return matchTeamNumber === filterTeamNumber;
      });
    }
    
    console.log("Filtered data:", filtered);
    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setTeamFilter('');
    setFilteredData(scoutingData);
  };

  // Updated function to export notes organized by team number with scouter initials
  const exportNotesToFile = () => {
    // Group notes by team number
    const notesByTeam = {};
    
    filteredData.forEach(match => {
      const teamNumber = match.matchInfo?.teamNumber || 'Unknown Team';
      const matchNumber = match.matchInfo?.matchNumber || 'Unknown Match';
      const note = match.additional?.notes || '';
      const scouterInitials = match.matchInfo?.scouterInitials || match.scouterInitials || 'Unknown';
      
      // Skip empty notes
      if (!note.trim()) return;
      
      // Create team entry if it doesn't exist
      if (!notesByTeam[teamNumber]) {
        notesByTeam[teamNumber] = [];
      }
      
      // Add this note to the team's collection with scouter initials
      notesByTeam[teamNumber].push({
        matchNumber,
        note,
        scouterInitials,
        formatted: `Match ${matchNumber} (${scouterInitials}): ${note}`
      });
    });
    
    // Get sorted team numbers (convert to numbers for proper sorting)
    const sortedTeams = Object.keys(notesByTeam).sort((a, b) => {
      // Handle 'Unknown Team' special case
      if (a === 'Unknown Team') return 1;
      if (b === 'Unknown Team') return -1;
      
      // Convert to numbers and compare
      return parseInt(a) - parseInt(b);
    });
    
    // Build file content with team headers and indented notes
    const fileContent = sortedTeams.map(teamNumber => {
      const teamNotes = notesByTeam[teamNumber];
      const teamHeader = `Team ${teamNumber}:`;
      const formattedNotes = teamNotes.map(entry => `  ${entry.formatted}`).join('\n');
      
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
      <h2>Team Performance Analysis</h2>
      
      <div className="filters">
        <h3>Filters</h3>
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
      
      <h3>Match History</h3>
      <MatchTable matches={filteredData} />
      
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
