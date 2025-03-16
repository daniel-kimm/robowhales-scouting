import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScoutingForm from './components/ScoutingForm';
import DataAnalysis from './components/DataAnalysis';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const correctPassword = '***REMOVED***';
  
  useEffect(() => {
    // Check if user is already authenticated
    const authenticated = localStorage.getItem('passwordAuthenticated') === 'true';
    console.log("Authentication check on load:", authenticated);
    
    // If authenticated, update state
    if (authenticated) {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    console.log("Password submitted:", password);
    
    if (password === correctPassword) {
      console.log("Password correct! Setting localStorage...");
      // Set authentication in localStorage
      localStorage.setItem('passwordAuthenticated', 'true');
      console.log("localStorage set to:", localStorage.getItem('passwordAuthenticated'));
      
      setIsAuthenticated(true);
      setError('');
    } else {
      console.log("Password incorrect!");
      setError('Incorrect password. Please try again.');
    }
  };
  
  // Simple password page
  if (!isAuthenticated) {
    return (
      <div className="password-protection">
        <div className="password-container">
          <h1 className="app-title">robowhales team 9032</h1>
          <h2>Scouting App</h2>
          <p>Please enter the password to access the scouting app:</p>
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="password-input"
                autoFocus
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" className="submit-btn">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Main app content
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">robowhales team 9032</h1>
          <nav>
            <Link to="/">Scouting Form</Link>
            <Link to="/analysis">Data Analysis</Link>
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<ScoutingForm />} />
            <Route path="/analysis" element={<DataAnalysis />} />
          </Routes>
        </main>
        
        <footer>
          <p>© {new Date().getFullYear()} RoboWhales FRC Team 9032, Cary, NC</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;