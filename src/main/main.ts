import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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

class StickyNotesApp {
  private windows: Map<string, BrowserWindow> = new Map();
  private notesFilePath: string;

  constructor() {
    this.notesFilePath = path.join(app.getPath('userData'), 'notes.json');
    this.setupApp();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createMenu();
      this.setupIpcHandlers();
      this.loadAndDisplayNotes();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createNewNote();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.saveAllNotes();
    });
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Note',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.createNewNote()
          },
          {
            label: 'Close Note',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.saveAllNotes();
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          {
            label: 'Always on Top',
            type: 'checkbox',
            checked: true,
            click: (menuItem, browserWindow) => {
              if (browserWindow) {
                browserWindow.setAlwaysOnTop(menuItem.checked);
              }
            }
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('save-note', async (event, note: StickyNote) => {
      await this.saveNote(note);
    });

    ipcMain.handle('delete-note', async (event, noteId: string) => {
      await this.deleteNote(noteId);
    });

    ipcMain.handle('get-note', async (event, noteId: string) => {
      return this.getNote(noteId);
    });

    ipcMain.handle('create-new-note', async () => {
      return this.createNewNote();
    });
  }

  private createNewNote(existingNote?: StickyNote): BrowserWindow {
    const noteId = existingNote?.id || this.generateId();
    
    const window = new BrowserWindow({
      width: existingNote?.width || 300,
      height: existingNote?.height || 200,
      x: existingNote?.x || undefined,
      y: existingNote?.y || undefined,
      minWidth: 200,
      minHeight: 100,
      frame: false,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 10, y: 10 },
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        webSecurity: false
      }
    });

    // Load the renderer
    if (app.isPackaged) {
      window.loadFile(path.join(__dirname, '../renderer/index.html'));
    } else {
      window.loadURL('http://localhost:5173');
    }

    // Set note ID
    window.webContents.once('did-finish-load', () => {
      window.webContents.send('note-id', noteId);
      if (existingNote) {
        window.webContents.send('load-note', existingNote);
      }
    });

    // Handle window events
    window.on('closed', () => {
      this.windows.delete(noteId);
    });

    window.on('moved', () => {
      this.saveWindowState(noteId, window);
    });

    window.on('resized', () => {
      this.saveWindowState(noteId, window);
    });

    // Prevent external links from opening in the app
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.windows.set(noteId, window);
    return window;
  }

  private async saveWindowState(noteId: string, window: BrowserWindow): Promise<void> {
    const bounds = window.getBounds();
    const notes = await this.loadNotes();
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex !== -1) {
      notes[noteIndex].x = bounds.x;
      notes[noteIndex].y = bounds.y;
      notes[noteIndex].width = bounds.width;
      notes[noteIndex].height = bounds.height;
      notes[noteIndex].updated = new Date().toISOString();
      await this.saveNotes(notes);
    }
  }

  private async saveNote(note: StickyNote): Promise<void> {
    const notes = await this.loadNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    if (existingIndex !== -1) {
      notes[existingIndex] = { ...notes[existingIndex], ...note, updated: new Date().toISOString() };
    } else {
      note.created = new Date().toISOString();
      note.updated = new Date().toISOString();
      notes.push(note);
    }
    
    await this.saveNotes(notes);
  }

  private async deleteNote(noteId: string): Promise<void> {
    const notes = await this.loadNotes();
    const filteredNotes = notes.filter(n => n.id !== noteId);
    await this.saveNotes(filteredNotes);
    
    const window = this.windows.get(noteId);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  private getNote(noteId: string): StickyNote | undefined {
    const notes = this.loadNotesSync();
    return notes.find(n => n.id === noteId);
  }

  private async loadNotes(): Promise<StickyNote[]> {
    try {
      if (fs.existsSync(this.notesFilePath)) {
        const data = await fs.promises.readFile(this.notesFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
    return [];
  }

  private loadNotesSync(): StickyNote[] {
    try {
      if (fs.existsSync(this.notesFilePath)) {
        const data = fs.readFileSync(this.notesFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
    return [];
  }

  private async saveNotes(notes: StickyNote[]): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      await fs.promises.writeFile(this.notesFilePath, JSON.stringify(notes, null, 2));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }

  private async saveAllNotes(): Promise<void> {
    const notes = await this.loadNotes();
    for (const [noteId, window] of this.windows) {
      if (!window.isDestroyed()) {
        const bounds = window.getBounds();
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
          notes[noteIndex].x = bounds.x;
          notes[noteIndex].y = bounds.y;
          notes[noteIndex].width = bounds.width;
          notes[noteIndex].height = bounds.height;
          notes[noteIndex].updated = new Date().toISOString();
        }
      }
    }
    await this.saveNotes(notes);
  }

  private async loadAndDisplayNotes(): Promise<void> {
    const notes = await this.loadNotes();
    if (notes.length === 0) {
      this.createNewNote();
    } else {
      notes.forEach(note => {
        this.createNewNote(note);
      });
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the app
new StickyNotesApp();
