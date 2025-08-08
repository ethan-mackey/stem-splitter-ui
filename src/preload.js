// preload.js
const { contextBridge, ipcRenderer } = require("electron");

// Keep your existing window resizing hooks used in App.jsx
contextBridge.exposeInMainWorld("electronAPI", {
  resultsOpened: (panelHeight) =>
    ipcRenderer.send("results-opened", { height: panelHeight }),
  resultsClosed: () => ipcRenderer.send("results-closed"),
});

// New: safe bridge to fetch audio bytes for a YouTube video id
contextBridge.exposeInMainWorld("audioAPI", {
  // Returns: { mime: string, data: ArrayBuffer }
  downloadAudioForVideo: (videoId) =>
    ipcRenderer.invoke("download-audio-for-video", { videoId }),
});
