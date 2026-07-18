/* ========================================
   router.js — Screen switching logic
   ======================================== */

const Router = {

  currentScreen: 'screen-home',
  previousScreen: 'screen-home',

  showScreen(screenId, isBack = false) {
    if (screenId === this.currentScreen) return;

    // If leaving the player screen, pause and save progress
    if (this.currentScreen === 'screen-player' && screenId !== 'screen-player') {
      Player.pause();
      Player._saveProgress();
    }

    // Hide all .screen elements — skip transition to avoid blue flash
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.add('no-transition');
      s.style.display = 'none';
      s.classList.remove('active');
      s.classList.remove('no-transition');
    });

    // Show target screen with fade-in
    const next = document.getElementById(screenId);
    if (!next) return;
    next.classList.add('no-transition');
    next.style.display = 'block';
    // Force paint at opacity 0, then remove no-transition and fade to 1
    void next.offsetHeight;
    next.classList.remove('no-transition');
    next.classList.add('active');

    // Show skeleton immediately for non-player screens (player shows its own skeleton)
    if (screenId !== 'screen-player') {
      this.showSkeleton(screenId);
    }

    // Track previous screen for goBack — skip when going back to avoid ping-pong
    if (!isBack) {
      this.previousScreen = this.currentScreen;
    }
    this.currentScreen = screenId;

    // Hide bottom nav on player screen, visible on others (requirement #6)
    const nav = document.getElementById('bottom-nav');
    if (screenId === 'screen-player') {
      nav.style.display = 'none';
    } else {
      nav.style.display = 'flex';
    }

    // Update nav active state (requirement #8)
    this.updateNavActive(screenId);

    // Re-init Lucide icons on new screen (requirement #9)
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  // ----- Show skeleton for a screen -----

  showSkeleton(screenId) {
    const skeletonMap = {
      'screen-home': 'home-skeleton',
      'screen-player': 'player-skeleton',
      'screen-playlists': 'playlists-skeleton'
    };
    const skeletonId = skeletonMap[screenId];
    if (!skeletonId) return;
    const skeleton = document.getElementById(skeletonId);
    if (skeleton) {
      skeleton.style.display = 'block';
      skeleton.style.opacity = '1';
      // Mark screen so CSS hides real content underneath
      const screen = document.getElementById(screenId);
      if (screen) screen.classList.add('skeleton-active');
    }
  },

  // ----- Hide skeleton for a screen -----

  hideSkeleton(screenId) {
    const skeletonMap = {
      'screen-home': 'home-skeleton',
      'screen-player': 'player-skeleton',
      'screen-playlists': 'playlists-skeleton'
    };
    const skeletonId = skeletonMap[screenId];
    if (!skeletonId) return;
    const skeleton = document.getElementById(skeletonId);
    if (!skeleton) return;

    // Fade out skeleton
    skeleton.style.opacity = '0';
    skeleton.style.transition = 'opacity 220ms ease';

    // After fade completes, hide skeleton and reveal content with animation
    setTimeout(() => {
      skeleton.style.display = 'none';
      skeleton.style.opacity = '';
      skeleton.style.transition = '';

      // Remove skeleton-active so .screen-content becomes visible again
      // CSS animation auto-restarts when display:none → block via class removal
      const screen = document.getElementById(screenId);
      if (screen) screen.classList.remove('skeleton-active');
    }, 280);
  },

  updateNavActive(screenId) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.screen === screenId) {
        item.classList.add('active');
      }
    });
  },

  goBack() {
    this.showScreen(this.previousScreen, true);
  }

};

// ----- Nav button listeners (requirement #7) -----

document.getElementById('nav-home').addEventListener('click', () => {
  Router.showScreen('screen-home');
  // Clear live search input state
  const searchInput = document.getElementById('live-search-input');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('live-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  Home._searchQuery = '';
  // Re-render home content (also hides skeleton)
  Home.render();
});

document.getElementById('nav-playlists').addEventListener('click', () => {
  Router.showScreen('screen-playlists');
  // Re-render playlists content (also hides skeleton)
  Playlists.render();
});
