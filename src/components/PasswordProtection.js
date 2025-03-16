import React, { useState, useEffect } from 'react';

function PasswordProtection({ onPasswordSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const correctPassword = '***REMOVED***';
  
  useEffect(() => {
    console.log("PasswordProtection component mounted");
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password === correctPassword) {
      localStorage.setItem('passwordAuthenticated', 'true');
      onPasswordSuccess();
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  console.log("Rendering PasswordProtection component");
  
  return (
    <div className="password-protection">
      <div className="password-container">
        <h1 className="app-title">robowhales|9032</h1>
        <h2>Scouting App</h2>
        <p>Please enter the password to access the scouting app:</p>
        
        <form onSubmit={handleSubmit}>
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

export default PasswordProtection; 