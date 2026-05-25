# StudyFlow — Product Requirements Document (MVP)

## Overview

StudyFlow is a distraction-free YouTube learning web app.
Users save YouTube videos, organize them in playlists, and watch them inside the app with auto-resume from last timestamp.

---

## Tech Stack

- HTML + CSS + Vanilla JavaScript (no frameworks)
- Tailwind CSS (CDN)
- Lucide Icons (CDN)
- YouTube IFrame Player API
- YouTube oEmbed API (no key required)
- LocalStorage (all data stored here)

---

## App Architecture

- Single page app (SPA) — single `index.html`
- JavaScript handles all screen switching (no page reload)
- No backend, no auth, no server

### File Structure

```
studyflow/
├── index.html              ← Single HTML file, contains all screen markup
├── css/
│   ├── main.css            ← Variables, reset, typography, bottom nav, transitions
│   ├── home.css            ← Home screen styles only
│   ├── player.css          ← Player screen styles only
│   ├── playlists.css       ← Playlists screen styles only
│   └── modal.css           ← Add video modal styles only
├── js/
│   ├── storage.js          ← All LocalStorage read/write operations
│   ├── router.js           ← Screen switching logic (shows/hides screens)
│   ├── home.js             ← Home screen render + continue watching logic
│   ├── player.js           ← YouTube IFrame API + timestamp auto-save
│   ├── playlists.js        ← Playlist create/delete/filter logic
│   └── modal.js            ← Add video modal + oEmbed fetch logic
└── CLAUDE.md
```

### How SPA Works (Important)

All screens exist in `index.html` at the same time.
Only one screen is visible — others have `display: none`.
`router.js` controls which screen is shown.
No page reload ever happens.

```js
// router.js — core logic
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById(screenId).style.display = 'block';
}
```

### Script Load Order in index.html

Scripts must load in this exact order (bottom of body):

```html
<script src="js/storage.js"></script>
<script src="js/router.js"></script>
<script src="js/modal.js"></script>
<script src="js/home.js"></script>
<script src="js/player.js"></script>
<script src="js/playlists.js"></script>
```

### CSS Load Order in index.html

```html
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/home.css">
<link rel="stylesheet" href="css/player.css">
<link rel="stylesheet" href="css/playlists.css">
<link rel="stylesheet" href="css/modal.css">
```

---

## Screens

Three screens total. Only one visible at a time, switched via JS.

```
#screen-home
#screen-player
#screen-playlists
```

---

## Bottom Navigation

Fixed at bottom. Always visible except on player screen.

Three items:
- Home icon → show #screen-home
- + (FAB, center, blue circle) → open Add Video modal
- Playlists icon → show #screen-playlists

