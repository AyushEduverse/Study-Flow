# Search, Filter & Sort Videos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search bar, playlist filter dropdown, status filter chips, and sort selector to the home screen so users can quickly find and organize their saved videos.

**Architecture:** All filtering logic lives in `home.js` inside a new `SearchFilter` module. The module reads from `Storage.getVideos()` and applies search/filter/sort in client-side memory. The home screen's existing `renderVideosGrid()` method will instead call `SearchFilter.getFilteredVideos()` and render those results. All state (search query, active filter, sort order) is stored in `SearchFilter.state` and survives re-renders but resets on home navigation.

**Tech Stack:** Vanilla JS (no frameworks), CSS custom properties, Lucide icons.

**Files to modify:**
- `index.html` — Add search bar HTML and filter controls inside `#home-content`
- `css/home.css` — Add styles for search input, filter chips, sort dropdown
- `js/home.js` — Integrate SearchFilter, update render pipeline

**File to create:**
- `js/search.js` — New SearchFilter module with all search/filter/sort logic

---

### Task 1: Create `js/search.js` — SearchFilter module

**Files:**
- Create: `js/search.js`

- [ ] **Step 1: Create the SearchFilter module skeleton**

```js
/* ========================================
   search.js — Search, Filter & Sort Logic
   ======================================== */

const SearchFilter = {

  // Default state
  state: {
    query: '',
    playlistId: '',
    status: 'all',        // 'all' | 'in-progress' | 'completed' | 'unwatched'
    sortBy: 'date-desc'   // 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'progress-desc' | 'progress-asc'
  },

  // ----- Public: Get filtered/sorted videos -----

  getFilteredVideos() {
    let videos = Storage.getVideos();
    videos = this._applySearch(videos);
    videos = this._applyPlaylistFilter(videos);
    videos = this._applyStatusFilter(videos);
    videos = this._applySort(videos);
    return videos;
  },

  // ----- Private: Search by title (case-insensitive) -----

  _applySearch(videos) {
    const q = this.state.query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(v => v.title.toLowerCase().includes(q));
  },

  // ----- Private: Filter by playlist -----

  _applyPlaylistFilter(videos) {
    if (!this.state.playlistId) return videos;
    return videos.filter(v => v.playlistId === this.state.playlistId);
  },

  // ----- Private: Filter by status -----

  _applyStatusFilter(videos) {
    switch (this.state.status) {
      case 'completed':
        return videos.filter(v => v.completed === true);
      case 'in-progress':
        return videos.filter(v => !v.completed && v.timestamp > 0);
      case 'unwatched':
        return videos.filter(v => !v.completed && (!v.timestamp || v.timestamp === 0));
      default:
        return videos;
    }
  },

  // ----- Private: Sort videos -----

  _applySort(videos) {
    const sorted = [...videos];
    switch (this.state.sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'progress-desc':
        return sorted.sort((a, b) => this._getProgress(b) - this._getProgress(a));
      case 'progress-asc':
        return sorted.sort((a, b) => this._getProgress(a) - this._getProgress(b));
      default: // 'date-desc'
        return sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
  },

  _getProgress(video) {
    if (video.completed) return 100;
    if (!video.duration || video.duration === 0) return 0;
    return Math.min(Math.round((video.timestamp / video.duration) * 100), 99);
  },

  // ----- Reset state (for when user navigates away) -----

  reset() {
    this.state.query = '';
    this.state.playlistId = '';
    this.state.status = 'all';
    this.state.sortBy = 'date-desc';
  },

  // ----- Get playable playlist options for filter dropdown -----

  getPlaylistOptions() {
    const playlists = Storage.getPlaylists();
    return playlists;
  }

};
```

- [ ] **Step 2: Add the script reference in `index.html`**

Add after `js/playlists.js` and before `js/notes.js`:

```html
  <script src="js/search.js"></script>
```

---

### Task 2: Add Search & Filter HTML to the Home Screen

**Files:**
- Modify: `index.html` (add search/filter HTML inside `#home-content`)

- [ ] **Step 1: Add search bar and filters after the header in `#home-content`**

Insert after `<header class="screen-header">...` and before `<!-- Continue Watching -->`:

```html
      <!-- Search & Filter Bar -->
      <div class="search-filter-bar" id="search-filter-bar">
        <div class="search-input-wrapper">
          <i data-lucide="search" class="search-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Search videos..."
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            aria-label="Search videos by title"
          >
          <button id="search-clear-btn" class="search-clear-btn" aria-label="Clear search" style="display: none;">
            <i data-lucide="x" aria-hidden="true"></i>
          </button>
        </div>

        <div class="filter-row" id="filter-row">
          <!-- Playlist Filter Dropdown -->
          <div class="filter-dropdown-wrapper">
            <select id="filter-playlist" class="filter-select" aria-label="Filter by playlist">
              <option value="">All Playlists</option>
            </select>
          </div>

          <!-- Sort Dropdown -->
          <div class="filter-dropdown-wrapper">
            <select id="filter-sort" class="filter-select" aria-label="Sort videos">
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="progress-desc">Most Watched</option>
              <option value="progress-asc">Least Watched</option>
            </select>
          </div>

          <!-- Status Filter Chips -->
          <div class="filter-chips" id="filter-chips" role="radiogroup" aria-label="Filter by status">
            <button class="filter-chip active" data-status="all" role="radio" aria-checked="true" aria-label="All videos">All</button>
            <button class="filter-chip" data-status="in-progress" role="radio" aria-checked="false" aria-label="In progress videos">In Progress</button>
            <button class="filter-chip" data-status="completed" role="radio" aria-checked="false" aria-label="Completed videos">Completed</button>
            <button class="filter-chip" data-status="unwatched" role="radio" aria-checked="false" aria-label="Unwatched videos">Unwatched</button>
          </div>
        </div>
      </div>
```

