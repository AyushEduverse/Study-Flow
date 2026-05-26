---
name: StudyFlow PWA Update System
description: Design spec for in-app PWA update detection and notification system
type: project
---

# StudyFlow PWA Update System — Design Spec

## Overview

Service Worker-based update detection for the StudyFlow PWA. When a new version is deployed (new cache version in sw.js), the SW detects it, notifies the page, and a bottom-sheet modal prompts the user to update.

## Architecture

**Detection:** SW lifecycle — new SW installs, enters waiting state (does NOT skipWaiting), sends UPDATE_AVAILABLE message to clients.

**UI:** Bottom-sheet modal matching existing StudyFlow design system (same pattern as #modal-overlay, #playlist-create-overlay).

**Activation:** Page sends SKIP_WAITING → SW activates → controllerchange event → page reloads.

## Flow

1. User visits app → existing SW is active
2. Browser fetches sw.js → finds new version → installs new SW → enters waiting
3. Waiting SW postMessage({ type: 'UPDATE_AVAILABLE' }) to all clients
4. UpdateManager receives message → shows update modal (unless dismissed this session)
5. "Update Now" → sends SKIP_WAITING to SW → SW activates → page reloads
6. "Later" → sessionStorage flag → won't re-show this session

## Files

- **js/updater.js** — UpdateManager singleton
- **css/updater.css** — Modal styles (design system match)
- **sw.js** — Modified: remove unconditional skipWaiting, add message listener
- **index.html** — Modified: include new CSS/JS, add modal HTML

## Design Language

- Overlay: same as #modal-overlay (rgba backdrop + blur)
- Sheet: slide-up animation, rounded top corners
- Typography: Poppins, same sizing as existing modals
- Icon: Lucide download-cloud
- Primary button: gradient blue (same as #playlist-create-confirm)
- Secondary button: outline style

## Decisions

- No version.json — pure SW file-change detection
- No release notes — keep it simple
- No force update — always optional
- sessionStorage for "Later" — resets on next session (re-prompt)
