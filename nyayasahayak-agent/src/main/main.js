/**
 * NyayaSahayak Desktop Sync Agent
 * Main Electron process — handles tray, window, watcher coordination
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog, Notification } = require("electron");
const path = require("path");

// Lightweight custom persistent store (pure CJS, no ESM issues)
const Store = require("./store");
const store = new Store();

const WatcherManager = require("./watcherManager");

let tray = null;
let mainWindow = null;
let watcherManager = null;
const isDev = process.argv.includes("--dev");

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Hide dock icon on Mac (tray-only app)
if (process.platform === "darwin") {
  app.dock.hide();
}

function getIconPath(name) {
  const base = path.join(__dirname, "../../assets");
  if (process.platform === "win32") return path.join(base, `${name}.ico`);
  if (process.platform === "darwin") return path.join(base, `${name}.icns`);
  return path.join(base, `${name}.png`);
}

function getTrayIconPath(active) {
  const base = path.join(__dirname, "../../assets");
  // Use small 16x16 / 22x22 tray icons
  if (process.platform === "darwin") {
    return path.join(base, active ? "tray-active.png" : "tray-idle.png");
  }
  return path.join(base, active ? "tray-active.ico" : "tray-idle.ico");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    title: "NyayaSahayak Sync",
    icon: getIconPath("icon"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    frame: true,
    backgroundColor: "#f8fafc",
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("close", (e) => {
    e.preventDefault(); // Don't quit, just hide
    mainWindow.hide();
    if (process.platform === "darwin") app.dock.hide();
  });

  mainWindow.once("ready-to-show", () => {
    // Show window on first launch or if not logged in
    const token = store.get("agentToken");
    if (!token) {
      mainWindow.show();
    }
  });
}

function buildTrayMenu() {
  const isLoggedIn = !!store.get("agentToken");
  const userName = store.get("userName") ?? "Not logged in";
  const serverUrl = store.get("serverUrl") ?? "https://case.ade-technologies.com";
  const watchedFolders = store.get("watchedFolders") ?? [];
  const syncStats = store.get("syncStats") ?? { total: 0, today: 0 };
  const isWatching = watcherManager?.isRunning() ?? false;

  const folderItems = watchedFolders.length > 0
    ? watchedFolders.map((f) => ({
        label: `  📁 ${path.basename(f)}`,
        sublabel: f,
        enabled: false,
      }))
    : [{ label: "  No folders watched", enabled: false }];

  return Menu.buildFromTemplate([
    {
      label: "NyayaSahayak Sync",
      enabled: false,
    },
    { type: "separator" },
    {
      label: isLoggedIn
        ? `✅ ${userName}`
        : "⚠️ Not logged in",
      enabled: false,
    },
    {
      label: isWatching
        ? `🟢 Watching ${watchedFolders.length} folder(s)`
        : "⭕ Sync paused",
      enabled: false,
    },
    {
      label: `📊 Synced: ${syncStats.total} files (${syncStats.today} today)`,
      enabled: false,
    },
    { type: "separator" },
    ...folderItems,
    { type: "separator" },
    {
      label: "Open NyayaSahayak...",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        if (process.platform === "darwin") app.dock.show();
      },
    },
    {
      label: "Open Web Dashboard",
      click: () => shell.openExternal(serverUrl),
    },
    { type: "separator" },
    isWatching
      ? {
          label: "⏸ Pause Sync",
          click: () => {
            watcherManager.stopAll();
            updateTray();
            showNotification("Sync Paused", "File watching has been paused.");
          },
        }
      : {
          label: "▶ Resume Sync",
          enabled: isLoggedIn && watchedFolders.length > 0,
          click: () => {
            watcherManager.startAll();
            updateTray();
            showNotification("Sync Resumed", "Now watching for new files.");
          },
        },
    { type: "separator" },
    {
      label: "Quit NyayaSahayak Sync",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function updateTray() {
  if (!tray) return;
  const isWatching = watcherManager?.isRunning() ?? false;
  try {
    const iconPath = getTrayIconPath(isWatching);
    const img = nativeImage.createFromPath(iconPath);
    tray.setImage(img.isEmpty() ? nativeImage.createEmpty() : img);
  } catch {
    // Icon file missing — use empty icon gracefully
  }
  tray.setContextMenu(buildTrayMenu());
  const watchedFolders = store.get("watchedFolders") ?? [];
  tray.setToolTip(
    isWatching
      ? `NyayaSahayak Sync — Watching ${watchedFolders.length} folder(s)`
      : "NyayaSahayak Sync — Paused"
  );
}

function createTray() {
  try {
    const iconPath = getTrayIconPath(false);
    const img = nativeImage.createFromPath(iconPath);
    tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  } catch {
    tray = new Tray(nativeImage.createEmpty());
  }
  tray.setToolTip("NyayaSahayak Sync");
  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === "darwin") app.dock.show();
  });
  updateTray();
}

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
}

app.whenReady().then(async () => {
  createWindow();
  createTray();

  // Initialize watcher manager
  watcherManager = new WatcherManager(store, {
    onFileProcessed: (result) => {
      // Update stats
      const stats = store.get("syncStats") ?? { total: 0, today: 0 };
      const today = new Date().toDateString();
      const lastDate = store.get("lastSyncDate");
      stats.total += 1;
      stats.today = lastDate === today ? stats.today + 1 : 1;
      store.set("syncStats", stats);
      store.set("lastSyncDate", today);

      // Update recent activity
      const activity = store.get("recentActivity") ?? [];
      activity.unshift({
        fileName: result.fileName,
        status: result.status,
        documentType: result.documentType ?? "",
        matched: result.matched,
        timestamp: new Date().toISOString(),
      });
      store.set("recentActivity", activity.slice(0, 50)); // keep last 50

      updateTray();

      // Notify renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("file-synced", result);
      }

      // Show OS notification
      if (result.status === "success") {
        showNotification(
          "File Synced ✅",
          `${result.fileName} → ${result.matched ? "matched to case" : "Sync Inbox"}`
        );
      } else if (result.status === "error") {
        showNotification("Sync Error ⚠️", `Failed to sync ${result.fileName}`);
      }
    },
    onError: (err) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync-error", err);
      }
    },
  });

  // Auto-start watching if logged in
  const token = store.get("agentToken");
  if (token) {
    const folders = store.get("watchedFolders") ?? [];
    if (folders.length > 0) {
      await watcherManager.startAll();
      updateTray();
    }
  }
});

app.on("window-all-closed", (e) => {
  // Keep running in tray
  e.preventDefault();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (watcherManager) watcherManager.stopAll();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Get current state for renderer
ipcMain.handle("get-state", () => {
  return {
    isLoggedIn: !!store.get("agentToken"),
    userName: store.get("userName"),
    email: store.get("email"),
    serverUrl: store.get("serverUrl") ?? "https://case.ade-technologies.com",
    watchedFolders: store.get("watchedFolders") ?? [],
    syncStats: store.get("syncStats") ?? { total: 0, today: 0 },
    recentActivity: store.get("recentActivity") ?? [],
    isWatching: watcherManager?.isRunning() ?? false,
  };
});

// Login
ipcMain.handle("login", async (_event, { email, password, serverUrl }) => {
  const url = (serverUrl || "https://case.ade-technologies.com").replace(/\/$/, "");
  try {
    const fetch = require("node-fetch");
    const os = require("os");
    const deviceName = `${os.hostname()} (${process.platform})`;

    const res = await fetch(`${url}/api/sync/agent-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, deviceName }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error ?? "Login failed" };
    }

    store.set("agentToken", data.token);
    store.set("userId", data.userId);
    store.set("userName", data.userName);
    store.set("email", email);
    store.set("serverUrl", url);

    updateTray();
    return { success: true, userName: data.userName };
  } catch (err) {
    return { success: false, error: `Cannot connect to server: ${err.message}` };
  }
});

// Logout
ipcMain.handle("logout", async () => {
  const token = store.get("agentToken");
  const serverUrl = store.get("serverUrl");
  if (token && serverUrl) {
    try {
      const fetch = require("node-fetch");
      await fetch(`${serverUrl}/api/sync/agent-auth`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
  }
  watcherManager.stopAll();
  store.delete("agentToken");
  store.delete("userId");
  store.delete("userName");
  store.delete("email");
  store.delete("watchedFolders");
  store.delete("syncStats");
  store.delete("recentActivity");
  updateTray();
  return { success: true };
});

// Pick folder via OS dialog
ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select folder to watch",
    buttonLabel: "Watch this folder",
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

// Add a folder to watch list
ipcMain.handle("add-folder", async (_event, folderPath) => {
  const folders = store.get("watchedFolders") ?? [];
  if (folders.includes(folderPath)) {
    return { success: false, error: "Already watching this folder" };
  }
  folders.push(folderPath);
  store.set("watchedFolders", folders);

  // Register folder on server
  const token = store.get("agentToken");
  const serverUrl = store.get("serverUrl");
  if (token && serverUrl) {
    try {
      const fetch = require("node-fetch");
      await fetch(`${serverUrl}/api/sync/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folderPath }),
      });
    } catch { /* non-critical */ }
  }

  if (watcherManager.isRunning()) {
    await watcherManager.addFolder(folderPath);
  }
  updateTray();
  return { success: true };
});

