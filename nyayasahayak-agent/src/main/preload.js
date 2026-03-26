/**
 * Preload script — secure bridge between renderer and main process
 * Uses contextBridge to expose only safe APIs to the renderer
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nyaya", {
  // Auth
  login: (params) => ipcRenderer.invoke("login", params),
  logout: () => ipcRenderer.invoke("logout"),

  // State
  getState: () => ipcRenderer.invoke("get-state"),
  getActivity: () => ipcRenderer.invoke("get-activity"),

  // Folders
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  addFolder: (folderPath) => ipcRenderer.invoke("add-folder", folderPath),
  removeFolder: (folderPath) => ipcRenderer.invoke("remove-folder", folderPath),

  // Sync control
  toggleSync: () => ipcRenderer.invoke("toggle-sync"),

  // Navigation
  openWeb: () => ipcRenderer.invoke("open-web"),

  // Settings
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),

  // Events from main process
  onFileSynced: (callback) => {
    ipcRenderer.on("file-synced", (_event, data) => callback(data));
  },
  onSyncError: (callback) => {
    ipcRenderer.on("sync-error", (_event, data) => callback(data));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
