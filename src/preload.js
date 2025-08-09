// preload.js (CommonJS)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  resultsOpened: (panelHeight) =>
    ipcRenderer.send("results-opened", { height: panelHeight }),
  resultsClosed: () => ipcRenderer.send("results-closed"),
});

contextBridge.exposeInMainWorld("audioAPI", {
  // Returns: { mime: string, data: ArrayBuffer }
  downloadAudioForVideo: (videoId) =>
    ipcRenderer.invoke("download-audio-for-video", { videoId }),
});
