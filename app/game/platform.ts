/**
 * Platform boundary for the browser prototype.
 * A future WeChat Mini Game adapter can replace these capabilities without
 * changing story, combat, inventory, codex, or world-state rules.
 */
export interface PlatformAdapter {
  storage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
  };
  lifecycle: {
    onShow(listener: () => void): () => void;
    onHide(listener: () => void): () => void;
  };
  feedback: {
    vibrate(kind: "light" | "medium" | "heavy"): Promise<void>;
  };
  files: {
    exportText(filename: string, content: string): void;
  };
}

export const browserPlatform: PlatformAdapter = {
  storage: {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: (key) => localStorage.removeItem(key),
  },
  lifecycle: {
    onShow(listener) {
      const handler = () => { if (!document.hidden) listener(); };
      document.addEventListener("visibilitychange", handler);
      return () => document.removeEventListener("visibilitychange", handler);
    },
    onHide(listener) {
      const handler = () => { if (document.hidden) listener(); };
      document.addEventListener("visibilitychange", handler);
      return () => document.removeEventListener("visibilitychange", handler);
    },
  },
  feedback: {
    async vibrate(kind) { navigator.vibrate?.({ light: 15, medium: 30, heavy: 55 }[kind]); },
  },
  files: {
    exportText(filename, content) {
      const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  },
};
