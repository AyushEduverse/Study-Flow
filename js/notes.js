/* ========================================
   notes.js — Watch Notes / Bookmarks
   ======================================== */

const Notes = {

  _currentVideoId: null,
  _formOpen: false,

  // ----- Initialize for a video -----

  init(videoId) {
    this._currentVideoId = videoId;
    this._formOpen = false;

    this.render();
    this._bindEvents();
  },

  // ----- Render notes list -----

  render() {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('notes-empty');
    const notes = Storage.getNotesByVideoId(this._currentVideoId);

    list.innerHTML = '';

    if (notes.length === 0) {
      empty.style.display = 'flex';
      list.style.display = 'none';
      if (typeof refreshIcons === 'function') refreshIcons();
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'flex';

    notes.forEach(note => {
      list.appendChild(this._createNoteEl(note));
    });

    if (typeof refreshIcons === 'function') refreshIcons();
  },

  _createNoteEl(note) {
    const el = document.createElement('div');
    el.className = 'note-item';
    el.dataset.noteId = note.id;

    el.innerHTML = `
      <button class="note-timestamp" data-seek="${note.timestamp}" aria-label="Seek to ${this._fmtTime(note.timestamp)}">
        <i data-lucide="play" aria-hidden="true"></i>
        ${this._fmtTime(note.timestamp)}
      </button>
      <div class="note-content">
        <p class="note-text">${escapeHtml(note.text)}</p>
      </div>
      <button class="note-delete" data-delete="${note.id}" aria-label="Delete note">
        <i data-lucide="trash-2" aria-hidden="true"></i>
      </button>
    `;

    return el;
  },

  // ----- Bind events -----

  _bindEvents() {
    // Add Note button
    const addBtn = document.getElementById('add-note-btn');
    addBtn.onclick = () => this.openForm();

    // Close form
    const closeBtn = document.getElementById('note-form-close');
    closeBtn.onclick = () => this.closeForm();

    // Overlay click to close
    const overlay = document.getElementById('note-form-overlay');
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeForm();
    };

    // Save note
    const saveBtn = document.getElementById('note-form-save');
    saveBtn.onclick = () => this.saveNote();

    // Enter key in textarea (Ctrl+Enter or Cmd+Enter to save)
    const textarea = document.getElementById('note-form-text');
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.saveNote();
      }
    };

    // Delegate: seek and delete clicks in notes list
    const list = document.getElementById('notes-list');
    list.onclick = (e) => {
      const seekBtn = e.target.closest('[data-seek]');
      if (seekBtn) {
        const time = parseInt(seekBtn.dataset.seek, 10);
        this._seekTo(time);
        return;
      }

      const deleteBtn = e.target.closest('[data-delete]');
      if (deleteBtn) {
        this.deleteNote(deleteBtn.dataset.delete);
      }
    };
  },

  // ----- Open / Close form -----

  openForm() {
    const overlay = document.getElementById('note-form-overlay');
    const timestamp = document.getElementById('note-form-timestamp');
    const textarea = document.getElementById('note-form-text');

    // Get current playback time
    const currentTime = this._getCurrentTime();
    timestamp.textContent = this._fmtTime(currentTime);

    textarea.value = '';
    overlay.style.display = 'flex';
    this._formOpen = true;

    // Focus textarea after animation
    setTimeout(() => textarea.focus(), 300);

    if (typeof refreshIcons === 'function') refreshIcons();
  },

  closeForm() {
    const overlay = document.getElementById('note-form-overlay');
    overlay.style.display = 'none';
    this._formOpen = false;
  },

  // ----- Save note -----

  saveNote() {
    const textarea = document.getElementById('note-form-text');
    const text = textarea.value.trim();

    if (!text) {
      textarea.focus();
      return;
    }

    const currentTime = this._getCurrentTime();

    const note = {
      id: generateId(),
      videoId: this._currentVideoId,
      timestamp: currentTime,
      text: text,
      createdAt: new Date().toISOString()
    };

    Storage.saveNote(note);
    this.closeForm();
    this.render();
    showToast('Note saved at ' + this._fmtTime(currentTime));
  },

  // ----- Delete note -----

  deleteNote(id) {
    if (typeof ConfirmDialog !== 'undefined' && ConfirmDialog.show) {
      ConfirmDialog.show({
        title: 'Delete Note',
        message: 'This note will be permanently deleted.',
        confirmText: 'Delete',
        onConfirm: () => {
          Storage.deleteNote(id);
          this.render();
          showToast('Note deleted');
        }
      });
    } else {
      Storage.deleteNote(id);
      this.render();
      showToast('Note deleted');
    }
  },

  // ----- Seek video to timestamp -----

  _seekTo(seconds) {
    if (typeof Player !== 'undefined' && Player.ytPlayer && Player.ytPlayer.seekTo) {
      Player.ytPlayer.seekTo(seconds, true);
      Player.ytPlayer.playVideo();
    }
  },

  // ----- Get current playback time -----

  _getCurrentTime() {
    if (typeof Player !== 'undefined' && Player.ytPlayer && Player.ytPlayer.getCurrentTime) {
      return Math.floor(Player.ytPlayer.getCurrentTime());
    }
    return 0;
  },

  // ----- Format seconds to mm:ss or h:mm:ss -----

  _fmtTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => n.toString().padStart(2, '0');

    if (h > 0) {
      return h + ':' + pad(m) + ':' + pad(s);
    }
    return m + ':' + pad(s);
  },

  // ----- Cleanup -----

  destroy() {
    this._currentVideoId = null;
    this._formOpen = false;
  }
};
