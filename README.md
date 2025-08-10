# Sticky Notes macOS

A beautiful Electron + React desktop sticky notes app for macOS with iOS 16-inspired design.

## Prerequisites

Before building this app, ensure you have the following installed:

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/) or install via Homebrew:
  ```bash
  brew install node
  ```
  
- **Xcode Command Line Tools**: Required for native macOS builds:
  ```bash
  xcode-select --install
  ```

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vijayvleads/sticky-notes-macos.git
   cd sticky-notes-macos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode (optional):**
   ```bash
   npm run dev
   ```
   This starts the app in development mode with hot reloading using Vite + Electron.

4. **Build the macOS installer:**
   ```bash
   npm run build:mac
   ```
   
5. **Find your .dmg file:**
   After the build completes, the installer will be located at:
   ```
   release/
   ```
   Look for a file named something like `sticky-notes-macos-1.0.0.dmg`

## Available Scripts

- `npm install` — Installs all dependencies
- `npm run dev` — Runs the app in development mode (Vite + Electron)
- `npm run build:mac` — Builds the production app and creates a .dmg installer for macOS

## Build Output

The macOS build process creates:
- A `.dmg` installer file in the `release/` directory
- The app bundle is packaged using electron-builder with macOS-specific configurations

## Troubleshooting

### Build Permissions
On first build, macOS may request additional permissions. Allow them as needed when prompted.

### Notarization (Optional)
The app is unsigned by default. If you plan to distribute or install on another Mac with enhanced security settings:

1. **For Distribution**: You'll need an Apple Developer ID certificate
2. **For Local Testing**: You can bypass Gatekeeper by right-clicking the app and selecting "Open"
3. **For Notarization**: Consult the [electron-builder documentation](https://www.electron.build/configuration/mac) or [Apple's notarization guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

### Common Issues

- **Build fails with permission errors**: Ensure Xcode Command Line Tools are properly installed
- **Node version errors**: Verify you're using Node.js 18 or higher with `node --version`
- **Missing dependencies**: Delete `node_modules` and `package-lock.json`, then run `npm install` again

## Project Structure

- `src/` — Source code for Electron main, preload, and renderer processes
- `package.json` — Build scripts and dependencies
- `electron-builder.yml` — macOS build configuration
- `vite.config.ts` — Vite configuration for the renderer process
- `release/` — Output directory for built installers (created after build)

## Tech Stack

- **Electron** — Desktop app framework
- **React** — UI framework
- **TypeScript** — Type-safe JavaScript
- **Vite** — Fast build tool and dev server
- **electron-builder** — App packaging and distribution

## Design

The app features an iOS 16-inspired design with native macOS integration, providing a familiar and beautiful user experience.

---

**Note**: This app is designed specifically for macOS. The build process creates a `.dmg` installer that can be distributed and installed on any compatible Mac.
