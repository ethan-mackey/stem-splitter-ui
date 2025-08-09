// electron.js (CommonJS)
//
// This file sets up the Electron main process.  It creates the BrowserWindow
// for the React UI and exposes IPC handlers for downloading audio from
// YouTube.  Two IPC commands are provided:
//
//  - download-audio-for-video: returns raw audio bytes for a given YouTube
//    video ID.  The renderer calls this to obtain a Blob for WaveSurfer.
//
//  - download-audio-to-file: downloads audio and saves it into the user's
//    Downloads folder.  This is useful when a persistent file is needed for
//    further processing (e.g. splitting into stems).

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
    frame: false,
    transparent: true,
    resizable: false,
    show: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // expose APIs to renderer
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl =
    process.env.VITE_DEV_SERVER_URL ||
    process.env.ELECTRON_RENDERER_URL ||
    process.env.ELECTRON_START_URL;

  if (devUrl) {
    win.loadURL(devUrl);
  } else {
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
  // On macOS it is common for applications to stay open until the user quits
  if (process.platform !== "darwin") app.quit();
});

// Resize window when results/dashboard open/close
ipcMain.on("results-opened", (_evt, { height }) => {
  const totalHeight = PILL_H + GAP + (height || 0);
  win?.setContentSize(PILL_W, totalHeight);
});
ipcMain.on("results-closed", () => {
  win?.setContentSize(PILL_W, PILL_H);
});

// Helper to download the highest-quality audio stream for a given videoId
async function downloadAudioInfo(videoId) {
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
  return { info, format, ext, mime };
}

// Return raw bytes of the highest-quality audio stream (ytdl-core)
ipcMain.handle("download-audio-for-video", async (_evt, { videoId }) => {
  if (!videoId) throw new Error("Missing videoId");
  const { info, ext, mime } = await downloadAudioInfo(videoId);

  // Write to a temporary file first, then read back into memory
  const tmpPath = path.join(
    os.tmpdir(),
    `yt-audio-${videoId}-${Date.now()}${ext}`
  );
  await new Promise((resolve, reject) => {
    const stream = ytdl.downloadFromInfo(info, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
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
  } catch {
    /* ignore temp cleanup errors */
  }
  // Slice the underlying buffer so that we return only the used portion
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  );
  return { mime, data: arrayBuffer };
});

// Download audio and write it to the user's downloads folder.  Returns the
// absolute file path and mime type.  This is useful when further processing
// (such as stem splitting) needs a persistent file on disk.
ipcMain.handle("download-audio-to-file", async (_evt, { videoId }) => {
  if (!videoId) throw new Error("Missing videoId");
  const { info, ext, mime } = await downloadAudioInfo(videoId);
  const fileName = `yt-audio-${videoId}-${Date.now()}${ext}`;
  const filePath = path.join(app.getPath("downloads"), fileName);
  await new Promise((resolve, reject) => {
    const stream = ytdl.downloadFromInfo(info, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25,
    });
    const out = fs.createWriteStream(filePath);
    stream.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject);
    stream.on("error", reject);
  });
  return { filePath, mime };
});
