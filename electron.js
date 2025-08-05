// electron.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let win; // make it visible to the IPC handlers

const PANEL_HEIGHT = 1004;
const DASHBOARD_HEIGHT = 800;

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 78, // just the pill height to start
    useContentSize: true, // sizes refer to webContents, not outer frame
    frame: false, // no close/min/max UI
    transparent: true, // no window background
    hasShadow: false,
    resizable: false,
    backgroundColor: "#00000000", // fully transparent
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"), // <-- the bridge
    },
  });

  // Remove vibrancy for true transparency
  win.setBackgroundColor("#00000000");

  // DEV: CRA on port 3000; change if you use Vite or file:// build
  const startURL = process.env.ELECTRON_START_URL || "http://localhost:3000";

  win.loadURL(startURL);

  // ----- IPC handlers: this is the part you asked about -----
  // Renderer tells us to grow the window (pill + gap + panelHeight)
  ipcMain.on("results-opened", (_evt, panelHeight) => {
    const pill = 78;
    const gap = 24;
    win.setContentSize(960, pill + gap + Number(panelHeight || 0));
  });

  // Renderer tells us to shrink back to pill-only
  ipcMain.on("results-closed", () => {
    win.setContentSize(960, 78);
  });
  // ----------------------------------------------------------
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
