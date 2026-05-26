<div align="center">

<img src="assets/icons/Study-Flow.png" alt="StudyFlow Logo" width="180" style="margin-bottom: 16px;">

# StudyFlow

### Distraction-Free YouTube Learning App

<p align="center">
  <a href="https://ayusheduverse.github.io/Study-Flow/">
    <img src="https://img.shields.io/badge/Live_Demo-🌐-brightgreen?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/AyushEduverse/Study-Flow">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github" alt="GitHub Repo">
  </a>
</p>

<p align="center">
  <strong>
    Save YouTube videos, organize them in playlists, and watch them with auto-resume from your last timestamp.
  </strong>
</p>

<p align="center">
  <a href="https://ayusheduverse.github.io/Study-Flow/">🌐 Live Demo</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-screenshots">Screenshots</a>
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">

</div>

## ✨ Features

- **🎥 Save YouTube Videos** — Paste any YouTube link and save it with auto-fetched title and thumbnail
- **📂 Organize in Playlists** — Create, rename, and delete playlists to keep your learning organized
- **▶️ Distraction-Free Player** — Full YouTube IFrame Player API integration with programmatic controls
- **⏱️ Auto-Resume** — Progress saved every 5 seconds + on pause/tab switch/close; resumes from exact position
- **⏸️ Smart Pause** — Video auto-pauses when you switch tabs, minimize the screen, or close the app
- **✅ Auto-Complete** — Videos automatically marked as complete when they finish playing
- **📱 PWA Ready** — Installable as an app with offline support via Service Worker
- **📱 Fully Responsive** — Works perfectly on mobile and desktop
- **⚡ Pure Vanilla JS** — No frameworks, no build step, no backend required

## 🚀 Quick Start

No installation needed. Just open `index.html` in your browser!

```bash
# Clone the repository
git clone https://github.com/AyushEduverse/Study-Flow.git

# Navigate into the project
cd Study-Flow

# Open directly in browser
open index.html
# or just double-click index.html!
```

> 💡 **Tip:** All data is stored in your browser's LocalStorage. Nothing is sent to any server.

## 📁 Project Structure

```
Study-Flow/
├── index.html              ← Single HTML file, all screens
├── assets/
│   ├── icons/              ← App icons (favicon, PWA icons, logo)
│   │   ├── Study-Flow.png
│   │   ├── favicon.ico
│   │   ├── apple-touch-icon.png
│   │   ├── android-chrome-192x192.png
│   │   ├── android-chrome-512x512.png
│   │   ├── favicon-16x16.png
│   │   └── favicon-32x32.png
│   └── screenshots/        ← README screenshots
├── css/
│   ├── main.css            ← Design system, reset, bottom nav, skeleton loaders
│   ├── home.css            ← Home screen styles (continue watching, video grid)
│   ├── player.css          ← Player screen styles (YT player, progress, actions)
│   ├── playlists.css       ← Playlists screen styles (cards, kebab menu)
│   ├── modal.css           ← Modal/bottom sheet, custom dropdown, confirm dialog
│   └── updater.css         ← PWA update modal styles
├── js/
│   ├── storage.js          ← LocalStorage CRUD operations + toast + generateId
│   ├── router.js           ← SPA screen switching + skeleton show/hide
│   ├── home.js             ← Home screen render + continue watching logic
│   ├── player.js           ← YouTube IFrame API + auto-save every 5s + orientation
│   ├── playlists.js        ← Playlist CRUD, kebab menu, filtered view, dropdowns
│   ├── modal.js            ← Add/Edit video modal + oEmbed fetch + confirm dialog
│   └── updater.js          ← PWA update detection & in-app update modal
├── lib/
│   └── lucide.min.js       ← Local Lucide icon library (CDN fallback)
├── sw.js                   ← PWA Service Worker (caching strategies)
├── version.json            ← App version for update detection
├── site.webmanifest        ← PWA manifest
└── README.md               ← You are here
```

## 🛠️ Tech Stack

| Technology | Purpose |
|:---:|:---|
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) | Semantic structure with accessibility |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) | Modern layout with CSS custom properties |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) | Vanilla JS — no frameworks |
| ![YouTube API](https://img.shields.io/badge/YouTube_API-FF0000?style=flat-square&logo=youtube&logoColor=white) | IFrame Player API for video playback |
| ![LocalStorage](https://img.shields.io/badge/LocalStorage-000000?style=flat-square&logo=localstorage&logoColor=white) | All data stored client-side |

## 📸 Screenshots

<div align="center">
  <img src="assets/screenshots/desktop-index.png" alt="StudyFlow Desktop Screenshot" width="700" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 16px;">

  <img src="assets/screenshots/mobile-index.png" alt="StudyFlow Mobile Screenshot" width="300" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</div>

---

## 🎯 How It Works

1. **Add a video** — Tap the **+** button and paste a YouTube link
2. **Auto-fetch** — Title and thumbnail are fetched via oEmbed API
3. **Organize** — Assign videos to playlists you create
4. **Watch & Learn** — Click any video to open the distraction-free player
5. **Auto-Resume** — Progress saves every 5 seconds + on tab switch/close; resumes from exact position
6. **Smart Pause** — Video pauses automatically when you leave the app; resumes when you return

## 📲 PWA / Install

StudyFlow is a Progressive Web App. You can install it on your device:

1. Open the app in Chrome/Edge/Safari
2. Click the **Install** button in the address bar (or use browser menu → "Add to Home Screen")
3. The app works offline once installed — all data is stored locally in your browser

## ♿ Accessibility

- Semantic HTML5 with ARIA labels throughout
- Keyboard-navigable interface
- Focus-visible indicators on all interactive elements
- Screen reader announcements for dynamic content
- Sufficient color contrast ratios

## 📄 License

This project is open source. Feel free to use, modify, and share.

---

<div align="center">

Built with ❤️ Starverse [Ayush Gupta]

</div>
