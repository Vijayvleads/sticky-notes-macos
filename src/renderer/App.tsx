import React, { useState, useEffect, useCallback } from 'react';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  created: string;
  updated: string;
  alwaysOnTop: boolean;
}

interface ExtendedElectronAPI {
  // Existing API methods
  saveNote: (note: StickyNote) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  getNote: (noteId: string) => Promise<StickyNote | undefined>;
  createNewNote: () => Promise<void>;
  onNoteId: (callback: (noteId: string) => void) => void;
  onLoadNote: (callback: (note: StickyNote) => void) => void;
  removeAllListeners: (channel: string) => void;
  // Extended API methods needed for main UI
  loadNotes: () => Promise<StickyNote[]>;
  updateNote: (note: StickyNote) => Promise<void>;
  toggleAlwaysOnTop: (noteId: string, alwaysOnTop: boolean) => Promise<void>;
  openNoteWindow: (noteId: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ExtendedElectronAPI;
  }
}

const COLORS = [
  { name: 'Yellow', value: '#ffff88' },
  { name: 'Pink', value: '#ffb3ba' },
  { name: 'Green', value: '#bae1b3' },
  { name: 'Blue', value: '#bae1ff' },
  { name: 'Orange', value: '#ffdfba' },
  { name: 'Purple', value: '#e1baff' }
];

const App: React.FC = () => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<StickyNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  // Load notes on component mount
  useEffect(() => {
    const loadAllNotes = async () => {
      try {
        if (window.electronAPI?.loadNotes) {
          const loadedNotes = await window.electronAPI.loadNotes();
          setNotes(loadedNotes);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllNotes();
  }, []);

  // Debounced auto-save function
  const debouncedSave = useCallback((note: StickyNote) => {
    // Clear existing timeout for this note
    if (saveTimeouts[note.id]) {
      clearTimeout(saveTimeouts[note.id]);
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        if (window.electronAPI?.updateNote) {
          await window.electronAPI.updateNote(note);
        }
        setSaveTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[note.id];
          return newTimeouts;
        });
      } catch (error) {
        console.error('Failed to save note:', error);
      }
    }, 500); // 500ms debounce

    setSaveTimeouts(prev => ({
      ...prev,
      [note.id]: timeoutId
    }));
  }, [saveTimeouts]);

  // Create new note
  const handleCreateNote = async () => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      color: COLORS[0].value,
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      alwaysOnTop: false
    };

    try {
      if (window.electronAPI?.saveNote) {
        await window.electronAPI.saveNote(newNote);
        setNotes(prev => [...prev, newNote]);
        setSelectedNote(newNote);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      if (window.electronAPI?.deleteNote) {
        await window.electronAPI.deleteNote(noteId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Update note and trigger auto-save
  const handleUpdateNote = (updatedNote: StickyNote) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    setSelectedNote(updatedNote);
    debouncedSave(updatedNote);
  };

  // Toggle always on top
  const handleToggleAlwaysOnTop = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedNote = { ...note, alwaysOnTop: !note.alwaysOnTop };
    
    try {
      if (window.electronAPI?.toggleAlwaysOnTop) {
        await window.electronAPI.toggleAlwaysOnTop(noteId, updatedNote.alwaysOnTop);
        handleUpdateNote(updatedNote);
      }
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  };

  // Open note in floating window
  const handleOpenNoteWindow = async (noteId: string) => {
    try {
      if (window.electronAPI?.openNoteWindow) {
        await window.electronAPI.openNoteWindow(noteId);
      }
    } catch (error) {
      console.error('Failed to open note window:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Sticky Notes</h1>
          <button 
            className="btn btn-primary"
            onClick={handleCreateNote}
            title="Create new note"
          >
            + New Note
          </button>
        </div>
        
        <div className="notes-list">
          {notes.length === 0 ? (
            <p className="no-notes">No notes yet. Create your first note!</p>
          ) : (
            notes.map(note => (
              <div 
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => setSelectedNote(note)}
                style={{ borderLeft: `4px solid ${note.color}` }}
              >
                <div className="note-item-header">
                  <h3 className="note-title">
                    {note.title || 'Untitled'}
                  </h3>
                  <button 
                    className="btn-icon delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    title="Delete note"
                  >
                    ×
                  </button>
                </div>
                <p className="note-preview">
                  {note.content.slice(0, 50)}{note.content.length > 50 ? '...' : ''}
                </p>
                <div className="note-item-actions">
                  <button
                    className={`btn-icon ${note.alwaysOnTop ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAlwaysOnTop(note.id);
                    }}
                    title="Toggle always on top"
                  >
                    📌
                  </button>
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNoteWindow(note.id);
                    }}
                    title="Open in floating window"
                  >
                    🗗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="main-content">
        {selectedNote ? (
          <div className="note-editor">
            <div className="note-editor-header">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleUpdateNote({
                  ...selectedNote,
                  title: e.target.value,
                  updated: new Date().toISOString()
                })}
                placeholder="Note title"
                className="title-input"
              />
              
              <div className="color-picker">
                <label>Color:</label>
                <div className="color-options">
                  {COLORS.map(color => (
                    <button
                      key={color.name}
                      className={`color-option ${selectedNote.color === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleUpdateNote({
                        ...selectedNote,
                        color: color.value,
                        updated: new Date().toISOString()
                      })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <textarea
              value={selectedNote.content}
              onChange={(e) => handleUpdateNote({
                ...selectedNote,
                content: e.target.value,
                updated: new Date().toISOString()
              })}
              placeholder="Start writing..."
              className="content-textarea"
            />

            <div className="note-editor-footer">
              <div className="note-info">
                Created: {new Date(selectedNote.created).toLocaleDateString()}<br/>
                Updated: {new Date(selectedNote.updated).toLocaleDateString()}
              </div>
              
              <div className="note-actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedNote.alwaysOnTop}
                    onChange={() => handleToggleAlwaysOnTop(selectedNote.id)}
                  />
                  Always on top
                </label>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => handleOpenNoteWindow(selectedNote.id)}
                >
                  Open as Floating Window
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-selection">
            <h2>Select a note to edit</h2>
            <p>Choose a note from the sidebar or create a new one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
