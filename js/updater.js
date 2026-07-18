/* ========================================
   updater.js — PWA Update Manager
   Dual detection: version.json polling + SW lifecycle
   ======================================== */

const APP_VERSION = '1.9.0';
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

const UpdateManager = {

  _registration: null,
  _checkTimer: null,
  _updateShown: false,
  _currentRemoteVersion: null,

  // ----- Initialize -----

  init(registration) {
    this._registration = registration;

    // Primary: version.json polling (most reliable)
    this._startVersionPolling();

    // Secondary: SW lifecycle events (catches updates between polls)
    if (registration.waiting) {
      this._onUpdateAvailable();
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this._onUpdateAvailable();
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Backup data before reload to prevent data loss during SW takeover
      if (typeof Storage !== 'undefined' && Storage.backupAll) {
        Storage.backupAll();
      }
      window.location.reload();
    });
  },

  // ----- Version.json polling -----

  _startVersionPolling() {
    // Check immediately on load (after a small delay to not block rendering)
    setTimeout(() => this._checkVersionJson(), 3000);

    // Then check periodically
    this._checkTimer = setInterval(() => this._checkVersionJson(), UPDATE_CHECK_INTERVAL);

    // Also check when page becomes visible again (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this._checkVersionJson();
      }
    });
  },

  async _checkVersionJson() {
    try {
      // Relative path — works on GitHub Pages sub-path and localhost
      const res = await fetch('./version.json', { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      if (!data.version) return;

      this._currentRemoteVersion = data.version;

      // Skip if user already accepted this version (persists across reloads)
      const accepted = localStorage.getItem('sf_update_accepted');
      if (accepted === data.version) return;

      if (this._isNewer(data.version, APP_VERSION)) {
        this._onUpdateAvailable();
      }
    } catch (e) {
      // Network error or parse error — silent, will retry on next interval
    }
  },

  // ----- Semver comparison (major.minor.patch) -----

  _isNewer(remote, local) {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  },

  // ----- Show update modal -----

  _onUpdateAvailable() {
    if (this._updateShown) return;
    if (sessionStorage.getItem('sf_update_dismissed')) return;

    this._updateShown = true;

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

  async updateNow() {
    // Resolve remote version (might be null if SW triggered the popup)
    let version = this._currentRemoteVersion;
    if (!version) {
      try {
        const res = await fetch('./version.json', { cache: 'no-store' });
        const data = await res.json();
        version = data.version;
      } catch (e) { /* ignore */ }
    }

    // Mark this remote version as accepted (persists across reload)
    if (version) {
      localStorage.setItem('sf_update_accepted', version);
    }

    const sw = this._getWaitingWorker();
    if (!sw) {
      // No waiting SW — backup data then just reload to pick up new version.json
      if (typeof Storage !== 'undefined' && Storage.backupAll) {
        Storage.backupAll();
      }
      window.location.reload();
      return;
    }

    // Show progress
    const actions = document.getElementById('update-actions');
    const progress = document.getElementById('update-progress');
    if (actions) actions.style.display = 'none';
    if (progress) progress.classList.add('active');

    // Backup all user data before SW takes over (prevents data loss)
    if (typeof Storage !== 'undefined' && Storage.backupAll) {
      Storage.backupAll();
    }

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
