const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
});
