import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import PublicPresentationPage from './components/public/PublicPresentationPage';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Detect public presentation route — bypass auth entirely
const isPublicPresentation = window.location.pathname.startsWith('/presentation/share/');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPublicPresentation ? (
      <PublicPresentationPage />
    ) : (
      <AuthProvider>
        <BrandingProvider>
          <App />
        </BrandingProvider>
      </AuthProvider>
    )}
  </React.StrictMode>
);