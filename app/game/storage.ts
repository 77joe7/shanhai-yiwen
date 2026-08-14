import type { CharacterSummary, GameState, SaveEnvelope } from "./types";
import { browserPlatform } from "./platform";

const AUTO_KEY = "shanhai.save.auto";
const SETTINGS_KEY = "shanhai.settings";
const DEVICE_KEY = "shanhai.device";
const CHARACTERS_KEY = "shanhai.characters";
const ACTIVE_KEY = "shanhai.active";

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

/** Writes a fresh `lastSavedAt` timestamp without touching the revision counter. */
function withTimestamp(state: GameState): GameState {
  return { ...state, lastSavedAt: new Date().toISOString() };
}

function buildEnvelope(payload: GameState, saveId: string): SaveEnvelope {
  return {
    schemaVersion: 1,
    contentVersion: payload.contentVersion,
    revision: payload.revision,
    saveId,
    deviceId: deviceId(),
    updatedAt: payload.lastSavedAt ?? new Date().toISOString(),
    checksum: checksum(payload),
    payload,
  };
}

function readEnvelope(raw: string): SaveEnvelope | null {
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (envelope.schemaVersion !== 1 || !envelope.payload || envelope.checksum !== checksum(envelope.payload)) return null;
    return envelope;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, saveId = "auto") {
  const updatedAt = new Date().toISOString();
  const payload = { ...state, revision: state.revision + 1, lastSavedAt: updatedAt };
  const envelope = buildEnvelope(payload, saveId);
  const key = saveId === "auto" ? AUTO_KEY : `shanhai.save.${saveId}`;
  browserPlatform.storage.set(key, JSON.stringify(envelope));
  return envelope;
}

export function loadGame(saveId = "auto") {
  const key = saveId === "auto" ? AUTO_KEY : `shanhai.save.${saveId}`;
  const raw = browserPlatform.storage.get(key);
  if (!raw) return null;
  const envelope = readEnvelope(raw);
  if (!envelope) throw new Error("存档校验失败，原存档未被覆盖。");
  return envelope;
}

export function exportSave(state: GameState) {
  return JSON.stringify(buildEnvelope(withTimestamp(state), "export"), null, 2);
}

export function importSave(text: string) {
  if (text.length > 1_000_000) throw new Error("存档文件超过 1 MB 限制。");
  const envelope = readEnvelope(text);
  if (!envelope) throw new Error("存档格式或校验值无效。");
  return envelope.payload;
}

export function readSettings<T>(fallback: T): T {
  const raw = browserPlatform.storage.get(SETTINGS_KEY);
  return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
}

export function writeSettings(value: unknown) {
  browserPlatform.storage.set(SETTINGS_KEY, JSON.stringify(value));
}

function charKey(id: string) {
  return `shanhai.char.${id}`;
}

function slotKey(id: string, slot: number) {
  return `shanhai.char.${id}.slot.${slot}`;
}

function readRegistry(): CharacterSummary[] {
  const raw = browserPlatform.storage.get(CHARACTERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CharacterSummary[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(items: CharacterSummary[]) {
  browserPlatform.storage.set(CHARACTERS_KEY, JSON.stringify(items));
}

export function listCharacters(): CharacterSummary[] {
  return readRegistry().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveCharacter(id: string, state: GameState): CharacterSummary {
  const payload = withTimestamp(state);
  const envelope = buildEnvelope(payload, id);
  browserPlatform.storage.set(charKey(id), JSON.stringify(envelope));
  const registry = readRegistry();
  const existing = registry.find((item) => item.id === id);
  const summary: CharacterSummary = {
    id,
    name: payload.player.name,
    origin: payload.player.origin,
    nature: payload.player.nature,
    flaw: payload.player.flaw,
    location: payload.location,
    day: payload.day,
    period: payload.period,
    stats: payload.stats,
    createdAt: existing?.createdAt ?? payload.lastSavedAt ?? new Date().toISOString(),
    updatedAt: payload.lastSavedAt ?? new Date().toISOString(),
  };
  writeRegistry([summary, ...registry.filter((item) => item.id !== id)]);
  return summary;
}

export function loadCharacter(id: string): GameState | null {
  const raw = browserPlatform.storage.get(charKey(id));
  if (!raw) return null;
  const envelope = readEnvelope(raw);
  return envelope?.payload ?? null;
}

export function deleteCharacter(id: string) {
  browserPlatform.storage.remove(charKey(id));
  writeRegistry(readRegistry().filter((item) => item.id !== id));
}

export function getActiveId(): string | null {
  return browserPlatform.storage.get(ACTIVE_KEY) || null;
}

export function setActiveId(id: string | null) {
  if (id === null) browserPlatform.storage.remove(ACTIVE_KEY);
  else browserPlatform.storage.set(ACTIVE_KEY, id);
}

export function saveCharacterSlot(id: string, slot: number, state: GameState) {
  const envelope = buildEnvelope(withTimestamp(state), `char.${id}.slot.${slot}`);
  browserPlatform.storage.set(slotKey(id, slot), JSON.stringify(envelope));
  return envelope;
}

export function loadCharacterSlot(id: string, slot: number): GameState | null {
  const raw = browserPlatform.storage.get(slotKey(id, slot));
  if (!raw) return null;
  const envelope = readEnvelope(raw);
  if (!envelope) throw new Error("存档校验失败，原存档未被覆盖。");
  return envelope.payload;
}
