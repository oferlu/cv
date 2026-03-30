const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to the React renderer via window.studioAPI
contextBridge.exposeInMainWorld('studioAPI', {
  vmix: {
    connect: (host, port) => ipcRenderer.invoke('vmix:connect', { host, port }),
    disconnect: () => ipcRenderer.invoke('vmix:disconnect'),
    send: (command) => ipcRenderer.invoke('vmix:send', command),
    getState: () => ipcRenderer.invoke('vmix:getState'),
    onState: (cb) => ipcRenderer.on('vmix:state', (_e, s) => cb(s)),
    onTally: (cb) => ipcRenderer.on('vmix:tally', (_e, t) => cb(t)),
    onConnected: (cb) => ipcRenderer.on('vmix:connected', cb),
    onDisconnected: (cb) => ipcRenderer.on('vmix:disconnected', cb),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
});
