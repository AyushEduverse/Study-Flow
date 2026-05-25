/* ========================================
   playlists.js — Playlist create/delete/filter logic
   ======================================== */

const Playlists = {

  isFilteredView: false,
  activeMenu: null,

  // ----- Render playlists list -----

  render() {
    this.isFilteredView = false;
    this.showListView();
    this.renderList();
    this.toggleEmptyState();
    this.populateModalDropdown();
    // Hide skeleton after content is rendered
    Router.hideSkeleton('screen-playlists');
  },

  renderList() {
    const container = document.getElementById('playlists-list');
    const playlists = Storage.getPlaylists();

    container.innerHTML = '';

    playlists.forEach((playlist, i) => {
      const card = this.createPlaylistCard(playlist);
      container.appendChild(card);
      setTimeout(() => card.classList.add('visible'), 50 + i * 60);
    });

    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  createPlaylistCard(playlist) {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.dataset.playlistId = playlist.id;

    const color = getPlaylistColor(playlist.colorIndex);
    const videos = Storage.getVideosByPlaylist(playlist.id);
    const videoCount = videos.length;
    const subtitle = videoCount + ' video' + (videoCount !== 1 ? 's' : '');

    card.innerHTML = `
      <div class="playlist-card-circle" style="background: ${color.bg}; color: ${color.accent}">
        ${playlist.name.charAt(0).toUpperCase()}
      </div>
      <div class="playlist-card-info">
        <p class="playlist-card-name">${escapeHtml(playlist.name)}</p>
        <span class="playlist-card-count">${subtitle}</span>
      </div>
      <button class="playlist-card-kebab" data-menu-id="${playlist.id}" title="More options">
        <i data-lucide="more-vertical"></i>
      </button>
      <div class="kebab-menu" data-menu-for="${playlist.id}" style="display: none;">
        <button class="kebab-menu-item" data-action="rename" data-id="${playlist.id}">
          <i data-lucide="pencil"></i>
          Rename
        </button>
        <button class="kebab-menu-item kebab-menu-item-danger" data-action="delete" data-id="${playlist.id}">
          <i data-lucide="trash-2"></i>
          Delete
        </button>
      </div>
    `;

    return card;
  },

  // ----- Delegated click handler for playlist cards -----

  handleCardClick(e) {
    const kebabBtn = e.target.closest('.playlist-card-kebab');
    if (kebabBtn) {
      e.stopPropagation();
      const id = kebabBtn.dataset.menuId;
      this.toggleMenu(id);
      return;
    }

    const renameBtn = e.target.closest('[data-action="rename"]');
    if (renameBtn) {
      e.stopPropagation();
      this.closeMenus();
      this.startRename(renameBtn.dataset.id);
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      e.stopPropagation();
      this.closeMenus();
      this.deletePlaylist(deleteBtn.dataset.id);
      return;
    }

    const info = e.target.closest('.playlist-card-info');
    if (info) {
      const card = e.target.closest('.playlist-card');
      if (card) {
        this.closeMenus();
        this.showFilteredView(card.dataset.playlistId);
      }
    }
  },

  // ----- Kebab menu -----

  toggleMenu(playlistId) {
    const menu = document.querySelector(`[data-menu-for="${playlistId}"]`);
    if (!menu) return;

    if (this.activeMenu && this.activeMenu !== menu) {
      this.activeMenu.style.display = 'none';
    }

    if (menu.style.display === 'none') {
      menu.style.display = 'flex';
      this.activeMenu = menu;
    } else {
      menu.style.display = 'none';
      this.activeMenu = null;
    }
  },

  closeMenus() {
    document.querySelectorAll('.kebab-menu').forEach(m => m.style.display = 'none');
    this.activeMenu = null;
  },

  // ----- Rename playlist -----

  startRename(playlistId) {
    const card = document.querySelector(`[data-playlist-id="${playlistId}"]`);
    if (!card) return;

    const playlist = Storage.getPlaylistById(playlistId);
    if (!playlist) return;

    const nameEl = card.querySelector('.playlist-card-name');
    const originalName = playlist.name;

    nameEl.innerHTML = `<input type="text" class="rename-input" value="${escapeHtml(originalName)}" maxlength="50">`;
    const input = nameEl.querySelector('input');
    input.focus();
    input.select();

    const save = () => {
      const newName = input.value.trim();
      if (newName && newName !== originalName) {
        Storage.updatePlaylistName(playlistId, newName);
        showToast('Playlist renamed');
      }
      this.renderList();
      this.populateModalDropdown();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') {
        this.renderList();
      }
    });

    input.addEventListener('blur', save);
  },

  // ----- Create playlist (bottom sheet) -----

  openCreateSheet() {
    const overlay = document.getElementById('playlist-create-overlay');
    const sheet = document.getElementById('playlist-create-sheet');
    const input = document.getElementById('playlist-create-input');

    overlay.style.display = 'flex';
    sheet.classList.remove('slide-down');
    sheet.classList.add('slide-up');
    input.value = '';
    setTimeout(() => input.focus(), 300);
  },

  closeCreateSheet() {
    const overlay = document.getElementById('playlist-create-overlay');
    const sheet = document.getElementById('playlist-create-sheet');

    sheet.classList.remove('slide-up');
    sheet.classList.add('slide-down');

    sheet.addEventListener('animationend', function handler() {
      overlay.style.display = 'none';
      sheet.classList.remove('slide-down');
      sheet.removeEventListener('animationend', handler);
    });
  },

  createPlaylist() {
    const input = document.getElementById('playlist-create-input');
    const name = input.value.trim();

    if (!name) {
      input.focus();
      return;
    }

    const playlist = {
      id: generateId(),
      name: name,
      createdAt: new Date().toISOString()
    };

    Storage.savePlaylist(playlist);
    this.closeCreateSheet();
    this.renderList();
    this.toggleEmptyState();
    this.populateModalDropdown();

    showToast('Playlist created');
  },

  // ----- Delete playlist -----

  deletePlaylist(id) {
    const playlist = Storage.getPlaylistById(id);
    if (!playlist) return;

    ConfirmDialog.show({
      title: 'Delete Playlist',
      message: `Delete "${playlist.name}"? Videos won't be deleted.`,
      confirmText: 'Delete',
      onConfirm: () => {
        Storage.deletePlaylist(id);

        if (this.isFilteredView) {
          this.render();
        } else {
          this.renderList();
          this.toggleEmptyState();
          this.populateModalDropdown();
        }

        showToast('Playlist deleted');
      }
    });
  },

  // ----- Filtered view (playlist videos) -----

  showFilteredView(playlistId) {
    const playlist = Storage.getPlaylistById(playlistId);
    if (!playlist) return;

    this.isFilteredView = true;

    // Hide list elements
    document.getElementById('playlists-list').style.display = 'none';
    document.querySelector('.playlists-header .btn-new-playlist').style.display = 'none';
    document.getElementById('empty-state-playlists').style.display = 'none';

    const view = document.getElementById('playlist-videos-view');
    view.style.display = 'block';

    // Header with accent color
    const color = getPlaylistColor(playlist.colorIndex);
    const titleEl = document.getElementById('playlist-view-title');
    titleEl.textContent = playlist.name;
    titleEl.style.color = color.accent;

    // Grid
    const grid = document.getElementById('playlist-videos-grid');
    grid.innerHTML = '';

    const videos = Storage.getVideosByPlaylist(playlistId);

    if (videos.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; text-align: center; padding: 40px 0;">No videos in this playlist.</p>';
    } else {
      videos.forEach(video => {
        const card = Home.createVideoCard(video);
        grid.appendChild(card);
      });
      if (typeof refreshIcons === 'function') {
        refreshIcons();
      }
    }
  },

  showListView() {
    document.getElementById('playlists-list').style.display = 'flex';
    const newPLBtn = document.querySelector('.playlists-header .btn-new-playlist');
    if (newPLBtn) newPLBtn.style.display = 'inline-flex';
    document.getElementById('playlist-videos-view').style.display = 'none';
    this.toggleEmptyState();
  },

  // ----- Empty state -----

  toggleEmptyState() {
    const playlists = Storage.getPlaylists();
    const emptyState = document.getElementById('empty-state-playlists');
    const list = document.getElementById('playlists-list');

    if (playlists.length === 0) {
      emptyState.style.display = 'flex';
      list.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      list.style.display = 'flex';
    }
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  },

  // ----- Custom Dropdowns -----

  initCustomDropdowns() {
    ['add-video-playlist', 'edit-video-playlist'].forEach(prefix => {
      const dropdown = document.getElementById(`${prefix}-dropdown`);
      const trigger = document.getElementById(`${prefix}-trigger`);
      const menu = document.getElementById(`${prefix}-menu`);
      const input = document.getElementById(prefix === 'add-video-playlist' ? 'playlist-select' : 'edit-playlist-select');
      const label = document.getElementById(`${prefix}-label`);
      
      if (!dropdown || !trigger || !menu) return;

      // Toggle menu
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close others
        document.querySelectorAll('.custom-dropdown').forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            d.querySelector('.custom-dropdown-menu').style.display = 'none';
          }
        });

        dropdown.classList.toggle('open');
        menu.style.display = dropdown.classList.contains('open') ? 'block' : 'none';
      });

      // Item click delegation
      menu.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-dropdown-item');
        if (!item) return;

        // Update active state
        menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Update value and label
        input.value = item.getAttribute('data-value');
        label.textContent = item.textContent.trim();

        // Close
        dropdown.classList.remove('open');
        menu.style.display = 'none';
      });
    });

    // Close on click outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
        const menu = dropdown.querySelector('.custom-dropdown-menu');
        if (menu) menu.style.display = 'none';
      });
    });
  },

  populateModalDropdown() {
    const playlists = Storage.getPlaylists();

    ['add-video-playlist', 'edit-video-playlist'].forEach(prefix => {
      const menu = document.getElementById(`${prefix}-menu`);
      if (!menu) return;

      // Keep current value
      const input = document.getElementById(prefix === 'add-video-playlist' ? 'playlist-select' : 'edit-playlist-select');
      const currentValue = input ? input.value : '';

      // Default item
      let html = `<div class="custom-dropdown-item ${!currentValue ? 'active' : ''}" data-value="">Select Playlist</div>`;
      
      playlists.forEach(playlist => {
        const color = getPlaylistColor(playlist.colorIndex);
        const isActive = currentValue === playlist.id;
        html += `
          <div class="custom-dropdown-item ${isActive ? 'active' : ''}" data-value="${playlist.id}">
            <div class="dropdown-color-badge" style="background-color: ${color.bg}; border: 1px solid ${color.accent}"></div>
            ${escapeHtml(playlist.name)}
          </div>
        `;
      });
      menu.innerHTML = html;
      
      // Update label based on current value
      const label = document.getElementById(`${prefix}-label`);
      
      if (label) {
        if (!currentValue) {
          label.textContent = 'Select Playlist';
        } else {
          const p = playlists.find(p => p.id === currentValue);
          label.textContent = p ? p.name : 'Select Playlist';
        }
      }
    });
  }

};

// ----- Button listeners -----

document.getElementById('new-playlist-btn').addEventListener('click', () => {
  Playlists.openCreateSheet();
});

document.addEventListener('DOMContentLoaded', () => {
  Playlists.initCustomDropdowns();
});

// Delegated click handler for playlist cards (survives re-renders)
document.getElementById('playlists-list').addEventListener('click', (e) => {
  Playlists.handleCardClick(e);
});

document.getElementById('playlist-create-confirm').addEventListener('click', () => {
  Playlists.createPlaylist();
});

document.getElementById('playlist-create-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    Playlists.createPlaylist();
  }
});

document.getElementById('playlist-create-close').addEventListener('click', () => {
  Playlists.closeCreateSheet();
});

document.getElementById('playlist-create-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    Playlists.closeCreateSheet();
  }
});

document.getElementById('playlist-back-btn').addEventListener('click', () => {
  Playlists.render();
});

// Close kebab menus on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.playlist-card-kebab') && !e.target.closest('.kebab-menu')) {
    Playlists.closeMenus();
  }
});

// ----- Init -----

Playlists.render();
