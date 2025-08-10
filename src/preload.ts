import { contextBridge, ipcRenderer } from 'electron';

interface StickyNote {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  created: string;
  updated: string;
}

interface ElectronAPI {
  // CRUD operations
  loadNotes: () => Promise<StickyNote[]>;
  createNote: (note: Partial<StickyNote>) => Promise<StickyNote>;
  updateNote: (id: string, note: Partial<StickyNote>) => Promise<StickyNote>;
  deleteNote: (noteId: string) => Promise<void>;
  
  // Window operations
  toggleAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
  openNoteWindow: (noteId?: string) => Promise<void>;
  saveAll: () => Promise<void>;
  
  // Legacy API for backward compatibility
  saveNote: (note: StickyNote) => Promise<void>;
  getNote: (noteId: string) => Promise<StickyNote | undefined>;
  createNewNote: () => Promise<void>;
  
  // Event listeners
  onNoteId: (callback: (noteId: string) => void) => void;
  onLoadNote: (callback: (note: StickyNote) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // CRUD operations using ipcRenderer.invoke channels
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  createNote: (note: Partial<StickyNote>) => ipcRenderer.invoke('create-note', note),
  updateNote: (id: string, note: Partial<StickyNote>) => ipcRenderer.invoke('update-note', id, note),
  deleteNote: (noteId: string) => ipcRenderer.invoke('delete-note', noteId),
  
  // Window operations
  toggleAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('toggle-always-on-top', alwaysOnTop),
  openNoteWindow: (noteId?: string) => ipcRenderer.invoke('open-note-window', noteId),
  saveAll: () => ipcRenderer.invoke('save-all'),
  
  // Legacy API for backward compatibility
  saveNote: (note: StickyNote) => ipcRenderer.invoke('save-note', note),
  getNote: (noteId: string) => ipcRenderer.invoke('get-note', noteId),
  createNewNote: () => ipcRenderer.invoke('create-new-note'),
  
  // Event listeners
  onNoteId: (callback: (noteId: string) => void) => {
    ipcRenderer.on('note-id', (_, noteId) => callback(noteId));
  },
  
  onLoadNote: (callback: (note: StickyNote) => void) => {
    ipcRenderer.on('load-note', (_, note) => callback(note));
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
} as ElectronAPI);

// Declare global interface for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
