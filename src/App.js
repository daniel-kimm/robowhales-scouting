import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScoutingForm from './components/ScoutingForm';
import DataAnalysis from './components/DataAnalysis';
import ChatBot from './components/ChatBot';
import TestChat from './components/TestChat';
import AdminTools from './components/AdminTools';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
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
  
  // Password component
  const PasswordProtection = () => (
    <div className="password-protection">
      <div className="password-container">
        <h1 className="app-title">robowhales|9032</h1>
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
  
  // Protected route component
  const ProtectedRoute = ({ element }) => {
    return isAuthenticated ? element : <PasswordProtection />;
  };
  
  // Main app content
  return (
    <Router>
      <div className="app">
        {isAuthenticated && (
          <div className="navbar-wrapper">
            <div className="navbar-container">
              {/* Logo */}
              <Link to="/" className="navbar-logo">
                <h1 className="app-title">robowhales|9032</h1>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="navbar-links">
                <Link to="/" className="nav-link">Scouting Form</Link>
                <Link to="/analysis" className="nav-link">Data Analysis</Link>
                <Link to="/assistant" className="nav-link">Scout Assistant</Link>
                <Link to="/admin" className="nav-link">Admin Tools</Link>
              </nav>

              {/* Mobile Hamburger */}
              <button
                className="nav-toggle"
                aria-label="Toggle navigation menu"
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen(!isNavOpen)}
              >
                <span className="bar" />
                <span className="bar" />
                <span className="bar" />
              </button>

              {/* Mobile Dropdown */}
              {isNavOpen && (
                <div className="mobile-nav-dropdown" onClick={() => setIsNavOpen(false)}>
                  <Link to="/" className="mobile-nav-link">Scouting Form</Link>
                  <Link to="/analysis" className="mobile-nav-link">Data Analysis</Link>
                  <Link to="/assistant" className="mobile-nav-link">Scout Assistant</Link>
                  <Link to="/admin" className="mobile-nav-link">Admin Tools</Link>
                </div>
              )}
            </div>
          </div>
        )}
        
        <main>
          <Routes>
            <Route path="/" element={<ProtectedRoute element={<ScoutingForm />} />} />
            <Route path="/analysis" element={<ProtectedRoute element={<DataAnalysis />} />} />
            <Route path="/assistant" element={<ProtectedRoute element={<ChatBot />} />} />
            <Route path="/test-chat" element={<ProtectedRoute element={<TestChat />} />} />
            <Route path="/admin" element={<ProtectedRoute element={<AdminTools />} />} />
          </Routes>
        </main>
        
        {isAuthenticated && (
          <footer>
            <p>© {new Date().getFullYear()} RoboWhales FRC Team 9032, Cary, NC</p>
          </footer>
        )}
      </div>
    </Router>
  );
}

export default App;