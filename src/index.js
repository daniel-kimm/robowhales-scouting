import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './firebase.config'; // Import Firebase configuration
import reportWebVitals from './reportWebVitals';
import { startAutoFlush } from './utils/offlineQueue';
import { registerServiceWorker } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Kick off background uploads for any submissions that were saved while
// offline in a previous session.
startAutoFlush();

// Cache the app shell so the page itself loads with no wifi (production only).
registerServiceWorker();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
