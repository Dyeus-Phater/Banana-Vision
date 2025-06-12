
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { inject } from '@vercel/analytics';

inject(); // Initialize Vercel Analytics

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