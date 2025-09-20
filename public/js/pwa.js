// PWA Installation and Service Worker Registration
let deferredPrompt;
let installButton;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Handle PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show install button
  showInstallButton();
});

// Show install button
function showInstallButton() {
  // Create install button if it doesn't exist
  if (!document.getElementById('pwa-install-btn')) {
    const installBtn = document.createElement('button');
    installBtn.id = 'pwa-install-btn';
    installBtn.className = 'btn btn-success btn-sm position-fixed';
    installBtn.style.cssText = `
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      border-radius: 25px;
      padding: 10px 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    installBtn.innerHTML = '<i class="fas fa-download me-1"></i>Install App';
    installBtn.addEventListener('click', installPWA);
    document.body.appendChild(installBtn);
    installButton = installBtn;
  }
}

// Install PWA
function installPWA() {
  if (deferredPrompt) {
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
        hideInstallButton();
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      deferredPrompt = null;
    });
  }
}

// Hide install button
function hideInstallButton() {
  if (installButton) {
    installButton.remove();
    installButton = null;
  }
}

// Handle app installed
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed');
  hideInstallButton();
});

// Check if app is running in standalone mode
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Add PWA-specific styles when in standalone mode
if (isStandalone()) {
  document.documentElement.classList.add('pwa-standalone');
}

// Handle network status changes
window.addEventListener('online', () => {
  console.log('App is online');
  showNetworkStatus('online');
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  showNetworkStatus('offline');
});

// Show network status
function showNetworkStatus(status) {
  // Remove existing status
  const existingStatus = document.getElementById('network-status');
  if (existingStatus) {
    existingStatus.remove();
  }

  if (status === 'offline') {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'network-status';
    statusDiv.className = 'alert alert-warning position-fixed';
    statusDiv.style.cssText = `
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1050;
      margin: 0;
      border-radius: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    statusDiv.innerHTML = '<i class="fas fa-wifi me-2"></i>You are offline. Some features may be limited.';
    document.body.appendChild(statusDiv);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.remove();
      }
    }, 5000);
  }
}

// Initialize PWA features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check initial network status
  if (!navigator.onLine) {
    showNetworkStatus('offline');
  }
  
  // Add PWA meta tags if not present
  addPWAMetaTags();
});

// Add PWA meta tags
function addPWAMetaTags() {
  const head = document.head;
  
  // Add manifest link if not present
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    head.appendChild(manifestLink);
  }
  
  // Add theme color if not present
  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#2c5aa0';
    head.appendChild(themeColor);
  }
  
  // Add apple-mobile-web-app-capable if not present
  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    head.appendChild(appleCapable);
  }
  
  // Add apple-mobile-web-app-status-bar-style if not present
  if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
    const appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    appleStatusBar.content = 'default';
    head.appendChild(appleStatusBar);
  }
}
