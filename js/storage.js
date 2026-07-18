/* ========================================
   storage.js — LocalStorage operations
   ======================================== */

// ----- ID Generator (must load before modal.js) -----

/**
 * Generate a unique ID using timestamp + random string.
 * @returns {string} A unique identifier.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ----- Playlist Colors -----

const PLAYLIST_COLORS = [
  { bg: '#EEF2FF', accent: '#6366F1' },
  { bg: '#FFF7ED', accent: '#F97316' },
  { bg: '#F0FDF4', accent: '#22C55E' },
  { bg: '#FDF4FF', accent: '#A855F7' },
  { bg: '#FFF1F2', accent: '#F43F5E' },
  { bg: '#ECFDF5', accent: '#10B981' },
  { bg: '#EFF6FF', accent: '#3B82F6' },
  { bg: '#FFFBEB', accent: '#EAB308' },
];

/**
 * Get playlist color by index, cycling through the palette.
 * @param {number} colorIndex
 * @returns {{ bg: string, accent: string }}
 */
function getPlaylistColor(colorIndex) {
  return PLAYLIST_COLORS[(colorIndex || 0) % PLAYLIST_COLORS.length];
}

const Storage = {

  // Keys
  VIDEOS_KEY: 'sf_videos',
  PLAYLISTS_KEY: 'sf_playlists',
  LAST_WATCHED_KEY: 'sf_last_watched',
  NOTES_KEY: 'sf_notes',
  BACKUP_KEY: 'sf_backup',
  BACKUP_TIMESTAMP_KEY: 'sf_backup_at',

  // ----- In-memory cache -----

  /**
   * In-memory cache to avoid repeated localStorage reads + JSON.parse.
   * Updated on every write via _writeVideos / _writePlaylists.
   */
  _cache: {
    videos: null,
    playlists: null,
    notes: null
  },

  // ----- Generic helpers -----

  /**
   * Get parsed JSON from localStorage.
   * @param {string} key
   * @returns {*|null}
   */
  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set a JSON-serialized value in localStorage.
   * @param {string} key
   * @param {*} value
   * @returns {boolean} Whether the operation succeeded.
   */
  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast('Storage full. Please delete some videos.');
      }
      return false;
    }
  },

  // ----- Videos -----

  getVideos() {
    if (!this._cache.videos) {
      this._cache.videos = this._get(this.VIDEOS_KEY) || [];
    }
    return this._cache.videos;
  },

  getVideoById(id) {
    return this.getVideos().find(v => v.id === id) || null;
  },

  saveVideo(video) {
    const videos = this.getVideos();
    videos.push(video);
    return this._writeVideos(videos);
  },

  _writeVideos(videos) {
    const ok = this._set(this.VIDEOS_KEY, videos);
    if (ok) this._cache.videos = videos;
    return ok;
  },

  updateVideo(id, updates) {
    const videos = this.getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return false;
    videos[index] = { ...videos[index], ...updates };
    return this._writeVideos(videos);
  },

  deleteVideo(id) {
    const videos = this.getVideos().filter(v => v.id !== id);
    return this._writeVideos(videos);
  },

  // ----- Playlists -----

  getPlaylists() {
    if (!this._cache.playlists) {
      this._cache.playlists = this._get(this.PLAYLISTS_KEY) || [];
    }
    return this._cache.playlists;
  },

  getPlaylistById(id) {
    return this.getPlaylists().find(p => p.id === id) || null;
  },

  savePlaylist(playlist) {
    const playlists = this.getPlaylists();
    playlist.colorIndex = playlists.length;
    playlists.push(playlist);
    return this._writePlaylists(playlists);
  },

  _writePlaylists(playlists) {
    const ok = this._set(this.PLAYLISTS_KEY, playlists);
    if (ok) this._cache.playlists = playlists;
    return ok;
  },

  updatePlaylistName(id, newName) {
    const playlists = this.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index === -1) return false;
    playlists[index].name = newName;
    return this._writePlaylists(playlists);
  },

  deletePlaylist(id) {
    // Remove playlist
    const playlists = this.getPlaylists().filter(p => p.id !== id);
    this._writePlaylists(playlists);

    // Unassign videos from this playlist
    const videos = this.getVideos().map(v => {
      if (v.playlistId === id) {
        return { ...v, playlistId: null };
      }
      return v;
    });
    this._writeVideos(videos);
  },

  getVideosByPlaylist(playlistId) {
    return this.getVideos().filter(v => v.playlistId === playlistId);
  },

  // ----- Last Watched -----

  getLastWatched() {
    return this._get(this.LAST_WATCHED_KEY);
  },

  setLastWatched(videoId) {
    return this._set(this.LAST_WATCHED_KEY, videoId);
  },

  clearLastWatched() {
    localStorage.removeItem(this.LAST_WATCHED_KEY);
  },

  autoCheckComplete(id) {
    const video = this.getVideoById(id);
    if (!video || video.completed) return;

    if (video.duration > 0) {
      const progress = (video.timestamp / video.duration) * 100;
      if (progress >= 95) {
        this.updateVideo(id, { completed: true });
      }
    }
  },

  // ----- Notes -----

  getNotes() {
    if (!this._cache.notes) {
      this._cache.notes = this._get(this.NOTES_KEY) || [];
    }
    return this._cache.notes;
  },

  _writeNotes(notes) {
    const ok = this._set(this.NOTES_KEY, notes);
    if (ok) this._cache.notes = notes;
    return ok;
  },

  getNotesByVideoId(videoId) {
    return this.getNotes()
      .filter(n => n.videoId === videoId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  saveNote(note) {
    const notes = this.getNotes();
    notes.push(note);
    return this._writeNotes(notes);
  },

  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    return this._writeNotes(notes);
  },

  deleteNotesByVideoId(videoId) {
    const notes = this.getNotes().filter(n => n.videoId !== videoId);
    return this._writeNotes(notes);
  },

  // ----- Data Backup & Restore (for safe updates) -----

  /**
   * Creates a backup of all user data in localStorage.
   * Called before SW update / page reload to prevent data loss.
   */
  backupAll() {
    const backup = {
      videos: this._get(this.VIDEOS_KEY) || [],
      playlists: this._get(this.PLAYLISTS_KEY) || [],
      notes: this._get(this.NOTES_KEY) || [],
      lastWatched: this._get(this.LAST_WATCHED_KEY) || null,
      dataVersion: localStorage.getItem('sf_data_version') || '1',
      backedUpAt: new Date().toISOString()
    };

    const ok = this._set(this.BACKUP_KEY, backup);
    if (ok) {
      localStorage.setItem(this.BACKUP_TIMESTAMP_KEY, backup.backedUpAt);
    }
    return ok;
  },

  /**
   * Restores user data from backup if main data is missing.
   * Checks each data type independently so one missing type doesn't block others.
   * Called on page load to auto-recover from update issues.
   * @returns {{ restored: boolean, types: string[] }} Whether data was restored and which types.
   */
  restoreFromBackupIfNeeded() {
    const videos = this._get(this.VIDEOS_KEY);
    const playlists = this._get(this.PLAYLISTS_KEY);
    const notes = this._get(this.NOTES_KEY);

    // If ALL data exists, nothing to restore
    const allExist = (videos && videos.length > 0) &&
                     (playlists && playlists.length > 0) &&
                     (notes && notes.length > 0);
    if (allExist) return { restored: false, types: [] };

    const backup = this._get(this.BACKUP_KEY);
    if (!backup) return { restored: false, types: [] };

    // Restore each missing data type independently
    let restored = false;
    const restoredTypes = [];

    if (backup.videos && (!videos || videos.length === 0)) {
      this._set(this.VIDEOS_KEY, backup.videos);
      this._cache.videos = backup.videos;
      restored = true;
      restoredTypes.push('videos');
    }

    if (backup.playlists && (!playlists || playlists.length === 0)) {
      this._set(this.PLAYLISTS_KEY, backup.playlists);
      this._cache.playlists = backup.playlists;
      restored = true;
      restoredTypes.push('playlists');
    }

    if (backup.notes && (!notes || notes.length === 0)) {
      this._set(this.NOTES_KEY, backup.notes);
      this._cache.notes = backup.notes;
      restored = true;
      restoredTypes.push('notes');
    }

    if (backup.lastWatched && !this._get(this.LAST_WATCHED_KEY)) {
      this._set(this.LAST_WATCHED_KEY, backup.lastWatched);
      restoredTypes.push('lastWatched');
    }

    // Do NOT clear backup here — keep it as a safety net in case
    // other data types get lost on subsequent page loads.
    // The next auto-backup cycle (visibilitychange) will overwrite it naturally.

    return { restored, types: restoredTypes };
  },

  /**
   * Removes the backup from localStorage.
   * Called after successful restore or on explicit cleanup.
   */
  clearBackup() {
    localStorage.removeItem(this.BACKUP_KEY);
    localStorage.removeItem(this.BACKUP_TIMESTAMP_KEY);
  }

};

