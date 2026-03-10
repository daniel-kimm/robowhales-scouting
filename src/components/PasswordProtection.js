import React, { useState } from 'react';

function PasswordProtection({ onPasswordSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const correctPassword = process.env.REACT_APP_PASSWORD;
  
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