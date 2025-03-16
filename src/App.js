import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScoutingForm from './components/ScoutingForm';
import DataAnalysis from './components/DataAnalysis';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">robowhales|9032</h1>
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