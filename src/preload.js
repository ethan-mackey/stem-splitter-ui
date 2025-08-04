// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  resultsOpened: (panelHeight) =>
    ipcRenderer.send("results-opened", panelHeight),
  resultsClosed: () => ipcRenderer.send("results-closed"),
});
