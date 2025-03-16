import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './firebase.config'; // Import Firebase configuration
import reportWebVitals from './reportWebVitals';

// Create a root
const root = createRoot(document.getElementById('root'));

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
