import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import TeamStats from './TeamStats';
import MatchTable from './MatchTable';

function DataAnalysis() {
  const [scoutingData, setScoutingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data from Firestore
    const fetchData = async () => {
      try {
        console.log("Fetching data from Firestore...");
        const db = getFirestore();
        
        // Make sure this collection name matches what you use in ScoutingForm.js
        const querySnapshot = await getDocs(collection(db, "scoutingData"));
        
        console.log("Data received:", querySnapshot.size, "documents");
        const data = [];
        querySnapshot.forEach((doc) => {
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

  if (loading) {
    return <div className="container">Loading data...</div>;
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
      
    </div>
  );
}

export default DataAnalysis;
