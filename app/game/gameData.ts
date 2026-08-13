import type { CharacterDraft, GameState } from "./types";
import { blackRainContent, genericItems, itemById, originById, statLabels } from "./blackRainContent";

export const origins = blackRainContent.origins.map((origin) => ({
  id: origin.id,
  name: origin.name,
  note: origin.originScene,
  bonus: Object.entries(origin.statBonuses).map(([stat, amount]) => `${statLabels[stat] ?? stat} +${amount}`).join(" · "),
}));

export const natures = [
  { id: "cautious", name: "谨慎", note: "更早看到风险与撤退机会。" },
  { id: "curious", name: "好奇", note: "更容易发现被忽略的细节。" },
  { id: "kind", name: "仁厚", note: "关系增长更快，也更难弃人不顾。" },
  { id: "resolute", name: "狠决", note: "危急时更稳定，代价也更直接。" },
] as const;

export const flaws = [
  { id: "water", name: "怕水", note: "涉水时定力受压；未来可反转为「敬水」。" },
  { id: "night", name: "夜盲", note: "夜间观察受限，但更依赖声音与气味。" },
  { id: "injury", name: "旧伤", note: "长途跋涉消耗更多，能理解伤者的迟疑。" },
  { id: "speech", name: "不善言辞", note: "正式交涉不利，沉默有时反而让人卸防。" },
] as const;

export function createInitialState(draft?: CharacterDraft): GameState {
  const player: CharacterDraft = draft ?? { name: "无名之人", origin: "hunter", nature: "cautious", flaw: "water" };
  const stats = { 体魄: 3, 身法: 3, 灵识: 3, 心志: 3, 机巧: 2, 言契: 2 };
  const origin = originById.get(player.origin) ?? blackRainContent.origins[0];
  Object.entries(origin.statBonuses).forEach(([stat, amount]) => {
    const label = statLabels[stat] as keyof typeof stats | undefined;
    if (label) stats[label] += amount;
  });
  const startingItems = origin.startingItems.map((id) => genericItems[id] ?? itemById.get(id)?.name ?? id);
  const initialWorld = { ...blackRainContent.worldDefaults, "volume.one.contentReady": true } as Record<string, string | number | boolean>;
  return {
    schemaVersion: 1,
    contentVersion: blackRainContent.manifest.contentVersion,
    revision: 1,
    player,
    created: Boolean(draft),
    day: 1,
    period: "清晨",
    location: "杳湾",
    resources: { life: 12, stamina: 9, resolve: 8 },
    stats,
    inventory: startingItems,
    itemQuantities: Object.fromEntries(origin.startingItems.map((id) => [id, 1])),
    equipment: ["受潮骨柄短刃", "旧斗笠", "空白护符"],
    codexUnlocked: [],
    codexLayers: {},
    relation: Object.fromEntries(blackRainContent.characters.map((character) => [character.id, 0])),
    world: initialWorld,
    flags: {},
    itemKnowledge: {},
    currentNodeId: blackRainContent.manifest.entryNodeId,
    visitedNodes: [],
    activeQuests: [],
    completedQuests: [],
    log: ["第一卷《黑雨》内容包已载入。", "黑雨尚未落下。"],
  };
}

/** Keeps pre-content browser saves readable while switching them to the active chapter pack. */
export function hydrateBlackRainState(state: GameState): GameState {
  const legacyOrigins: Record<string, string> = { mountain: "mountain_folk", apprentice: "ritual_apprentice", wanderer: "caravan_orphan" };
  const origin = originById.has(state.player.origin) ? state.player.origin : legacyOrigins[state.player.origin] ?? "hunter";
  return {
    ...state,
    contentVersion: blackRainContent.manifest.contentVersion,
    player: { ...state.player, origin },
    world: { ...blackRainContent.worldDefaults, ...state.world, "volume.one.contentReady": true },
    flags: state.flags ?? {},
    itemQuantities: state.itemQuantities ?? {},
    itemKnowledge: state.itemKnowledge ?? {},
    codexLayers: state.codexLayers ?? {},
    currentNodeId: state.currentNodeId ?? blackRainContent.manifest.entryNodeId,
    visitedNodes: state.visitedNodes ?? [],
    activeQuests: state.activeQuests ?? [],
    completedQuests: state.completedQuests ?? [],
  };
}
