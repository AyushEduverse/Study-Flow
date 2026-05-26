/* ========================================
   updater.js — PWA Update Manager
   Detects SW updates and shows update modal
   ======================================== */

const UpdateManager = {

  _registration: null,

  // ----- Initialize -----

  init(registration) {
    this._registration = registration;

    // If there's already a waiting SW (user came back with a pending update)
    if (registration.waiting) {
      this._onUpdateAvailable();
    }

    // Listen for future updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New content installed but old SW still controls the page
          this._onUpdateAvailable();
        }
      });
    });

    // Listen for controller change (user tapped Update Now)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  },

  // ----- Show update modal -----

  _onUpdateAvailable() {
    // Don't re-show if dismissed this session
    if (sessionStorage.getItem('sf_update_dismissed')) return;

    const overlay = document.getElementById('update-overlay');
    const sheet = document.getElementById('update-sheet');

    overlay.style.display = 'flex';
    sheet.classList.remove('slide-down');
    sheet.classList.add('slide-up');

    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  // ----- User taps "Update Now" -----

  updateNow() {
    const sw = this._getWaitingWorker();
    if (!sw) {
      // No waiting worker — just reload
      window.location.reload();
      return;
    }

    // Show progress
    const actions = document.getElementById('update-actions');
    const progress = document.getElementById('update-progress');
    if (actions) actions.style.display = 'none';
    if (progress) progress.classList.add('active');

    // Tell SW to skip waiting
    sw.postMessage({ type: 'SKIP_WAITING' });
    // controllerchange listener will reload the page
  },

  // ----- User taps "Later" -----

  dismiss() {
    sessionStorage.setItem('sf_update_dismissed', '1');

    const overlay = document.getElementById('update-overlay');
    const sheet = document.getElementById('update-sheet');

    sheet.classList.remove('slide-up');
    sheet.classList.add('slide-down');

    setTimeout(() => {
      overlay.style.display = 'none';
      sheet.classList.remove('slide-down');
      // Reset modal to initial state
      const actions = document.getElementById('update-actions');
      const progress = document.getElementById('update-progress');
      if (actions) actions.style.display = '';
      if (progress) progress.classList.remove('active');
    }, 280);
  },

  // ----- Get the waiting service worker -----

  _getWaitingWorker() {
    if (!this._registration) return null;
    return this._registration.waiting;
  }
};

// ----- Button listeners -----

document.getElementById('update-btn-now').addEventListener('click', () => {
  UpdateManager.updateNow();
});

document.getElementById('update-btn-later').addEventListener('click', () => {
  UpdateManager.dismiss();
});

// Overlay backdrop click = dismiss
document.getElementById('update-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'update-overlay') {
    UpdateManager.dismiss();
  }
});
