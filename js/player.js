/* ========================================
   player.js — YouTube IFrame API + timestamp auto-save
   ======================================== */

const Player = {

  ytPlayer: null,
  currentVideoId: null,
  saveInterval: null,
  isReady: false,

  // ----- Track if YT API timed out -----
  ytApiTimedOut: false,
  ytApiFailureShown: false,

  // ----- Open player for a video -----

  open(videoDbId) {
    const video = Storage.getVideoById(videoDbId);
    if (!video) return;

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


    // Show player screen
    Router.showScreen('screen-player');
    // Show skeleton while YouTube API loads
    Router.showSkeleton('screen-player');

    // Fallback: hide skeleton after 10s if player fails to load
    this._ytTimeout = setTimeout(() => {
      Router.hideSkeleton('screen-player');
      // If YT API never loaded, show fallback error
      if (!this.isReady && !this.ytApiFailureShown) {
        this.ytApiTimedOut = true;
        this.showYtApiError();
      }
    }, 10000);

    // Load or update YouTube player
    if (this.isReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      this.ytPlayer.loadVideoById({
        videoId: video.videoId,
        startSeconds: video.timestamp || 0
      });
    } else {
      this.createPlayer(video.videoId, video.timestamp || 0);
    }

    // Start auto-save
    this.startAutoSave();

    // Re-init icons for back button
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  // ----- Show YouTube API load failure UI -----

  showYtApiError() {
    this.ytApiFailureShown = true;
    const wrapper = document.querySelector('.player-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = `
      <div class="yt-error-fallback">
        <div class="yt-error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 class="yt-error-title">Could not load YouTube player</h3>
        <p class="yt-error-text">Unable to connect to YouTube. Please check your internet connection or try again later.</p>
        <p class="yt-error-hint">You can still view video details below.</p>
      </div>
    `;
  },

  // ----- Clear error state -----

  clearErrorState() {
    this.ytApiTimedOut = false;
    this.ytApiFailureShown = false;
    if (this._ytTimeout) {
      clearTimeout(this._ytTimeout);
      this._ytTimeout = null;
    }
  },

  // ----- Create YouTube IFrame Player -----

  createPlayer(youtubeVideoId, startSeconds) {
    // 1. Ensure YT API is ready
    if (typeof YT === 'undefined' || !YT.Player) {
      setTimeout(() => this.createPlayer(youtubeVideoId, startSeconds), 100);
      return;
    }

    // 2. Destroy existing instance completely to prevent origin cross-talk
    if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
      try {
        this.ytPlayer.destroy();
      } catch (e) {
        console.warn('Player destroy failed:', e);
      }
    }
    this.ytPlayer = null;
    this.isReady = false;

    // 3. Force-clean the DOM container
    const wrapper = document.querySelector('.player-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '<div id="youtube-player"></div>';
    }

    // 4. Construct perfectly formatted origin (no trailing slashes, explicit protocol)
    const cleanOrigin = window.location.origin.replace(/\/$/, '');

    // 5. Initialize with hardened playerVars
    this.ytPlayer = new YT.Player('youtube-player', {
      host: 'https://www.youtube.com',
      videoId: youtubeVideoId,
      playerVars: {
        'enablejsapi': 1,
        'origin': cleanOrigin,
        'widget_referrer': cleanOrigin,
        'autoplay': 1,
        'start': Math.floor(startSeconds),
        'modestbranding': 1,
        'rel': 0,
        'playsinline': 1,
        'fs': 1,
        'controls': 1,
        'disablekb': 0,
        'iv_load_policy': 3
      },
      events: {
        'onReady': (event) => this.onPlayerReady(event),
        'onStateChange': (event) => this.onPlayerStateChange(event),
        'onError': (event) => console.warn('YT Player Warning:', event.data)
      }
    });
  },

  // ----- Player events -----

  onPlayerReady(event) {
    this.isReady = true;

    // Hide skeleton after player is ready
    Router.hideSkeleton('screen-player');

    // Save duration
    const duration = event.target.getDuration();
    if (this.currentVideoId && duration > 0) {
      Storage.updateVideo(this.currentVideoId, { duration });
    }
  },

  onPlayerStateChange(event) {
    // Video ended
    if (event.data === YT.PlayerState.ENDED) {
      Storage.updateVideo(this.currentVideoId, { 
        timestamp: 0,
        completed: true 
      });
      const video = Storage.getVideoById(this.currentVideoId);
      if (video) {
        this.updateProgress(video);
      }
    }
  },

  // ----- Auto-save timestamp every 5 seconds -----

  startAutoSave() {
    this.stopAutoSave();

    this.saveInterval = setInterval(() => {
      if (!this.isReady || !this.ytPlayer || !this.currentVideoId) return;

      const state = this.ytPlayer.getPlayerState();
      if (state !== YT.PlayerState.PLAYING) return;

      const currentTime = this.ytPlayer.getCurrentTime();
      const duration = this.ytPlayer.getDuration();

      Storage.updateVideo(this.currentVideoId, {
        timestamp: currentTime,
        duration: duration
      });

      // Auto-check complete
      if (typeof Storage.autoCheckComplete === 'function') {
        Storage.autoCheckComplete(this.currentVideoId);
      }

      // Update progress DOM
      const video = Storage.getVideoById(this.currentVideoId);
      if (video) {
        this.updateProgress(video);
      }
    }, 5000);
  },

  stopAutoSave() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
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
        progressText.textContent = 'Completed ✓';
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
    this.stopAutoSave();
    this.clearErrorState();

    // Save final timestamp before leaving
    if (this.isReady && this.ytPlayer && this.currentVideoId) {
      const currentTime = this.ytPlayer.getCurrentTime();
      const duration = this.ytPlayer.getDuration();
      Storage.updateVideo(this.currentVideoId, {
        timestamp: currentTime,
        duration: duration
      });
      if (typeof Storage.autoCheckComplete === 'function') {
        Storage.autoCheckComplete(this.currentVideoId);
      }
      
      // Pause video when leaving the player screen
      if (typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }
    }

    // Go back first to show the previous screen
    Router.goBack();

    // Then refresh home content
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
    showToast('Video marked as completed ✓');
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
      
      Player.stopAutoSave();
      if (Player.ytPlayer && typeof Player.ytPlayer.destroy === 'function') {
        Player.ytPlayer.destroy();
      }
      Player.ytPlayer = null;
      Player.currentVideoId = null;
      
      Home.render();
      Playlists.renderList();
      Playlists.toggleEmptyState();
      Router.goBack();
      showToast('Video deleted');
    }
  });
});


// NOTE: YouTube IFrame API is loaded once in index.html via:
// <script src="https://www.youtube.com/iframe_api"></script>
// Do NOT inject it again here — that causes a race condition.

// YouTube API calls this global function when ready
function onYouTubeIframeAPIReady() {
  // API loaded — player will be created when a video is opened
  // Clear any previous error state
  Player.ytApiTimedOut = false;
  Player.ytApiFailureShown = false;
}

// ----- Page Visibility (Pause on screen off / background) -----

document.addEventListener('visibilitychange', () => {
  if (document.hidden && Player.ytPlayer && typeof Player.ytPlayer.pauseVideo === 'function') {
    Player.ytPlayer.pauseVideo();
  }
});

// ----- Fullscreen Auto Landscape -----

['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
  document.addEventListener(evt, () => {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen) {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(e => console.log("Orientation lock failed", e));
      }
    } else {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  });
});
