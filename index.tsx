import React from 'react';
import ReactDOM from 'react-dom/client';
// Cleanup broken localStorage and sessionStorage state before initializing the app and Zustand
try {
  const storages = [localStorage, sessionStorage];
  for (const storage of storages) {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key) {
        const val = storage.getItem(key);
        if (val === null || val === undefined) {
          storage.removeItem(key);
        } else {
          const trimmed = val.trim();
          if (trimmed === "undefined" || trimmed === "null" || trimmed === "") {
            storage.removeItem(key);
          }
        }
      }
    }
  }
} catch (e) {
  console.warn("Failed to cleanup storages", e);
}

import App from './App';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('"undefined" is not valid JSON')) {
    console.warn('Suppressed unhandled rejection:', event.reason);
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
