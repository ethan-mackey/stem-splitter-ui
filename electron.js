// main.js (CommonJS)
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const ytdl = require("ytdl-core");

let win;

// Window sizing constants to match your UI
const PILL_W = 960;
const PILL_H = 78;
const GAP = 24;

function createWindow() {
  win = new BrowserWindow({
    width: PILL_W,
    height: PILL_H,
    minWidth: PILL_W,
    minHeight: PILL_H,
    useContentSize: true,
    frame: false, // no OS chrome
    transparent: true, // let your CSS draw the pill
    resizable: false,
    show: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // DEV/PROD loading (supports Vite dev server if present)
  const devUrl =
    process.env.VITE_DEV_SERVER_URL ||
    process.env.ELECTRON_RENDERER_URL ||
    process.env.ELECTRON_START_URL;

  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    // Adjust if your built index is in another folder (e.g., dist/index.html)
    win.loadFile(path.join(__dirname, "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/**
 * Resize window when results/dashboard open/close.
 * Matches your App.jsx calls to window.electronAPI.
 */
ipcMain.on("results-opened", (_evt, { height }) => {
  const totalHeight = PILL_H + GAP + (height || 0);
  win?.setContentSize(PILL_W, totalHeight);
});

ipcMain.on("results-closed", () => {
  win?.setContentSize(PILL_W, PILL_H);
});

/**
 * Return raw bytes (ArrayBuffer) of the highest-quality audio stream
 * so the renderer can create a Blob and feed WaveSurfer.
 * Called via preload: window.audioAPI.downloadAudioForVideo(videoId)
 */
ipcMain.handle("download-audio-for-video", async (_evt, { videoId }) => {
  if (!videoId) throw new Error("Missing videoId");

  const info = await ytdl.getInfo(videoId);
  const format = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: "audioonly",
  });

  const ext =
    (format.container && `.${format.container}`) ||
    (format.mimeType?.includes("webm") ? ".webm" : ".m4a");

  const mime =
    format.mimeType || (ext === ".webm" ? "audio/webm" : "audio/mp4");

  const tmpPath = path.join(
    os.tmpdir(),
    `yt-audio-${videoId}-${Date.now()}${ext}`
  );

  await new Promise((resolve, reject) => {
    const stream = ytdl.downloadFromInfo(info, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25, // bigger buffer
    });
    const out = fs.createWriteStream(tmpPath);
    stream.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
    stream.on("error", reject);
  });

  const buf = fs.readFileSync(tmpPath);
  try {
    fs.unlinkSync(tmpPath);
  } catch {}

  // Convert Node Buffer -> ArrayBuffer for structured clone back to renderer
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  );

  return { mime, data: arrayBuffer };
});
