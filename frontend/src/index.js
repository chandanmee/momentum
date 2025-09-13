import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Import global styles
import './index.css';

// Get the root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality (disabled in development)
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      console.log('Service Worker registered successfully:', registration);
    },
    onUpdate: (registration) => {
      console.log('Service Worker updated:', registration);
      // You can show a notification to the user about the update
      if (window.confirm('A new version is available. Reload to update?')) {
        window.location.reload();
      }
    },
    onOffline: () => {
      console.log('App is running in offline mode');
      // You can show an offline indicator
    },
    onError: (error) => {
      console.error('Service Worker registration failed:', error);
    },
  });
} else {
  console.log('Service Worker registration skipped in development mode');
}

// Measure performance
reportWebVitals((metric) => {
  // You can send metrics to an analytics endpoint
  console.log('Web Vitals:', metric);
});

// PWA install prompt handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button or banner
  const installBanner = document.getElementById('install-banner');
  if (installBanner) {
    installBanner.style.display = 'block';
  }
});

// Handle install button click
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
});

// Export install prompt function for use in components
window.showInstallPrompt = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  }
};

// Handle app updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // A new service worker has taken control
    window.location.reload();
  });
}

// Handle online/offline status
window.addEventListener('online', () => {
  console.log('App is back online');
  // You can dispatch a Redux action or show a notification
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  // You can dispatch a Redux action or show a notification
});

// Handle visibility change (for background sync)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('App became visible');
    // You can sync data or refresh the UI
  }
});

// Prevent zoom on iOS Safari
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Handle safe area insets for PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  document.body.classList.add('standalone');
}

// Add viewport meta tag for mobile
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(viewport);
}