---

### Task 3: Add CSS for Search Bar & Filters

**Files:**
- Modify: `css/home.css` (append new styles)

- [ ] **Step 1: Add all search/filter CSS at the bottom of `home.css`**

```css
/* ========================================
   home.css — Search & Filter Bar Styles
   ======================================== */

/* ---- Search & Filter Bar Container ---- */

.search-filter-bar {
  margin-bottom: 20px;
}

/* ---- Search Input ---- */

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0 12px;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
  min-height: 48px;
}

.search-input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  font-family: inherit;
  min-height: 44px;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

/* Clear button inside search */
.search-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--bg-2);
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.search-clear-btn:hover {
  background: var(--border);
}

.search-clear-btn svg {
  width: 16px;
  height: 16px;
}

/* ---- Filter Row ---- */

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  align-items: center;
}

/* ---- Filter Dropdowns ---- */

.filter-dropdown-wrapper {
  flex: 1;
  min-width: 120px;
  max-width: 180px;
}

.filter-select {
  width: 100%;
  padding: 8px 32px 8px 10px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-base);
  min-height: 36px;
}

.filter-select:focus {
  border-color: var(--primary);
}

/* ---- Filter Chips ---- */

.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 200px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.2px;
  white-space: nowrap;
  min-height: 32px;
}

.filter-chip:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}

.filter-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #FFFFFF;
}

/* ---- No Results State ---- */

.search-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  text-align: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--text-secondary);
}

.search-no-results svg {
  width: 32px;
  height: 32px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.search-no-results p {
  font-size: 14px;
  font-weight: 500;
  max-width: 220px;
  line-height: 1.6;
}
```

---

### Task 4: Integrate SearchFilter into `js/home.js`

**Files:**
- Modify: `js/home.js`

- [ ] **Step 1: Update `render()` to use SearchFilter and reset on render**

Change `Home.render()` to call `SearchFilter.getFilteredVideos()` instead of `Storage.getVideos()`:

```js
// Replace the render() method entirely

  render() {
    this.renderContinueWatching();
    this.renderVideosGrid();
    this.toggleEmptyState();
    this._syncFilterUI();
    Router.hideSkeleton('screen-home');
  },
```

- [ ] **Step 2: Update `renderVideosGrid()` to use filtered results**

Change `renderVideosGrid()` to use `SearchFilter.getFilteredVideos()`:

```js
  renderVideosGrid() {
    const grid = document.getElementById('videos-grid');
    const videos = SearchFilter.getFilteredVideos();

    grid.innerHTML = '';

    if (videos.length === 0) {
      this._showNoResults();
      return;
    }

    videos.forEach(video => {
      const card = this.createVideoCard(video);
      grid.appendChild(card);
    });
  },
```

- [ ] **Step 3: Add `_showNoResults()` method**

Add a method to show a "no results" state when search/filter returns empty but there are videos:

```js
  _showNoResults() {
    const grid = document.getElementById('videos-grid');
    const hasVideos = Storage.getVideos().length > 0;
    if (!hasVideos) return; // Will be handled by empty state

    grid.innerHTML = `
      <div class="search-no-results" style="grid-column: 1 / -1;">
        <i data-lucide="search-x" aria-hidden="true"></i>
        <p>No videos match your search or filters.</p>
      </div>
    `;
    if (typeof refreshIcons === 'function') refreshIcons();
  },
```

- [ ] **Step 4: Add `_syncFilterUI()` to update filter dropdown options**

Add a method to keep the playlist filter dropdown in sync with stored playlists:

```js
  _syncFilterUI() {
    const select = document.getElementById('filter-playlist');
    if (!select) return;

    const currentValue = select.value;
    const playlists = Storage.getPlaylists();

    select.innerHTML = '<option value="">All Playlists</option>';
    playlists.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });

    // Restore previously selected value
    select.value = SearchFilter.state.playlistId || '';
  },
```

- [ ] **Step 5: Update `toggleEmptyState` to respect search context**

When there are no videos at all, show the original empty state (ignoring search). Only show no-results if search returned empty but videos exist.

