import { blackRainContent, characterById, itemById, originById, statLabels } from "./blackRainContent";
import type { GameState } from "./types";

type Predicate = { type: string; [key: string]: unknown };
type Effect = { type: string; [key: string]: unknown };

const statKeyByContentStat: Record<string, keyof GameState["stats"]> = {
  body: "体魄",
  agility: "身法",
  spirit: "灵识",
  will: "心志",
  craft: "机巧",
  contract: "言契",
};

function bool(value: unknown) { return value === true; }

export function testPredicate(state: GameState, predicate: Predicate) {
  const flags = state.flags ?? {};
  const quantities = state.itemQuantities ?? {};
  const knowledge = state.itemKnowledge ?? {};
  switch (predicate.type) {
    case "flagTrue": return bool(flags[String(predicate.key)]);
    case "flagFalse": return !bool(flags[String(predicate.key)]);
    case "allFlagsFalse": return (predicate.keys as string[]).every((key) => !bool(flags[key]));
    case "anyFlagTrue": return (predicate.keys as string[]).some((key) => bool(flags[key]));
    case "worldVarEquals": return state.world[String(predicate.key)] === predicate.value;
    case "worldVarAtLeast": return Number(state.world[String(predicate.key)] ?? 0) >= Number(predicate.value);
    case "playerOriginIs": return state.player.origin === predicate.originId;
    case "playerStatAtLeast": {
      const key = statKeyByContentStat[String(predicate.stat)] ?? statLabels[String(predicate.stat)] as keyof GameState["stats"];
      return Number(state.stats[key] ?? 0) >= Number(predicate.value);
    }
    case "hasItem": return Number(quantities[String(predicate.itemId)] ?? 0) >= Number(predicate.quantity ?? 1);
    case "hasAnyItem": return (predicate.itemIds as string[]).some((id) => Number(quantities[id] ?? 0) > 0);
    case "itemRecognitionAtLeast": return Number(knowledge[String(predicate.itemId)] ?? 0) >= recognitionRank(String(predicate.stage));
    default: return true;
  }
}

function recognitionRank(stage: string) { return ({ first_sight: 1, rumor: 2, verified: 3, insight: 4 } as Record<string, number>)[stage] ?? 0; }

export function interpolate(state: GameState, text: string) {
  const origin = originById.get(state.player.origin);
  return text.replaceAll("{{player.originScene}}", origin?.originScene ?? "站在杳湾的雨里");
}

export function currentStoryNode(state: GameState) {
  return blackRainContent.story.find((node) => node.id === state.currentNodeId) ?? blackRainContent.story[0];
}

export function visibleBlocks(state: GameState) {
  return currentStoryNode(state).blocks.filter((block) => (block.when ?? []).every((rule) => testPredicate(state, rule)));
}

export function visibleChoices(state: GameState) {
  return currentStoryNode(state).choices.filter((choice) => (choice.visibleWhen ?? []).every((rule) => testPredicate(state, rule))).map((choice) => ({
    ...choice,
    enabled: (choice.enabledWhen ?? []).every((rule) => testPredicate(state, rule)),
  }));
}

function effectLabel(effect: Effect) {
  if (effect.type === "addItem") return `获得 ${itemById.get(String(effect.itemId))?.name ?? "物品"}`;
  if (effect.type === "unlockCodex") return "山海志新增见闻";
  if (effect.type === "startQuest") return "任务已接取";
  return null;
}

