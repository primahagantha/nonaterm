import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import 'xterm/css/xterm.css';
import '@/styles/tokens.css';
import '@/styles/app.css';
import '@/styles/modals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
