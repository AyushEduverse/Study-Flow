/* ========================================
   player.js — YouTube IFrame Player API + progress tracking
   ======================================== */

const Player = {

  currentVideoId: null,
  ytPlayer: null,
  _progressInterval: null,
  _frameTimeout: null,
  _apiTimeout: null,
  _apiReadyCleanup: null,

  // ----- Open player for a video -----

  open(videoDbId) {
    const video = Storage.getVideoById(videoDbId);
    if (!video) return;

    // Clear any pending player init from a previous open() call
    if (this._frameTimeout) {
      clearTimeout(this._frameTimeout);
      this._frameTimeout = null;
    }

    this.currentVideoId = videoDbId;

    // Set last watched
    Storage.setLastWatched(videoDbId);

    // Fill info
    document.getElementById('player-title').textContent = video.title;

    // Playlist badge with color
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

    // Progress
    this.updateProgress(video);

    // Show player screen with skeleton for transition effect
    Router.showScreen('screen-player');
    Router.showSkeleton('screen-player');

    // Brief delay for the skeleton transition, then create the player
    this._frameTimeout = setTimeout(() => {
      Router.hideSkeleton('screen-player');
      this._initPlayer(video);
    }, 350);

    // Re-init Lucide icons
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  // ----- Initialize YouTube player (handle API loading) -----

  _initPlayer(video) {
    if (typeof YT !== 'undefined' && YT.Player) {
      this._createYtPlayer(video);
      return;
    }

    // Clean up any previous API listener from a prior _initPlayer call
    if (this._apiReadyCleanup) {
      this._apiReadyCleanup();
      this._apiReadyCleanup = null;
    }

    // API not loaded yet — wait for it
    var self = this;
    this._apiTimeout = setTimeout(function() {
      showToast('Video player could not load. Check your connection.');
    }, 8000);

    function onApiReady() {
      self._apiReadyCleanup = null;
      clearTimeout(self._apiTimeout);
      self._apiTimeout = null;
      self._createYtPlayer(video);
    }

    window.addEventListener('yt-api-ready', onApiReady);
    this._apiReadyCleanup = function() {
      window.removeEventListener('yt-api-ready', onApiReady);
      clearTimeout(self._apiTimeout);
      self._apiTimeout = null;
    };
  },

  // ----- Create YouTube Player instance -----

  _createYtPlayer(video) {
    // Destroy previous player if exists
    if (this.ytPlayer) {
      this._stopProgressInterval();
      try { this.ytPlayer.destroy(); } catch (e) {}
      this.ytPlayer = null;
    }

    var wrapper = document.querySelector('.player-wrapper');
    if (!wrapper) return;

    // Clear and recreate the target div
    wrapper.innerHTML = '';
    wrapper.insertAdjacentHTML('beforeend', '<div id="youtube-player"></div>');

    var startSeconds = video.timestamp || 0;

    try {
      this.ytPlayer = new YT.Player('youtube-player', {
        videoId: video.videoId,
        playerVars: {
          autoplay: 1,
          start: Math.floor(startSeconds),
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 1,
          controls: 1,
          disablekb: 0,
          iv_load_policy: 3,
          enablejsapi: 1
        },
        events: {
          onReady: this._onPlayerReady.bind(this),
          onStateChange: this._onStateChange.bind(this)
        }
      });
    } catch (e) {
      showToast('Could not load this video.');
      this.ytPlayer = null;
    }
  },

  // ----- YouTube Player Event Handlers -----

  _onPlayerReady: function(event) {
    var self = Player;

    // Save video duration
    try {
      var duration = self.ytPlayer.getDuration();
      if (duration > 0) {
        Storage.updateVideo(self.currentVideoId, { duration: Math.floor(duration) });
      }
    } catch (e) {}

    // Precise seek to saved timestamp (start param already did approximate seek)
    var video = Storage.getVideoById(self.currentVideoId);
    if (video && video.timestamp > 0) {
      try {
        self.ytPlayer.seekTo(video.timestamp, true);
      } catch (e) {}
    }

    // Start periodic progress save
    self._ensureProgressInterval();

    // Save once immediately
    self._saveProgress();
  },

  _onStateChange: function(event) {
    var self = Player;

    // ENDED
    if (event.data === 0) {
      self._saveProgress();
      Storage.updateVideo(self.currentVideoId, { completed: true });
      self._stopProgressInterval();
      var video = Storage.getVideoById(self.currentVideoId);
      self.updateProgress(video);
      showToast('Video completed \u2713');
    }
    // PAUSED
    else if (event.data === 2) {
      self._saveProgress();
    }
    // PLAYING
    else if (event.data === 1) {
      self._ensureProgressInterval();
    }
  },

  // ----- Progress Save -----

  _saveProgress: function() {
    var self = Player;
    if (!self.ytPlayer || !self.currentVideoId) return;

    try {
      var currentTime = self.ytPlayer.getCurrentTime();
      var duration = self.ytPlayer.getDuration();

      if (typeof currentTime !== 'number' || isNaN(currentTime)) return;

      var updates = { timestamp: Math.floor(currentTime) };
      if (duration > 0) {
        updates.duration = Math.floor(duration);
      }

      Storage.updateVideo(self.currentVideoId, updates);

      // Update progress bar UI
      var video = Storage.getVideoById(self.currentVideoId);
      if (video) self.updateProgress(video);
    } catch (e) {}
  },

  // ----- Interval Management -----

  _ensureProgressInterval: function() {
    var self = Player;
    if (!self._progressInterval) {
      self._progressInterval = setInterval(function() {
        self._saveProgress();
      }, 5000);
    }
  },

  _stopProgressInterval: function() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
  },

  // ----- Pause -----

  pause: function() {
    if (this.ytPlayer && this.ytPlayer.pauseVideo) {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }
  },

  // ----- Update progress bar + text -----

  updateProgress(video) {
    const progressBarFill = document.getElementById('player-progress-bar');
    const progressText = document.getElementById('player-progress-text');
    const progressBarTrack = progressBarFill ? progressBarFill.parentElement : null;

    let progress = getProgress(video);

    if (progressBarFill) {
      progressBarFill.style.width = progress + '%';
      if (video.completed) {
        progressBarFill.classList.add('completed');
      } else {
        progressBarFill.classList.remove('completed');
      }
    }

    if (progressBarTrack) {
      progressBarTrack.setAttribute('aria-valuenow', progress);
    }

    if (progressText) {
      if (video.completed) {
        progressText.textContent = 'Completed \u2713';
        progressText.classList.add('completed');
      } else {
        progressText.textContent = progress + '% watched';
        progressText.classList.remove('completed');
      }
    }

    // Mark as complete button
    const completeBtn = document.getElementById('player-complete-btn');
    if (completeBtn) {
      const span = completeBtn.querySelector('span');
      const icon = completeBtn.querySelector('i');
      const wasCompleted = completeBtn.classList.contains('is-completed');

      if (video.completed) {
        completeBtn.classList.add('is-completed');
        if (span) span.textContent = 'Completed';
        if (icon && !wasCompleted) {
          icon.setAttribute('data-lucide', 'check-circle-2');
          if (typeof refreshIcons === 'function') {
            refreshIcons();
          }
        }
      } else {
        completeBtn.classList.remove('is-completed');
        if (span) span.textContent = 'Mark as Complete';
        if (icon && wasCompleted) {
          icon.setAttribute('data-lucide', 'check-circle');
          if (typeof refreshIcons === 'function') {
            refreshIcons();
          }
        }
      }
    }
  },

  // ----- Close / back -----

  close() {
    // Save final progress
    this._saveProgress();

    // Stop interval
    this._stopProgressInterval();

    // Clean up pending API listener
    if (this._apiReadyCleanup) {
      this._apiReadyCleanup();
      this._apiReadyCleanup = null;
    }

    // Destroy YouTube player
    if (this.ytPlayer) {
      try { this.ytPlayer.destroy(); } catch (e) {}
      this.ytPlayer = null;
    }

    // Clear pending timeouts
    if (this._frameTimeout) {
      clearTimeout(this._frameTimeout);
      this._frameTimeout = null;
    }
    if (this._apiTimeout) {
      clearTimeout(this._apiTimeout);
      this._apiTimeout = null;
    }

    this.currentVideoId = null;

    // Go back
    Router.goBack();

    // Refresh home
    Home.render();
  }

};

