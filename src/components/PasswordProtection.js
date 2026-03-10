import React, { useState } from 'react';

function PasswordProtection({ onPasswordSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        localStorage.setItem('authToken', data.token);
        onPasswordSuccess();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
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
