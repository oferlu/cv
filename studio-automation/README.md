# Studio Automation

Broadcast studio automation software. Controls vMix and other devices.

## Tech Stack
- **Electron** — desktop shell, native OS integration
- **React 18** — UI
- **Zustand** — state management
- **electron-builder** — Windows installer (.exe / NSIS)

## Project Structure

```
electron/
  main.js          — Electron main process, window creation
  preload.js       — Context bridge (secure IPC)
  vmix/
    vmixApi.js     — vMix TCP + HTTP API client

src/
  App.jsx
  store/index.js   — Global state (Zustand)
  components/
    TopBar/        — Show clock, countdown, vMix connection status
    Timeline/      — Multi-track rundown timeline
    BottomPanels/
      DevicePanel/ — Connected devices list
      AudioPanel/  — Faders + meters
      MediaLibrary/— Clip browser
```

## Getting Started

```bash
npm install
npm start          # dev mode (React + Electron together)
npm run build:win  # produce Windows installer in /dist
```

## vMix Connection
Default: `127.0.0.1:8099` (TCP) and `:8088` (HTTP API).
Configure in the TopBar connection dialog.