// ----- Button listeners -----

document.getElementById('player-back').addEventListener('click', () => {
  Player.close();
});

document.getElementById('player-complete-btn').addEventListener('click', () => {
  if (!Player.currentVideoId) return;
  const video = Storage.getVideoById(Player.currentVideoId);
  if (!video) return;

  const newState = !video.completed;
  Storage.updateVideo(Player.currentVideoId, { completed: newState });

  const updatedVideo = Storage.getVideoById(Player.currentVideoId);
  Player.updateProgress(updatedVideo);

  if (newState) {
    showToast('Video marked as completed \u2713');
  }
});

document.getElementById('player-delete-btn').addEventListener('click', () => {
  if (!Player.currentVideoId) return;
  const videoId = Player.currentVideoId;
  const video = Storage.getVideoById(videoId);
  if (!video) return;

  ConfirmDialog.show({
    title: 'Delete Video',
    message: 'Delete "' + video.title + '"?',
    confirmText: 'Delete',
    onConfirm: () => {
      Storage.deleteVideo(videoId);

      // Clean up player
      Player._stopProgressInterval();
      if (Player._apiReadyCleanup) {
        Player._apiReadyCleanup();
        Player._apiReadyCleanup = null;
      }
      if (Player.ytPlayer) {
        try { Player.ytPlayer.destroy(); } catch (e) {}
        Player.ytPlayer = null;
      }
      const wrapper = document.querySelector('.player-wrapper');
      if (wrapper) wrapper.innerHTML = '';

      Player.currentVideoId = null;

      Home.render();
      Playlists.renderList();
      Playlists.toggleEmptyState();
      Router.goBack();
      showToast('Video deleted');
    }
  });
});

// ----- Visibility & Unload Handlers -----

document.addEventListener('visibilitychange', function() {
  if (document.hidden && Player.ytPlayer && Player.currentVideoId) {
    Player.pause();
    Player._saveProgress();
  }
});

window.addEventListener('beforeunload', function() {
  Player._saveProgress();
  Player._stopProgressInterval();
  if (Player._apiReadyCleanup) {
    Player._apiReadyCleanup();
    Player._apiReadyCleanup = null;
  }
  if (Player.ytPlayer) {
    try { Player.ytPlayer.destroy(); } catch (e) {}
    Player.ytPlayer = null;
  }
});

window.addEventListener('pagehide', function() {
  Player._saveProgress();
});

// ----- Fullscreen Auto Landscape -----

['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
  document.addEventListener(evt, () => {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen) {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(e => {});
      }
    } else {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  });
});
