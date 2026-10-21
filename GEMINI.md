# MAGNItola — Project Overview & AI Agent Guidelines

`GEMINI.md` serves as the primary context and operating rules file for AI assistants working in this repository.

---

## 1. Project Overview

**MAGNItola** is a specialized desktop application for Windows x64 designed as a SoundCloud music and metadata downloader paired with a built-in offline audio player with ID3v2.3 tagging capabilities.

- **Target Platform**: Windows x64
- **Application Type**: Desktop App (Electron)
- **Primary Features**:
  - SoundCloud track, playlist, and user likes downloader.
  - Client-side MP3 conversion (192 kbps CBR) using libmp3lame.
  - Automatic ID3v2.3 metadata tagging (title, artist, album, track number, embedded cover art).
  - Built-in offline audio player with seeking and playlist management.
  - Ephemeral user session handling (leaves no permanent cache/data traces).
  - Retro Win95 / cassette-deck tactical green user interface with bilingual RU/EN support.

---

## 2. Tech Stack & Dependencies

- **Runtime**: Node.js & Electron (`^33.2.0`)
- **Packaging & Build**: `electron-builder` (`^25.1.8`)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (No React/Vue/external UI frameworks)
- **Audio Encoding**: `lame.min.js` (libmp3lame JavaScript port)
- **License**: MIT

---

## 3. Essential Commands & Workflows

Always execute commands from the project root (repository root):

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Install Dependencies** | `npm install` | Installs devDependencies (`electron`, `electron-builder`) |
| **Run in Dev Mode** | `npm start` | Launches Electron (`electron .`) |
| **Build for Production** | `npm run build` | Builds `dist/MAGNItola-Windows.zip` (Windows x64 zip target) |
| **Build (Windows CLI)** | `npm.cmd run build` | Recommended syntax when running in PowerShell / Windows cmd |

---

## 4. Architecture & Codebase Map

The project follows a clean, minimalist Electron architecture separating Main and Renderer processes:

```
magnitola/
├── .github/
│   └── workflows/
│       └── build.yml     # Automated Windows x64 build & GitHub release workflow
├── package.json          # Project configuration, scripts, builder config
├── package-lock.json     # Locked dependency tree
├── main.js               # Electron Main Process (Lifecycle, IPC, Media Protocol, Security)
├── preload.js            # Secure IPC bridge between Main and Renderer
├── index.html            # Complete Renderer Process (UI Layout, Styles, Logic, Player)
├── lame.min.js           # Client-side MP3 encoder library
├── demopic.jpg           # Application screenshot for documentation
├── magnitolalogo.jpg     # Application logo
├── synclinelogo.jpg      # Secondary branding
├── ru.png / us.png       # Language toggle flags
├── icon.ico              # App executable & window icon
├── README.md             # Public project documentation (EN/RU)
└── GEMINI.md             # AI Agent rules, architecture reference & workflows
```

### File Breakdown

- **`.github/workflows/build.yml`**: GitHub Actions workflow that triggers on tags (`v*`) or manual dispatch to build `MAGNItola-Windows.zip` and publish a GitHub release.
- **`main.js` (Main Process)**:
  - **Single Instance**: Enforces single-instance lock via `app.requestSingleInstanceLock()`.
  - **Ephemeral Session**: Creates isolated temp directory in `os.tmpdir()` (`magnitola-session-${pid}`) and cleans up on exit (`will-quit` and startup cleanup of stale folders). Disables disk cache and GPU shader caches.
  - **Privileged Protocol `media://`**: Maps requests to local files with streaming support (`Range` headers for byte-seeking) and MIME type checking (`ALLOWED_MEDIA_MIMES`). Prohibits direct access to unauthorized paths.
  - **IPC Handlers**:
    - `get-default-downloads`: Resolves system Downloads directory.
    - `select-folder`: Native folder picker dialog.
    - `save-track`: Saves downloaded audio buffer and embedded metadata to disk.
    - `scan-library`: Recursively scans user folder for local audio tracks (.mp3, .wav, .ogg, .flac, .m4a, .aac, .opus) for the player.
    - `read-clipboard`: Safely reads system clipboard.
    - `check-file-exists`: Verifies file presence on disk.
  - **Window Hardening**: Blocks window creation, denies navigation outside `index.html`, opens external `https://` URLs strictly via system default browser (`shell.openExternal`), disables DevTools in packaged build.

