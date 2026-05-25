/* ========================================
   modal.js — Add video modal + oEmbed fetch + Edit video modal
   ======================================== */

const ConfirmDialog = {
  onConfirmCallback: null,

  init() {
    this.overlay = document.getElementById('confirm-dialog-overlay');
    this.titleEl = document.getElementById('confirm-dialog-title');
    this.messageEl = document.getElementById('confirm-dialog-message');
    this.cancelBtn = document.getElementById('confirm-dialog-cancel');
    this.confirmBtn = document.getElementById('confirm-dialog-confirm');

    this.cancelBtn.addEventListener('click', () => this.close());
    this.confirmBtn.addEventListener('click', () => {
      if (this.onConfirmCallback) {
        this.onConfirmCallback();
      }
      this.close();
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  },

  show({ title, message, confirmText = 'Delete', onConfirm }) {
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    this.confirmBtn.textContent = confirmText;
    this.onConfirmCallback = onConfirm;

    this.overlay.style.display = 'flex';
  },

  close() {
    this.overlay.style.display = 'none';
    this.onConfirmCallback = null;
  }
};

const Modal = {

  fetchedData: null,
  editingVideoId: null,

  // ----- Open / Close (Add Video) -----

  open() {
    this.reset();

    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet');

    overlay.style.display = 'flex';
    sheet.classList.remove('slide-down');
    sheet.classList.add('slide-up');

    // Refresh playlist dropdown
    Playlists.populateModalDropdown();

    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  close() {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet');

    sheet.classList.remove('slide-up');
    sheet.classList.add('slide-down');

    sheet.addEventListener('animationend', function handler() {
      overlay.style.display = 'none';
      sheet.classList.remove('slide-down');
      sheet.removeEventListener('animationend', handler);
    });
  },

  reset() {
    document.getElementById('video-url-input').value = '';
    document.getElementById('url-error').style.display = 'none';
    document.getElementById('video-preview').style.display = 'none';
    document.getElementById('preview-thumbnail').src = '';
    document.getElementById('preview-title').value = '';
    document.getElementById('playlist-select').value = '';
    this.fetchedData = null;
  },

  // ----- Open / Close (Edit Video) -----

  openEdit(videoId) {
    const video = Storage.getVideoById(videoId);
    if (!video) return;

    this.editingVideoId = videoId;

    // Populate fields
    document.getElementById('edit-title-input').value = video.title;

    // Playlist dropdown
    document.getElementById('edit-playlist-select').value = video.playlistId || '';
    Playlists.populateModalDropdown();

    // Show modal
    const overlay = document.getElementById('edit-modal-overlay');
    const sheet = document.getElementById('edit-modal-sheet');

    overlay.style.display = 'flex';
    sheet.classList.remove('slide-down');
    sheet.classList.add('slide-up');

    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  closeEdit() {
    const overlay = document.getElementById('edit-modal-overlay');
    const sheet = document.getElementById('edit-modal-sheet');

    sheet.classList.remove('slide-up');
    sheet.classList.add('slide-down');

    sheet.addEventListener('animationend', function handler() {
      overlay.style.display = 'none';
      sheet.classList.remove('slide-down');
      sheet.removeEventListener('animationend', handler);
    });

    this.editingVideoId = null;
  },

  // ----- Save edit -----

  saveEdit() {
    if (!this.editingVideoId) return;

    const title = document.getElementById('edit-title-input').value.trim();
    const playlistId = document.getElementById('edit-playlist-select').value || null;

    if (!title) {
      document.getElementById('edit-title-input').focus();
      return;
    }

    Storage.updateVideo(this.editingVideoId, {
      title: title,
      playlistId: playlistId
    });

    this.closeEdit();
    Home.render();
    Playlists.renderList();

    // Update player if on player screen
    if (Router.currentScreen === 'screen-player' && Player.currentVideoId === this.editingVideoId) {
      const video = Storage.getVideoById(this.editingVideoId);
      if (video) {
        document.getElementById('player-title').textContent = video.title;

        // Update playlist badge
        const badge = document.getElementById('player-playlist-badge');
        if (video.playlistId) {
          const playlist = Storage.getPlaylistById(video.playlistId);
          if (playlist) {
            const color = getPlaylistColor(playlist.colorIndex);
            badge.textContent = playlist.name;
            badge.style.backgroundColor = color.bg;
            badge.style.color = color.accent;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        } else {
          badge.style.display = 'none';
        }
      }
    }

    showToast('Saved ✓');
  },

  // ----- Delete video from edit modal -----

  deleteVideo() {
    if (!this.editingVideoId) return;

    const videoId = this.editingVideoId;
    const video = Storage.getVideoById(videoId);
    if (!video) return;

    // Close edit modal first as requested, before showing confirm dialog
    this.closeEdit();

    // Use setTimeout so the edit modal slide-down animation can start smoothly 
    // before the confirm dialog zoom-in triggers.
    setTimeout(() => {
      ConfirmDialog.show({
        title: 'Delete Video',
        message: 'Delete "' + video.title + '"?',
        confirmText: 'Delete',
        onConfirm: () => {
          Storage.deleteVideo(videoId);

          // Stop player if playing this video
          if (Player.currentVideoId === videoId) {
            Player.stopAutoSave();
            if (Player.ytPlayer && typeof Player.ytPlayer.destroy === 'function') {
              Player.ytPlayer.destroy();
              Player.ytPlayer = null;
            }
            Player.currentVideoId = null;
            Player.isReady = false;
          }

          Home.render();
          Playlists.renderList();
          Playlists.toggleEmptyState();
          Router.showScreen('screen-home');

          showToast('Video deleted');
        }
      });
    }, 100);
  },

  // ----- URL parsing -----

  extractVideoId(url) {
    if (!url) return null;

    url = url.trim();

    // youtube.com/watch?v=VIDEO_ID
    let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?params
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // youtube.com/shorts/VIDEO_ID
    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    return null;
  },

  // ----- Fetch oEmbed data -----

  async fetchVideoData(url) {
    const videoId = this.extractVideoId(url);

    if (!videoId) {
      this.showError('Please enter a valid YouTube link');
      this.hidePreview();
      return;
    }

    this.hideError();

    const oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json';

    try {
      const response = await fetch(oembedUrl);
      if (!response.ok) throw new Error('Fetch failed');

      const data = await response.json();

      this.fetchedData = {
        videoId: videoId,
        title: data.title,
        thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
        author: data.author_name
      };

      this.showPreview(this.fetchedData);

    } catch {
      // oEmbed failed — allow manual entry
      this.fetchedData = {
        videoId: videoId,
        title: '',
        thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
        author: ''
      };

      this.showPreview(this.fetchedData);
    }
  },

  // ----- Preview -----

  showPreview(data) {
    const preview = document.getElementById('video-preview');
    document.getElementById('preview-thumbnail').src = data.thumbnail;
    document.getElementById('preview-title').value = data.title;
    preview.style.display = 'flex';
  },

  hidePreview() {
    document.getElementById('video-preview').style.display = 'none';
  },

  // ----- Error -----

  showError(message) {
    const errorEl = document.getElementById('url-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  },

  hideError() {
    document.getElementById('url-error').style.display = 'none';
  },

  // ----- Save video (add new) -----

  save() {
    const url = document.getElementById('video-url-input').value.trim();

    if (!url) {
      this.showError('Please enter a valid YouTube link');
      return;
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.showError('Please enter a valid YouTube link');
      return;
    }

    // If oEmbed wasn't fetched yet, use basic data
    let title = '';
    let thumbnail = 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';

    if (this.fetchedData && this.fetchedData.videoId === videoId) {
      title = document.getElementById('preview-title').value.trim() || this.fetchedData.title || 'Untitled Video';
      thumbnail = this.fetchedData.thumbnail;
    } else {
      title = 'Untitled Video';
    }

    const playlistId = document.getElementById('playlist-select').value || null;

    const video = {
      id: generateId(),
      title: title,
      videoId: videoId,
      thumbnail: thumbnail,
      playlistId: playlistId,
      timestamp: 0,
      duration: 0,
      completed: false,
      addedAt: new Date().toISOString()
    };

    const saved = Storage.saveVideo(video);

    if (saved) {
      this.close();
      Home.render();
      Playlists.renderList();
      Playlists.toggleEmptyState();
      showToast('Video added');
    }
  }

};

// ----- Input listeners (Add Video) -----

const urlInput = document.getElementById('video-url-input');

// Debounced fetch on input
let fetchTimeout = null;
urlInput.addEventListener('input', () => {
  clearTimeout(fetchTimeout);
  const url = urlInput.value.trim();

  if (!url) {
    Modal.hideError();
    Modal.hidePreview();
    return;
  }

  fetchTimeout = setTimeout(() => {
    Modal.fetchVideoData(url);
  }, 600);
});

// Handle paste — trigger immediately
urlInput.addEventListener('paste', () => {
  setTimeout(() => {
    const url = urlInput.value.trim();
    if (url) Modal.fetchVideoData(url);
  }, 100);
});

// ----- Button listeners (Add Video) -----

document.addEventListener('DOMContentLoaded', () => {
  ConfirmDialog.init();
});

document.getElementById('nav-add').addEventListener('click', () => {
  Modal.open();
});

document.getElementById('modal-close').addEventListener('click', () => {
  Modal.close();
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    Modal.close();
  }
});

document.getElementById('modal-save').addEventListener('click', () => {
  Modal.save();
});

// ----- Button listeners (Edit Video) -----

document.getElementById('player-edit-btn').addEventListener('click', () => {
  if (Player.currentVideoId) {
    Modal.openEdit(Player.currentVideoId);
  }
});

document.getElementById('edit-modal-close').addEventListener('click', () => {
  Modal.closeEdit();
});

document.getElementById('edit-modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    Modal.closeEdit();
  }
});

document.getElementById('edit-modal-save').addEventListener('click', () => {
  Modal.saveEdit();
});

document.getElementById('edit-modal-delete').addEventListener('click', () => {
  Modal.deleteVideo();
});