// ----- Data Integrity & Migration -----

/**
 * Data format version for localStorage.
 * Increment this when storage schema changes.
 */
const DATA_VERSION = '1';

/**
 * Validates data integrity on load.
 * Checks that stored data matches expected format.
 * Called once on app init.
 */
function validateDataIntegrity() {
  const storedVersion = localStorage.getItem('sf_data_version');

  // First run — nothing to validate
  if (!storedVersion) {
    localStorage.setItem('sf_data_version', DATA_VERSION);
    return;
  }

  // Version match — all good
  if (storedVersion === DATA_VERSION) return;

  // Version mismatch — attempt migration (future-proofing)
  console.log('[StudyFlow] Data format version changed:', storedVersion, '→', DATA_VERSION);
  localStorage.setItem('sf_data_version', DATA_VERSION);

  // Future: add migration logic here for breaking schema changes
  // e.g. migrateV1ToV2()
}

// ----- Eager Backup & Restore (runs immediately when this script loads) -----

/**
 * Automatically restore data from backup as soon as this script loads.
 * This runs BEFORE DOMContentLoaded, so Home.render() will see restored data.
 * Also re-renders the active screen if data was restored after initial render.
 */
(function autoRestore() {
  const result = Storage.restoreFromBackupIfNeeded();
  if (result.restored) {
    console.log('[StudyFlow] Restored from backup:', result.types.join(', '));

    // If restore ran after DOMContentLoaded, re-render the active screen
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      const currentScreen = document.querySelector('.screen.active') || document.getElementById('screen-home');
      const screenId = currentScreen ? currentScreen.id : 'screen-home';

      if (screenId === 'screen-home' && typeof Home !== 'undefined' && Home.render) {
        Home.render();
      } else if (screenId === 'screen-playlists' && typeof Playlists !== 'undefined' && Playlists.render) {
        Playlists.render();
      }
    }
  }
})();

/**
 * Automatically create backups when the page is about to unload or hide.
 * This ensures data is backed up even if the SW updates without user interaction.
 */
(function autoBackup() {
  // Backup when page becomes hidden (user switches tabs, app goes to background, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      Storage.backupAll();
    }
  });

  // Backup before page unload (navigating away, closing tab, SW controllerchange reload)
  window.addEventListener('beforeunload', () => {
    Storage.backupAll();
  });

  // Backup on pagehide (more reliable than beforeunload on mobile Safari)
  window.addEventListener('pagehide', () => {
    Storage.backupAll();
  });
})();

// ----- Toast -----

// ----- Shared helpers -----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getProgress(video) {
  if (video.completed) return 100;
  if (!video.duration || video.duration === 0) return 0;
  return Math.min(Math.round((video.timestamp / video.duration) * 100), 99);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.style.display = 'block';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, 3000);
}
