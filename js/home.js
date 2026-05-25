/* ========================================
   home.js — Home screen logic
   ======================================== */

const Home = {

  // ----- Render home screen -----

  render() {
    this.renderContinueWatching();
    this.renderVideosGrid();
    this.toggleEmptyState();
    // Hide skeleton after content is rendered
    Router.hideSkeleton('screen-home');
  },

  // ----- Continue Watching -----

  renderContinueWatching() {
    const section = document.getElementById('continue-watching');
    const lastWatchedId = Storage.getLastWatched();

    if (!lastWatchedId) {
      section.style.display = 'none';
      return;
    }

    const video = Storage.getVideoById(lastWatchedId);
    if (!video) {
      Storage.clearLastWatched();
      section.style.display = 'none';
      return;
    }

    // Show section
    section.style.display = 'block';

    // Thumbnail
    document.getElementById('continue-thumbnail').src = video.thumbnail;

    // Title
    document.getElementById('continue-title').textContent = video.title;

    // Playlist badge
    const badge = document.getElementById('continue-playlist');
    if (video.playlistId) {
      const playlist = Storage.getPlaylistById(video.playlistId);
      badge.textContent = playlist ? playlist.name : '';
      badge.style.display = playlist ? 'inline-block' : 'none';
    } else {
      badge.style.display = 'none';
    }

    // Progress bar
    const progress = getProgress(video);
    document.getElementById('continue-progress').style.width = progress + '%';

    // Click handlers
    const card = document.getElementById('continue-card');
    const resumeBtn = document.getElementById('continue-resume');

    // Remove old listeners by cloning
    const newCard = card.cloneNode(true);
    card.parentNode.replaceChild(newCard, card);
    const newResumeBtn = newCard.querySelector('#continue-resume');

    newCard.addEventListener('click', () => {
      Player.open(video.id);
    });

    newResumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      Player.open(video.id);
    });
  },

  // ----- Videos Grid -----

  renderVideosGrid() {
    const grid = document.getElementById('videos-grid');
    const videos = Storage.getVideos();

    grid.innerHTML = '';

    if (videos.length === 0) return;

    videos.forEach(video => {
      const card = this.createVideoCard(video);
      grid.appendChild(card);
    });
  },

  createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.videoId = video.id;

    const progress = getProgress(video);
    const barClass = video.completed ? 'progress-fill completed' : 'progress-fill';

    card.innerHTML = `
      <div class="video-card-thumb-wrapper">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy">
        ${video.completed ? '<div class="completed-badge"><i data-lucide="check"></i></div>' : ''}
      </div>
      <div class="video-card-info">
        <p class="video-card-title">${escapeHtml(video.title)}</p>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
          <div class="${barClass}" style="width: 0%"></div>
        </div>
        <span class="progress-percent ${video.completed ? 'completed' : ''}" aria-label="${progress}% watched">
          ${video.completed ? 'Completed' : progress + '%'}
        </span>
      </div>
    `;

    // Animate progress bar after mount
    const fill = card.querySelector('.progress-fill');
    setTimeout(() => {
      fill.style.width = progress + '%';
      fill.classList.add('animate');
    }, 50);

    // Click opens player
    card.addEventListener('click', () => {
      Player.open(video.id);
    });

    return card;
  },

  // ----- Empty State -----

  toggleEmptyState() {
    const videos = Storage.getVideos();
    const emptyState = document.getElementById('empty-state-home');
    const allVideosSection = document.getElementById('all-videos');

    if (videos.length === 0) {
      emptyState.style.display = 'flex';
      allVideosSection.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      allVideosSection.style.display = 'block';
    }
    // Reinit icons for empty state icon and completed badges
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  }

};

// ----- Helpers -----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ----- Init -----

Home.render();
