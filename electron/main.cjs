const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
let parseChild = null;
let mainWindow = null;

function startParseServer() {
  const script = path.join(ROOT, "scripts", "parse-server.mjs");
  parseChild = spawn("node", [script], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env },
    shell: process.platform === "win32",
  });
  parseChild.on("error", (err) => {
    console.error("parse-server failed to start:", err.message);
  });
}

function stopParseServer() {
  if (parseChild && !parseChild.killed) {
    parseChild.kill("SIGTERM");
    parseChild = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Code Structure Studio",
    backgroundColor: "#030712",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const dev = process.env.ELECTRON_DEV === "1";
  if (dev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(ROOT, "apps", "ui", "dist", "index.html");
    mainWindow.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  startParseServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopParseServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopParseServer();
});
