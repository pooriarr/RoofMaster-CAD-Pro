const { contextBridge, ipcRenderer } = require('electron');

const isMac = process.platform === 'darwin';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isMac,
  version: process.versions.electron,
  onAppAction: (callback) => {
    const subscription = (_event, action, data) => callback(action, data);
    ipcRenderer.on('app-action', subscription);
    return () => ipcRenderer.removeListener('app-action', subscription);
  },
  sendAction: (action, data) => {
    ipcRenderer.send('app-action', { action, data });
  },
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (content, defaultName) => ipcRenderer.invoke('dialog:saveFile', { content, defaultName }),
});
