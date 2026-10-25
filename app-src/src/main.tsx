import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initCapacitorBridges } from './lib/capacitor';
import App from './App.tsx';
import './index.css';

// No-op on desktop/web; defines the auth + share bridges on Android.
initCapacitorBridges();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
