export type PanelId = "story" | "map" | "codex" | "inventory" | "people" | "more";
export type OverlayId = "create" | "settings" | "saves" | "help" | null;

export type OriginId = "hunter" | "mountain" | "apprentice" | "wanderer";
export type NatureId = "cautious" | "curious" | "kind" | "resolute";
export type FlawId = "water" | "night" | "injury" | "speech";

export interface CharacterDraft {
  name: string;
  origin: OriginId;
  nature: NatureId;
  flaw: FlawId;
}

export interface Settings {
  fontScale: number;
  lineHeight: number;
  highContrast: boolean;
  reducedMotion: boolean;
  ambientVolume: number;
}

export interface GameState {
  schemaVersion: 1;
  contentVersion: "system-preview-0.1";
  revision: number;
  player: CharacterDraft;
  created: boolean;
  day: number;
  period: "清晨" | "午后" | "黄昏" | "夜半";
  location: string;
  resources: { life: number; stamina: number; resolve: number };
  stats: Record<"体魄" | "身法" | "灵识" | "心志" | "机巧" | "言契", number>;
  inventory: string[];
  equipment: string[];
  codexUnlocked: string[];
  relation: Record<string, number>;
  world: Record<string, string | number | boolean>;
  log: string[];
  lastSavedAt?: string;
}

export interface SaveEnvelope {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  saveId: string;
  deviceId: string;
  updatedAt: string;
  checksum: string;
  payload: GameState;
}
