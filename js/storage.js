/* ========================================
   storage.js — LocalStorage operations
   ======================================== */

// ----- ID Generator (must load before modal.js) -----

/**
 * Generate a unique ID using timestamp + random string.
 * @returns {string} A unique identifier.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    return this._get(this.VIDEOS_KEY) || [];
  },

  getVideoById(id) {
    return this.getVideos().find(v => v.id === id) || null;
  },

  saveVideo(video) {
    const videos = this.getVideos();
    videos.push(video);
    return this._set(this.VIDEOS_KEY, videos);
  },

  updateVideo(id, updates) {
    const videos = this.getVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return false;
    videos[index] = { ...videos[index], ...updates };
    return this._set(this.VIDEOS_KEY, videos);
  },

  deleteVideo(id) {
    const videos = this.getVideos().filter(v => v.id !== id);
    return this._set(this.VIDEOS_KEY, videos);
  },

  // ----- Playlists -----

  getPlaylists() {
    return this._get(this.PLAYLISTS_KEY) || [];
  },

  getPlaylistById(id) {
    return this.getPlaylists().find(p => p.id === id) || null;
  },

  savePlaylist(playlist) {
    const playlists = this.getPlaylists();
    playlist.colorIndex = playlists.length;
    playlists.push(playlist);
    return this._set(this.PLAYLISTS_KEY, playlists);
  },

  updatePlaylistName(id, newName) {
    const playlists = this.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index === -1) return false;
    playlists[index].name = newName;
    return this._set(this.PLAYLISTS_KEY, playlists);
  },

  deletePlaylist(id) {
    // Remove playlist
    const playlists = this.getPlaylists().filter(p => p.id !== id);
    this._set(this.PLAYLISTS_KEY, playlists);

    // Unassign videos from this playlist
    const videos = this.getVideos().map(v => {
      if (v.playlistId === id) {
        return { ...v, playlistId: null };
      }
      return v;
    });
    this._set(this.VIDEOS_KEY, videos);
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
  }

};

// ----- Toast -----

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
