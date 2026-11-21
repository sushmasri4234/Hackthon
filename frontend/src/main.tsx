import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#059669', secondary: '#f1f5f9' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#f1f5f9' },
          },
        }}
      />
    </AuthProvider>
  </StrictMode>
);