export function applyEffects(state: GameState, effects: Effect[] = []) {
  const next = { ...state, world: { ...state.world }, flags: { ...(state.flags ?? {}) }, itemQuantities: { ...(state.itemQuantities ?? {}) }, itemKnowledge: { ...(state.itemKnowledge ?? {}) }, codexLayers: { ...(state.codexLayers ?? {}) }, relation: { ...state.relation }, inventory: [...state.inventory], activeQuests: [...(state.activeQuests ?? [])], completedQuests: [...(state.completedQuests ?? [])] };
  const notes: string[] = [];
  for (const effect of effects) {
    const label = effectLabel(effect); if (label) notes.push(label);
    switch (effect.type) {
      case "setWorldVar": next.world[String(effect.key)] = effect.value as string | number | boolean; break;
      case "changeWorldVar": next.world[String(effect.key)] = Number(next.world[String(effect.key)] ?? 0) + Number(effect.delta ?? 0); break;
      case "setFlag": next.flags![String(effect.key)] = bool(effect.value); break;
      case "addItem": {
        const id = String(effect.itemId); const amount = Number(effect.quantity ?? 1);
        next.itemQuantities![id] = Number(next.itemQuantities![id] ?? 0) + amount;
        const name = itemById.get(id)?.name ?? id;
        if (!next.inventory.includes(name)) next.inventory.push(name);
        break;
      }
      case "item": {
        const id = String(effect.itemId); const amount = Number(effect.quantity ?? 1);
        next.itemQuantities![id] = Number(next.itemQuantities![id] ?? 0) + amount;
        const name = itemById.get(id)?.name ?? id;
        if (!next.inventory.includes(name)) next.inventory.push(name);
        break;
      }
      case "removeItem": {
        const id = String(effect.itemId); next.itemQuantities![id] = Math.max(0, Number(next.itemQuantities![id] ?? 0) - Number(effect.quantity ?? 1)); break;
      }
      case "revealItem": case "addKnowledge": {
        const id = String(effect.itemId ?? effect.subjectId); next.itemKnowledge![id] = Math.max(Number(next.itemKnowledge![id] ?? 0), recognitionRank(String(effect.stage ?? "first_sight"))); break;
      }
      case "unlockCodex": {
        const id = String(effect.codexId); const layers = new Set(next.codexLayers![id] ?? []); layers.add(String(effect.layer ?? "first_sight")); next.codexLayers![id] = [...layers]; if (!next.codexUnlocked.includes(id)) next.codexUnlocked.push(id); break;
      }
      case "changeRelation": {
        const id = String(effect.npcId); next.relation[id] = Number(next.relation[id] ?? 0) + Number(effect.delta ?? 0); break;
      }
      case "startQuest": { const id = String(effect.questId); if (!next.activeQuests!.includes(id)) next.activeQuests!.push(id); break; }
      case "completeObjective": break;
      case "resolveEncounter": next.world[`encounter.${String(effect.encounterId)}.result`] = String(effect.result); break;
      case "startEncounter": case "beginCombat": next.world[`encounter.${String(effect.encounterId)}.active`] = true; break;
      case "addTrait": next.flags![`trait.${String(effect.traitId)}`] = true; break;
      case "addStatus": next.flags![`status.${String(effect.statusId)}`] = true; break;
      case "unlockContent": next.world[`content.${String(effect.contentId)}`] = true; break;
      case "time": next.world["time.minutes"] = Number(next.world["time.minutes"] ?? 0) + Number(effect.minutes ?? effect.amount ?? 0); break;
      case "resource": {
        const id = String(effect.resourceId ?? effect.resource ?? "unknown");
        next.world[`resource.${id}`] = Number(next.world[`resource.${id}`] ?? 0) + Number(effect.delta ?? effect.amount ?? 0);
        break;
      }
      case "memory": next.world["memory.cost"] = Number(next.world["memory.cost"] ?? 0) + Number(effect.amount ?? effect.cost ?? 0); break;
      case "itemDurability": next.world[`item.${String(effect.itemId)}.durability`] = Number(next.world[`item.${String(effect.itemId)}.durability`] ?? 0) + Number(effect.delta ?? 0); break;
      case "completeVolume": next.world[`volume.${String(effect.volume)}.completed`] = true; break;
      case "completeQuest": { const id = String(effect.questId); next.activeQuests = next.activeQuests!.filter((value) => value !== id); if (!next.completedQuests!.includes(id)) next.completedQuests!.push(id); break; }
      case "advanceTime": next.day += Number(effect.days ?? 0); break;
    }
  }
  return { state: next, notes };
}

export function enterCurrentNode(state: GameState) {
  const node = currentStoryNode(state);
  if (state.visitedNodes?.includes(node.id)) return { state, notes: [] as string[] };
  const entered = applyEffects(state, node.onEnterEffects as Effect[] | undefined);
  return { state: { ...entered.state, visitedNodes: [...(entered.state.visitedNodes ?? []), node.id] }, notes: entered.notes };
}

export function chooseStory(state: GameState, choiceId: string) {
  const node = currentStoryNode(state);
  const choice = visibleChoices(state).find((value) => value.id === choiceId);
  if (!choice || !choice.enabled) return { state, notes: [choice?.disabledHint ?? "此选择的条件尚未满足。"] };
  const afterCosts = applyEffects(state, choice.costs as Effect[] | undefined);
  const afterChoice = applyEffects(afterCosts.state, choice.effects as Effect[] | undefined);
  const afterExit = applyEffects(afterChoice.state, node.onExitEffects as Effect[] | undefined);
  const arrived = enterCurrentNode({ ...afterExit.state, currentNodeId: choice.next });
  return { state: arrived.state, notes: [...afterCosts.notes, ...afterChoice.notes, ...afterExit.notes, ...arrived.notes] };
}

export function displayCharacterName(id: string) { return characterById.get(id)?.name ?? id; }
