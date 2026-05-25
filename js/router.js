/* ========================================
   router.js — Screen switching logic
   ======================================== */

const Router = {

  currentScreen: 'screen-home',
  previousScreen: 'screen-home',

  showScreen(screenId, isBack = false) {
    if (screenId === this.currentScreen) return;

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
    if (skeleton) skeleton.style.display = 'block';
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
    if (skeleton) {
      skeleton.style.opacity = '0';
      skeleton.style.transition = 'opacity 220ms ease';
      setTimeout(() => {
        skeleton.style.display = 'none';
        skeleton.style.opacity = '';
        skeleton.style.transition = '';
      }, 250);
    }
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
});

document.getElementById('nav-playlists').addEventListener('click', () => {
  Router.showScreen('screen-playlists');
});
