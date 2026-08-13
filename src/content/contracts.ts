export type Scalar = string | number | boolean | null;

export interface Predicate {
  type: string;
  [key: string]: unknown;
}

export interface Effect {
  type: string;
  [key: string]: unknown;
}

export interface StoryBlock {
  type: "narration" | "dialogue" | "system" | "conditional";
  text: string;
  speaker?: string;
  when?: Predicate[];
}

export interface Choice {
  id: string;
  label: string;
  sourceTag?: string;
  visibleWhen?: Predicate[];
  enabledWhen?: Predicate[];
  disabledHint?: string;
  costs?: Effect[];
  effects?: Effect[];
  next: string;
  irreversible?: boolean;
  analyticsKey?: string;
}

export interface StoryNode {
  id: string;
  chapter: string;
  title: string;
  presentation: string;
  blocks: StoryBlock[];
  speaker?: string;
  enterConditions?: Predicate[];
  choices: Choice[];
  onEnterEffects?: Effect[];
  onExitEffects?: Effect[];
  tags: string[];
}

export interface RecognitionStage {
  stage: "first_sight" | "rumor" | "verified" | "insight";
  displayName: string;
  text: string;
  effects: Effect[];
}

export interface ItemContent {
  id: string;
  name: string;
  category: "material" | "tool" | "clue" | "unique" | string;
  recognitionStages: RecognitionStage[];
  storyHooks: string[];
  [key: string]: unknown;
}

export interface QuestObjective {
  id: string;
  text: string;
  completion: Predicate[];
  optional?: boolean;
}

export interface QuestContent {
  id: string;
  name: string;
  type: "main" | "side";
  summary: string;
  objectives: QuestObjective[];
  optionalObjectives?: QuestObjective[];
  rewards: Effect[];
  failure: unknown;
  relatedNpcIds: string[];
  relatedItemIds: string[];
}

export interface CharacterContent {
  id: string;
  name: string;
  speechGuide: string;
  relationshipAxes: string[];
  alive: boolean | null;
  [key: string]: unknown;
}

export interface CodexLayer {
  id: "first_sight" | "rumor" | "evidence" | "insight" | "echo" | string;
  unlockRules: Predicate[];
  sourceVoice: string;
  text: string;
  reliability: string;
  contradictions: string[];
}

export interface CodexContent {
  id: string;
  category: string;
  subjectId: string;
  title: string;
  layers: CodexLayer[];
}

export interface EncounterContent {
  id: string;
  name: string;
  triggerRules: Predicate[];
  solutions: Array<{ id: string; label: string; requirements: Predicate[]; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface ContentPack {
  schemaVersion: string;
  contentVersion: string;
  story: StoryNode[];
  characters: CharacterContent[];
  items: ItemContent[];
  quests: QuestContent[];
  encounters: EncounterContent[];
  codex: CodexContent[];
  worldDefaults: Record<string, Scalar>;
}

export interface GameStateReader {
  test(predicate: Predicate): boolean;
  interpolate(text: string): string;
}

export interface CommandBus {
  dispatch(effect: Effect, sourceId: string): void;
}
