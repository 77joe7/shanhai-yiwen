export type PanelId = "story" | "map" | "codex" | "inventory" | "people" | "more";
export type OverlayId = "character" | "create" | "settings" | "saves" | "help" | null;

export type OriginId = string;
export type NatureId = "cautious" | "curious" | "kind" | "resolute";
export type FlawId = "water" | "night" | "injury" | "speech";

export interface CharacterDraft {
  name: string;
  origin: OriginId;
  nature: NatureId;
  flaw: FlawId;
}

export interface CharacterSummary {
  id: string;
  name: string;
  origin: string;
  nature: string;
  flaw: string;
  location: string;
  day: number;
  period: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  fontScale: number;
  lineHeight: number;
  highContrast: boolean;
  reducedMotion: boolean;
  textReveal: boolean;
  simplifiedTexture: boolean;
  ambientVolume: number;
  autoSave: boolean;
  haptics: boolean;
}

export type StoryMessageKind = "narration" | "npc-dialogue" | "system" | "player-action" | "player-speech";

export interface StoryHistoryEntry {
  id: string;
  nodeId: string;
  kind: StoryMessageKind;
  text: string;
  speaker?: string;
}

export interface GameState {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  player: CharacterDraft;
  created: boolean;
  day: number;
  period: "清晨" | "午后" | "黄昏" | "夜半";
  location: string;
  resources: { life: number; stamina: number; resolve: number };
  stats: Record<"体魄" | "身法" | "灵识" | "心志" | "机巧" | "言契", number>;
  inventory: string[];
  itemQuantities?: Record<string, number>;
  equipment: string[];
  codexUnlocked: string[];
  codexLayers?: Record<string, string[]>;
  relation: Record<string, number>;
  world: Record<string, string | number | boolean>;
  flags?: Record<string, boolean>;
  itemKnowledge?: Record<string, number>;
  currentNodeId?: string;
  visitedNodes?: string[];
  activeQuests?: string[];
  completedQuests?: string[];
  storyHistory?: StoryHistoryEntry[];
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
