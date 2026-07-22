import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import { LoginGate } from './components/LoginGate';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <LoginGate>
          <App />
        </LoginGate>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