// Remove a folder from watch list
ipcMain.handle("remove-folder", async (_event, folderPath) => {
  let folders = store.get("watchedFolders") ?? [];
  folders = folders.filter((f) => f !== folderPath);
  store.set("watchedFolders", folders);
  watcherManager.removeFolder(folderPath);
  updateTray();
  return { success: true };
});

// Pause/resume sync
ipcMain.handle("toggle-sync", async () => {
  if (watcherManager.isRunning()) {
    watcherManager.stopAll();
    showNotification("Sync Paused", "File watching paused.");
  } else {
    await watcherManager.startAll();
    showNotification("Sync Resumed", "Now watching for new files.");
  }
  updateTray();
  return { isWatching: watcherManager.isRunning() };
});

// Open web dashboard
ipcMain.handle("open-web", () => {
  const url = store.get("serverUrl") ?? "https://case.ade-technologies.com";
  shell.openExternal(url);
});

// Get recent activity
ipcMain.handle("get-activity", () => {
  return store.get("recentActivity") ?? [];
});

// Configure auto-launch
ipcMain.handle("set-auto-launch", async (_event, enabled) => {
  try {
    const AutoLaunch = require("auto-launch");
    const autoLauncher = new AutoLaunch({ name: "NyayaSahayak Sync" });
    if (enabled) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
    store.set("autoLaunch", enabled);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-auto-launch", async () => {
  try {
    const AutoLaunch = require("auto-launch");
    const autoLauncher = new AutoLaunch({ name: "NyayaSahayak Sync" });
    const enabled = await autoLauncher.isEnabled();
    return enabled;
  } catch {
    return store.get("autoLaunch") ?? false;
  }
});