```js
  toggleEmptyState() {
    const allVideos = Storage.getVideos();
    const filteredVideos = SearchFilter.getFilteredVideos();
    const emptyState = document.getElementById('empty-state-home');
    const allVideosSection = document.getElementById('all-videos');
    const noResults = document.querySelector('.search-no-results');

    if (allVideos.length === 0) {
      // No videos at all — show original empty state
      emptyState.style.display = 'flex';
      allVideosSection.style.display = 'none';
    } else {
      // Has videos — always show section, content handled by renderVideosGrid
      emptyState.style.display = 'none';
      allVideosSection.style.display = 'block';
    }

    if (typeof refreshIcons === 'function') refreshIcons();
  },
```

---

### Task 5: Wire event listeners for Search & Filters

**Files:**
- Modify: `index.html` (add search.js script reference — already done in Task 1)
- Modify: `js/home.js` (add event listeners)

- [ ] **Step 1: Add search event listeners to Home's render flow**

Add a new method `_bindSearchListeners()` to Home and call it on init:

```js
  // Add to Home object:

  _bindSearchListeners() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const playlistFilter = document.getElementById('filter-playlist');
    const sortFilter = document.getElementById('filter-sort');
    const chips = document.querySelectorAll('.filter-chip');

    if (!searchInput) return;

    // Debounced search on input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        SearchFilter.state.query = searchInput.value;
        clearBtn.style.display = searchInput.value ? 'flex' : 'none';
        this.renderVideosGrid();
        this.toggleEmptyState();
        if (typeof refreshIcons === 'function') refreshIcons();
      }, 200);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      SearchFilter.state.query = '';
      clearBtn.style.display = 'none';
      this.renderVideosGrid();
      this.toggleEmptyState();
      if (typeof refreshIcons === 'function') refreshIcons();
      searchInput.focus();
    });

    // Playlist filter
    playlistFilter.addEventListener('change', () => {
      SearchFilter.state.playlistId = playlistFilter.value;
      this.renderVideosGrid();
      this.toggleEmptyState();
      if (typeof refreshIcons === 'function') refreshIcons();
    });

    // Sort filter
    sortFilter.addEventListener('change', () => {
      SearchFilter.state.sortBy = sortFilter.value;
      this.renderVideosGrid();
      this.toggleEmptyState();
      if (typeof refreshIcons === 'function') refreshIcons();
    });

    // Status chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');
        SearchFilter.state.status = chip.dataset.status;
        this.renderVideosGrid();
        this.toggleEmptyState();
        if (typeof refreshIcons === 'function') refreshIcons();
      });
    });
  },
```

- [ ] **Step 2: Call `_bindSearchListeners()` after DOMContentLoaded**

Update the init section at the bottom of `home.js`:

```js
// Replace the existing Home.render() call at the bottom with:

document.addEventListener('DOMContentLoaded', () => {
  Home._bindSearchListeners();
  Home.render();
});

// Also keep the existing Home.render() call for initial load
// (it's already called at the end of home.js, but we wrap it)
```

**Important:** The existing `Home.render();` at the bottom of home.js needs to be replaced. Remove the standalone call and use DOMContentLoaded instead.

---

### Task 6: Reset SearchFilter on Home navigation

**Files:**
- Modify: `js/router.js` (reset search state when navigating to home)

- [ ] **Step 1: Reset SearchFilter when navigating to home screen**

In `js/router.js`, update the nav-home click listener:

```js
// Replace existing listener

document.getElementById('nav-home').addEventListener('click', () => {
  Router.showScreen('screen-home');
  if (typeof SearchFilter !== 'undefined') {
    SearchFilter.reset();
  }
  Home.render();
});
```

---

### Task 7: Update `index.html` CSS cache busters

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Bump CSS version for cache busting**

Change `home.css?v=1.7` to `home.css?v=1.8` in the CSS link tag.

---

### Task 8: Verify feature works end-to-end

**No files changed.**

- [ ] **Step 1: Open `index.html` in browser and verify**

   1. Open the app
   2. Verify search bar appears below the header
   3. Type in search — videos should filter in real-time
   4. Clear search — all videos return
   5. Select a playlist filter — only videos in that playlist shown
   6. Change sort order — videos reorder
   7. Click status chips — only matching videos shown
   8. Combine search + filter + sort — all should work together
   9. Navigate to Playlists tab and back — search state should reset
   10. Open a video, go back — search should be reset

- [ ] **Step 2: Test accessibility**

   1. Tab through search input, select, chips — focus indicators visible
   2. Screen reader announces search input label, chip states
   3. No console errors

---

### Task 9: Add `search-x` icon to Lucide icons

**No files changed.**

- [ ] **Step 1: Ensure `search-x` icon works with Lucide**

The `search-x` icon is used in the no-results state. Since Lucide loads from CDN, it should be available. If not present in the bundled version, replace with `file-search` or `x-circle` icon.

---

### File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `js/search.js` | **Create** | New SearchFilter module with all search/filter/sort logic |
| `index.html` | **Modify** | Add search/filter HTML, add search.js script ref, bump CSS version |
| `css/home.css` | **Modify** | Add search bar, filter dropdown, chip, and no-results styles |
| `js/home.js` | **Modify** | Integrate SearchFilter, add event listeners, update render pipeline |
| `js/router.js` | **Modify** | Reset SearchFilter state on home navigation |
