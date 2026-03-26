/**
 * Lightweight persistent key-value store using a JSON file.
 * Drop-in replacement for electron-store / conf — pure CJS, zero dependencies.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const APP_NAME = "nyayasahayak-sync";
const ENC_KEY = Buffer.from("nyayasahayak2025securestorekey32"); // 32 bytes

function getStorePath() {
  const platform = process.platform;
  let base;
  if (platform === "win32") {
    base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  } else if (platform === "darwin") {
    base = path.join(os.homedir(), "Library", "Application Support");
  } else {
    base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  }
  return path.join(base, APP_NAME, "config.json");
}

class Store {
  constructor() {
    this._path = getStorePath();
    this._data = {};
    this._load();
  }

  _load() {
    try {
      const dir = path.dirname(this._path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(this._path)) {
        const raw = fs.readFileSync(this._path, "utf8");
        this._data = JSON.parse(raw);
      }
    } catch {
      this._data = {};
    }
  }

  _save() {
    try {
      const dir = path.dirname(this._path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2), "utf8");
    } catch (err) {
      console.error("[Store] Save error:", err);
    }
  }

  get(key, defaultValue = undefined) {
    return key in this._data ? this._data[key] : defaultValue;
  }

  set(key, value) {
    this._data[key] = value;
    this._save();
  }

  delete(key) {
    delete this._data[key];
    this._save();
  }

  clear() {
    this._data = {};
    this._save();
  }

  has(key) {
    return key in this._data;
  }
}

module.exports = Store;
