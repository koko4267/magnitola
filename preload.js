const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultDownloadsFolder: () => ipcRenderer.invoke('get-default-downloads'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveTrack: (payload) => ipcRenderer.invoke('save-track', payload),
  scanLibrary: (folder) => ipcRenderer.invoke('scan-library', folder),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  checkFileExists: (payload) => ipcRenderer.invoke('check-file-exists', payload),
  ensureFolder: (payload) => ipcRenderer.invoke('ensure-folder', payload)
});