- **`preload.js` (Bridge)**:
  - Exposes `electronAPI` in `window` via `contextBridge.exposeInMainWorld()`.
  - Renderer cannot directly invoke Node.js or `ipcRenderer` outside of exposed methods.

- **`index.html` (Renderer Process)**:
  - Contains complete styling, UI structure, and client scripts.
  - **Audio Player Engine**: HTML5 `<audio>` playback using `media://` URLs, seekbar progress, track queue management.
  - **SoundCloud Integration**: API endpoint communication for resolving tracks, sets, and user likes; stream chunk downloading.
  - **MP3 Encoder & Tagger**: Feeds raw audio frames into `lame.min.js` and synthesizes ID3v2.3 tag headers with APIC cover frames before saving.
  - **Localization Engine**: `LOCALES` dictionary supporting instant switching between Russian (`ru`) and English (`en`).

---

## 5. Security & Isolation Constraints

Any agent modifying this codebase **must strictly adhere** to these security requirements:

1. **Context Isolation & Sandboxing**:
   - `nodeIntegration: false` must NEVER be changed to `true`.
   - `contextIsolation: true` and `sandbox: true` are mandatory.
   - Never expose raw `ipcRenderer` or `child_process` to the renderer.
2. **Content Security Policy (CSP)**:
   - `index.html` has a strict CSP. Do not introduce inline `eval()`, external scripts from CDNs, or unsafe protocol sources.
   - Allowed sources: `script-src 'self' 'unsafe-inline'`, `img-src 'self' data: https: media:`, `media-src 'self' media: data:`, `connect-src https:`.
3. **Local File Access**:
   - The renderer must **never** use `file://` URLs. Always use `media://local/${encodeURIComponent(filePath)}` for streaming local tracks or covers.

---

## 6. UI & Design System Guidelines

- **Theme**: Tactile, militaristic, retro audio deck aesthetic inspired by late-90s hardware and industrial Win95 panels.
- **Strict Styling Rules**:
  - `border-radius: 0 !important` across all UI elements (buttons, inputs, panels, progress bars). No rounded modern borders.
  - No blurred glassmorphism, no drop shadows (`box-shadow: none !important; backdrop-filter: none !important;`).
  - Colors are strictly governed by CSS variables in `:root`:
    - Canvas / Background: `--bg-main: #4c5844`, `--bg-header: #3b4435`, `--bg-dark: #282e22`, `--bg-panel: #242a20`, `--bg-input: #1c2219`
    - Borders: `--border-highlight: #6b7c61`, `--border-shadow: #1e2419`, `--border-light: #5d6d53`, `--border-dark: #171c14`
    - Text: `--text-main: #d0dcce`, `--text-bright: #ffffff`, `--text-muted: #8c9c86`
    - Accents: `--green-bar: #95c34e` (progress), `--accent-gold: #e2c174` (warnings/active), `--accent-red: #d15656` (errors/stop)
- **Localization**:
  - Any new UI text or status message **must** be added to both `ru` and `en` blocks in the `LOCALES` object inside `index.html`.

---

## 7. Guidelines for AI Agents Working on this Codebase

- **Single-file Renderer**: `index.html` houses the entire renderer logic. Maintain modularity with clearly demarcated sections and comments when editing.
- **IPC Modifications**: If adding a new feature requiring OS capabilities (file IO, dialogs, clipboard, etc.):
  1. Implement handler in `main.js` inside `registerIpcHandlers()` with sender validation (`isTrustedSender`).
  2. Expose the function in `preload.js` under `window.electronAPI`.
  3. Call `window.electronAPI.<method>()` in `index.html`.
- **Packaging Verification**: Always ensure relative paths for assets (`icon.ico`, images, `lame.min.js`) so that `electron-builder` packs them cleanly into `dist/`.
