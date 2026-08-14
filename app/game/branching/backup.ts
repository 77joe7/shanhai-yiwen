// 剧情数据备份机制：剧情数据"生成或更新"时，自动保存带时间戳的副本(JSON)，
// 支持列出与恢复。存储经注入的 storage 适配层（浏览器用 platform.storage，Node 验证用内存实现），
// 不直接调用 localStorage / 同步盘，满足"防止数据丢失并支持后续恢复"。

export interface BackupStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  label: string;
  contentVersion: string;
  checksum: string;
  key: string;
}

const MANIFEST_KEY = "shanhai.branch.backup.manifest";
const PREFIX = "shanhai.branch.backup.";
const KEEP = 20;

function checksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

function readManifest(store: BackupStorage): BackupRecord[] {
  const raw = store.get(MANIFEST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BackupRecord[]) : [];
  } catch {
    return [];
  }
}

function writeManifest(store: BackupStorage, records: BackupRecord[]): void {
  store.set(MANIFEST_KEY, JSON.stringify(records));
}

export class StoryDataBackup {
  private readonly store: BackupStorage;
  constructor(store: BackupStorage) {
    this.store = store;
  }

  /** 生成/更新剧情数据时调用：自动写入一份带时间戳的副本。 */
  snapshot(payload: unknown, meta: { label: string; contentVersion: string }): BackupRecord {
    const createdAt = new Date().toISOString();
    const id = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const serialized = JSON.stringify(payload);
    const record: BackupRecord = {
      id,
      createdAt,
      label: meta.label,
      contentVersion: meta.contentVersion,
      checksum: checksum(serialized),
      key: `${PREFIX}${id}`,
    };
    this.store.set(record.key, serialized);

    const manifest = readManifest(this.store);
    manifest.unshift(record);
    while (manifest.length > KEEP) {
      const dropped = manifest.pop();
      if (dropped) this.store.remove(dropped.key);
    }
    writeManifest(this.store, manifest);
    return record;
  }

  list(): BackupRecord[] {
    return readManifest(this.store).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  restore(id: string): unknown | null {
    const record = readManifest(this.store).find((r) => r.id === id);
    if (!record) return null;
    const raw = this.store.get(record.key);
    if (!raw) return null;
    const current = checksum(raw);
    if (current !== record.checksum) return null; // 副本损坏/被改，拒绝恢复
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  remove(id: string): void {
    const manifest = readManifest(this.store).filter((r) => r.id !== id);
    writeManifest(this.store, manifest);
    const rec = readManifest(this.store);
    void rec;
    this.store.remove(`${PREFIX}${id}`);
  }
}
