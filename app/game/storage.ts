import type { GameState, SaveEnvelope } from "./types";
import { browserPlatform } from "./platform";

const AUTO_KEY = "shanhai.save.auto";
const SETTINGS_KEY = "shanhai.settings";
const DEVICE_KEY = "shanhai.device";

function deviceId() {
  let value = browserPlatform.storage.get(DEVICE_KEY);
  if (!value) {
    value = crypto.randomUUID?.() ?? `device-${Date.now()}`;
    browserPlatform.storage.set(DEVICE_KEY, value);
  }
  return value;
}

function checksum(state: GameState) {
  const text = JSON.stringify(state);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

export function saveGame(state: GameState, saveId = "auto") {
  const updatedAt = new Date().toISOString();
  const payload = { ...state, revision: state.revision + 1, lastSavedAt: updatedAt };
  const envelope: SaveEnvelope = {
    schemaVersion: 1,
    contentVersion: payload.contentVersion,
    revision: payload.revision,
    saveId,
    deviceId: deviceId(),
    updatedAt,
    checksum: checksum(payload),
    payload,
  };
  const key = saveId === "auto" ? AUTO_KEY : `shanhai.save.${saveId}`;
  browserPlatform.storage.set(key, JSON.stringify(envelope));
  return envelope;
}

export function loadGame(saveId = "auto") {
  const key = saveId === "auto" ? AUTO_KEY : `shanhai.save.${saveId}`;
  const raw = browserPlatform.storage.get(key);
  if (!raw) return null;
  const envelope = JSON.parse(raw) as SaveEnvelope;
  if (envelope.schemaVersion !== 1 || !envelope.payload || envelope.checksum !== checksum(envelope.payload)) {
    throw new Error("存档校验失败，原存档未被覆盖。");
  }
  return envelope;
}

export function exportSave(state: GameState) {
  return JSON.stringify(saveGame(state, "export"), null, 2);
}

export function importSave(text: string) {
  if (text.length > 1_000_000) throw new Error("存档文件超过 1 MB 限制。");
  const envelope = JSON.parse(text) as SaveEnvelope;
  if (envelope.schemaVersion !== 1 || !envelope.payload || envelope.checksum !== checksum(envelope.payload)) {
    throw new Error("存档格式或校验值无效。");
  }
  saveGame(envelope.payload, "imported");
  return envelope.payload;
}

export function readSettings<T>(fallback: T): T {
  const raw = browserPlatform.storage.get(SETTINGS_KEY);
  return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
}

export function writeSettings(value: unknown) {
  browserPlatform.storage.set(SETTINGS_KEY, JSON.stringify(value));
}
