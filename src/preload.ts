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
  saveNote: (note: StickyNote) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  getNote: (noteId: string) => Promise<StickyNote | undefined>;
  createNewNote: () => Promise<void>;
  onNoteId: (callback: (noteId: string) => void) => void;
  onLoadNote: (callback: (note: StickyNote) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveNote: (note: StickyNote) => ipcRenderer.invoke('save-note', note),
  deleteNote: (noteId: string) => ipcRenderer.invoke('delete-note', noteId),
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
