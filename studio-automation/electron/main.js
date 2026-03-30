const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    title: 'Studio Automation',
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── vMix IPC handlers ──────────────────────────────────────────────────────
const vmixApi = require('./vmix/vmixApi');

ipcMain.handle('vmix:connect', async (_e, { host, port }) => {
  return vmixApi.connect(host, port);
});

ipcMain.handle('vmix:disconnect', async () => {
  return vmixApi.disconnect();
});

ipcMain.handle('vmix:send', async (_e, command) => {
  return vmixApi.sendCommand(command);
});

ipcMain.handle('vmix:getState', async () => {
  return vmixApi.getState();
});

// Forward vMix events to renderer
vmixApi.on('state', (state) => {
  if (mainWindow) mainWindow.webContents.send('vmix:state', state);
});

vmixApi.on('tally', (tally) => {
  if (mainWindow) mainWindow.webContents.send('vmix:tally', tally);
});

vmixApi.on('connected', () => {
  if (mainWindow) mainWindow.webContents.send('vmix:connected');
});

vmixApi.on('disconnected', () => {
  if (mainWindow) mainWindow.webContents.send('vmix:disconnected');
});