Active state: icon turns blue (#4DA6FF).

---

## Screen 1 — Home

### Layout (top to bottom)

1. Header: "StudyFlow" title (left) + no other icons
2. Continue Watching section (only if lastWatched video exists)
3. All Videos section (grid, 2 columns)
4. Empty state if no videos saved yet

### Continue Watching Card

- Full width card
- Video thumbnail (16:9)
- Video title (truncate 2 lines)
- Playlist name badge
- Progress bar (blue fill, shows % watched)
- "Resume" button (blue, full width)
- Clicking card or Resume → opens player screen

### Videos Grid

- 2 columns
- Each card: thumbnail + title (2 line truncate) + progress bar (thin, at bottom of card)
- Completed videos: show green checkmark badge on thumbnail
- Clicking card → opens player screen

### Empty State

- Show when no videos saved
- Text: "No videos yet. Tap + to add your first video."
- Simple, centered

---

## Screen 2 — Player

### Layout

1. Back button (top left) → returns to previous screen
2. Video player (full width, 16:9 YouTube iframe)
3. Video title (below player)
4. Playlist badge
5. Progress text: "X% watched"
6. Mark as Complete button (outlined, below progress)

### YouTube Player Behavior

- Use YouTube IFrame Player API
- On player ready: auto-seek to saved timestamp
- Every 5 seconds: save current timestamp to LocalStorage
- When video ends: mark as completed automatically

### Bottom Nav

Hidden on player screen.

---

## Screen 3 — Playlists

### Layout

1. Header: "Playlists"
2. "New Playlist" button (top right, small, outlined)
3. List of playlists (each is a card)
4. Empty state if no playlists

### Playlist Card

- Playlist name
- Video count badge (e.g. "4 videos")
- Delete icon (right side)
- Clicking card → shows filtered video grid for that playlist (same as home grid but filtered)
- Back button to return to full playlists list

### Create Playlist

- Clicking "New Playlist" → small inline input appears
- User types name → press Enter or confirm button → playlist saved
- No modal needed, keep it simple

---

## Add Video Modal (Bottom Sheet)

Triggered by + FAB in bottom nav.

### Layout

- Slides up from bottom
- Dark overlay behind it
- Close button (top right of sheet)

### Fields

1. YouTube URL input (paste link here)
2. On paste/input → auto-fetch title + thumbnail via oEmbed API
3. Show fetched thumbnail preview + title (auto-filled, editable)
4. Playlist selector (dropdown — lists saved playlists + "No Playlist" option)
5. Save button (blue, full width)

### oEmbed API call

```
https://www.youtube.com/oembed?url=YOUTUBE_URL&format=json
```

Returns: title, thumbnail_url, author_name

### Video ID extraction

Extract from URL formats:
- youtube.com/watch?v=VIDEO_ID
- youtu.be/VIDEO_ID
- youtube.com/shorts/VIDEO_ID

---

## LocalStorage Structure

### Key: `sf_videos`

```json
[
  {
    "id": "uuid-v4",
    "title": "React Tutorial for Beginners",
    "videoId": "SqcY0GlETPk",
    "thumbnail": "https://i.ytimg.com/vi/SqcY0GlETPk/hqdefault.jpg",
    "playlistId": "playlist-uuid or null",
    "timestamp": 145,
    "duration": 0,
    "completed": false,
    "addedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Key: `sf_playlists`

```json
[
  {
    "id": "uuid-v4",
    "name": "Web Dev",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### Key: `sf_last_watched`

```json
"video-uuid-string"
```

---

## Design System

### Colors

```css
--bg: #F5FAFF
--primary: #4DA6FF
--primary-dark: #2d8de0
--text: #1E293B
--text-secondary: #64748B
--card-bg: #FFFFFF
--border: #E2EAF4
--success: #10B981
--progress-bg: #E2EAF4
```

### Typography

- Font: Poppins (Google Fonts)
- Heading: 18px, weight 600
- Body: 14px, weight 400
- Small/badge: 12px, weight 500

### Components

- Card border-radius: 16px
- Button border-radius: 12px
- Modal border-radius: 24px top corners only
- Box shadow on cards: `0 2px 8px rgba(0,0,0,0.06)`
- Bottom nav height: 64px
- Bottom nav shadow: `0 -1px 0 #E2EAF4`
- FAB (+ button): 52px circle, background #4DA6FF, white icon, no shadow

### Spacing

- Screen padding: 16px horizontal
- Section gap: 24px
- Card gap in grid: 12px

### Transitions

- Screen switch: fade 200ms
- Modal open: slide up 300ms ease-out
- Button press: scale(0.97) 100ms

---

## UUID Generation

Use this simple function (no library needed):

```js
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

---

## Progress Calculation

```js
// progress % shown on card
function getProgress(video) {
  if (video.completed) return 100;
  if (!video.duration || video.duration === 0) return 0;
  return Math.min(Math.round((video.timestamp / video.duration) * 100), 99);
}
```

Duration is saved when YouTube player fires `onReady` event — use `player.getDuration()`.

---

## Error Handling

- Invalid YouTube URL → show inline error: "Please enter a valid YouTube link"
- oEmbed fetch fails → allow manual title entry, use default thumbnail
- LocalStorage full → show toast: "Storage full. Please delete some videos."

---

## What is NOT in MVP

- Search
- User auth
- Backend / Supabase (later)
- PWA / Service Worker (later)
- Video delete (later — v1.1)
- Notes on videos
- Profile page
- Animations library (GSAP, Lenis, Swiper)

---

## Definition of Done

MVP is complete when:

1. User can paste a YouTube link and save it
2. Video appears on home screen with thumbnail
3. Clicking video opens player and starts playing
4. Closing app and reopening → same video resumes from last position
5. User can create a playlist and assign videos to it
6. Playlists screen shows filtered videos correctly

