const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  holyricsRequest: (url, body) => ipcRenderer.invoke('holyrics-request', url, body),
  ollamaRequest: (url, method, body) => ipcRenderer.invoke('ollama-request', url, method, body),
});
