import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import IslamicToolsOverlay from './features/islamic/IslamicToolsOverlay';
import IslamicAI from './features/ai/IslamicAI';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <IslamicToolsOverlay />
    <IslamicAI />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
