const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true }
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:3000");
  } else {
    const indexPath = path.join(process.resourcesPath, "app-web", "index.html");
    if (fs.existsSync(indexPath)) win.loadFile(indexPath);
    else win.loadURL("https://example.invalid/");
  }

  win.removeMenu?.();
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
