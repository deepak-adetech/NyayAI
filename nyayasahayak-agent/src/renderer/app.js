/**
 * NyayaSahayak Sync — Renderer process script
 * Handles all UI logic for the login and dashboard views
 */

// ─── Utilities ────────────────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showAlert(elementId, message, type = "error") {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = `alert alert-${type} visible`;
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  el.className = "alert";
}

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function pathBasename(p) {
  return p.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? p;
}

// ─── Login ────────────────────────────────────────────────────────────────────

function toggleAdvanced() {
  const section = document.getElementById("advanced-section");
  section.classList.toggle("open");
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("login-error");

  const btn = document.getElementById("login-btn");
  btn.classList.add("loading");
  btn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const serverUrl = document.getElementById("server-url").value.trim() || undefined;

  const result = await window.nyaya.login({ email, password, serverUrl });

  btn.classList.remove("loading");
  btn.disabled = false;

  if (!result.success) {
    showAlert("login-error", result.error ?? "Login failed", "error");
    return;
  }

  // Load dashboard
  await loadDashboard();
  showView("view-dashboard");
  document.getElementById("header-subtitle").textContent = `Signed in as ${result.userName ?? email}`;
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function loadDashboard() {
  const state = await window.nyaya.getState();

  // Stats
  document.getElementById("stat-total").textContent = state.syncStats?.total ?? 0;
  document.getElementById("stat-today").textContent = state.syncStats?.today ?? 0;

  // Sync badge
  updateSyncBadge(state.isWatching);

  // Folders
  renderFolderList(state.watchedFolders ?? []);

  // Activity
  renderActivity(state.recentActivity ?? []);

  // Auto-launch
  const autoLaunch = await window.nyaya.getAutoLaunch();
  document.getElementById("auto-launch-toggle").checked = autoLaunch;

  // Listen for live sync events
  window.nyaya.onFileSynced((result) => {
    // Update stats
    const totalEl = document.getElementById("stat-total");
    const todayEl = document.getElementById("stat-today");
    totalEl.textContent = parseInt(totalEl.textContent) + 1;
    todayEl.textContent = parseInt(todayEl.textContent) + 1;

    // Prepend to activity list
    const list = document.getElementById("activity-list");
    const emptyEl = list.querySelector(".empty-state");
    if (emptyEl) emptyEl.remove();

    const item = buildActivityItem(result);
    list.insertBefore(item, list.firstChild);

    // Keep max 20 items visible
    const items = list.querySelectorAll(".activity-item");
    if (items.length > 20) items[items.length - 1].remove();
  });
}

function updateSyncBadge(isWatching) {
  const badge = document.getElementById("sync-badge");
  const text = document.getElementById("sync-badge-text");
  const toggleBtn = document.getElementById("btn-toggle-sync");
  if (isWatching) {
    badge.className = "status-badge status-active";
    badge.innerHTML = `<span class="status-dot"></span>`;
    text.textContent = "Active";
    badge.appendChild(text);
    toggleBtn.textContent = "⏸ Pause";
  } else {
    badge.className = "status-badge status-paused";
    badge.innerHTML = `<span class="status-dot"></span>`;
    text.textContent = "Paused";
    badge.appendChild(text);
    toggleBtn.textContent = "▶ Resume";
  }
}

// ─── Folders ──────────────────────────────────────────────────────────────────

function renderFolderList(folders) {
  const list = document.getElementById("folder-list");
  const countEl = document.getElementById("folder-count");
  countEl.textContent = `${folders.length} folder${folders.length !== 1 ? "s" : ""}`;

  if (folders.length === 0) {
    list.innerHTML = '<div class="empty-state">No folders added yet</div>';
    return;
  }

  list.innerHTML = folders
    .map(
      (f) => `
      <div class="folder-item">
        <div class="folder-info">
          <div class="folder-path" title="${f}">${f}</div>
          <div class="folder-basename">📁 ${pathBasename(f)}</div>
        </div>
        <button class="btn-icon" onclick="removeFolder('${f.replace(/'/g, "\\'")}')" title="Stop watching">🗑</button>
      </div>
    `
    )
    .join("");
}

async function browseFolder() {
  const folder = await window.nyaya.pickFolder();
  if (folder) {
    document.getElementById("folder-input").value = folder;
    await addFolder(folder);
  }
}

async function addFolderManual() {
  const input = document.getElementById("folder-input");
  const folderPath = input.value.trim();
  if (!folderPath) return;
  await addFolder(folderPath);
  input.value = "";
}

async function addFolder(folderPath) {
  hideAlert("folder-error");
  const result = await window.nyaya.addFolder(folderPath);
  if (!result.success) {
    showAlert("folder-error", result.error ?? "Failed to add folder", "error");
    return;
  }
  const state = await window.nyaya.getState();
  renderFolderList(state.watchedFolders ?? []);
}

async function removeFolder(folderPath) {
  const baseName = pathBasename(folderPath);
  if (!confirm(`Stop watching "${baseName}"?`)) return;
  await window.nyaya.removeFolder(folderPath);
  const state = await window.nyaya.getState();
  renderFolderList(state.watchedFolders ?? []);
}

// ─── Sync Toggle ──────────────────────────────────────────────────────────────

async function toggleSync() {
  const result = await window.nyaya.toggleSync();
  updateSyncBadge(result.isWatching);
}

// ─── Activity ─────────────────────────────────────────────────────────────────

async function loadActivity() {
  const activity = await window.nyaya.getActivity();
  renderActivity(activity);
}

function buildActivityItem(item) {
  const div = document.createElement("div");
  div.className = "activity-item";
  const icon = item.status === "success" ? "✅" : item.status === "duplicate" ? "⏭" : "❌";
  const meta = item.status === "success"
    ? (item.matched ? `→ matched case` : "→ Sync Inbox")
    : (item.error ?? "error");
  div.innerHTML = `
    <span class="activity-icon">${icon}</span>
    <div style="flex:1;min-width:0;">
      <div class="activity-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.fileName ?? ""}">${item.fileName ?? "Unknown file"}</div>
      <div class="activity-meta">${item.documentType ? item.documentType + " · " : ""}${meta}</div>
    </div>
    <span class="activity-time">${formatTime(item.timestamp)}</span>
  `;
  return div;
}

function renderActivity(activity) {
  const list = document.getElementById("activity-list");
  if (!activity || activity.length === 0) {
    list.innerHTML = '<div class="empty-state">No activity yet — drop a file in a watched folder!</div>';
    return;
  }
  list.innerHTML = "";
  activity.slice(0, 20).forEach((item) => {
    list.appendChild(buildActivityItem(item));
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function onAutoLaunchChange(enabled) {
  await window.nyaya.setAutoLaunch(enabled);
}

async function logout() {
  if (!confirm("Sign out and stop syncing?")) return;
  window.nyaya.removeAllListeners("file-synced");
  window.nyaya.removeAllListeners("sync-error");
  await window.nyaya.logout();
  document.getElementById("header-subtitle").textContent = "Auto-sync documents to your cases";
  showView("view-login");
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
  const state = await window.nyaya.getState();
  if (state.isLoggedIn) {
    await loadDashboard();
    showView("view-dashboard");
    document.getElementById("header-subtitle").textContent = `Signed in as ${state.userName ?? state.email ?? ""}`;
    // Pre-fill server URL in login form (in case they need to re-login)
    if (state.serverUrl) {
      document.getElementById("server-url").value = state.serverUrl;
    }
  } else {
    showView("view-login");
  }
})();
