// 分支剧情引擎：呈现节点、按编号选择、应用后果、依据触发条件过滤选项、
// 处理跨幕影响（第一幕角色决定第二幕入口；第一幕 flag 改变第二幕可见分支）、
// 并强制每节点可见选项 ≤3。纯逻辑，不触碰 DOM / 浏览器存储（存储经 platform 适配层）。
import type {
  BranchingContent,
  BranchNode,
  BranchState,
  BranchChoice,
  BranchNote,
  Predicate,
  Effect,
} from "./types";

export type {
  BranchingContent,
  BranchNode,
  BranchState,
  BranchChoice,
  BranchNote,
  Predicate,
  Effect,
} from "./types";

const ACT_ENTRY_SENTINEL = "A2-ENTRY";
const MAX_CHOICES = 3;

function bool(v: unknown): boolean {
  return v === true;
}

/** 谓词求值：引擎支持的触发条件子集（与 contracts.Predicate 契约一致）。 */
export function testPredicate(state: BranchState, p: Predicate): boolean {
  switch (p.type) {
    case "flagTrue":
      return bool(state.flags[String(p.key)]);
    case "flagFalse":
      return !bool(state.flags[String(p.key)]);
    case "anyFlagTrue":
      return (p.keys as string[]).some((k) => bool(state.flags[k]));
    case "allFlagsFalse":
      return (p.keys as string[]).every((k) => !bool(state.flags[k]));
    case "worldVarEquals":
      return state.world[String(p.key)] === p.value;
    case "worldVarTruthy":
      return bool(state.world[String(p.key)]);
    default:
      return true;
  }
}

function applyEffect(state: BranchState, e: Effect): BranchNote | null {
  switch (e.type) {
    case "setFlag":
      // 按原值存储（支持布尔 flag，也支持字符串型角色标识 role）。
      state.flags[String(e.key)] = e.value as string | number | boolean;
      return null;
    case "setWorldVar":
      state.world[String(e.key)] = e.value as string | number | boolean;
      return null;
    case "changeRelation": {
      const id = String(e.npcId);
      state.relation[id] = (state.relation[id] ?? 0) + Number(e.delta ?? 0);
      return null;
    }
    case "addItem": {
      const id = String(e.itemId);
      const name = id;
      if (!state.inventory.includes(name)) state.inventory.push(name);
      return { kind: "effect", text: `获得 ${name}` };
    }
    default:
      return null;
  }
}

function applyEffects(state: BranchState, effects: Effect[] = []): BranchNote[] {
  const notes: BranchNote[] = [];
  for (const e of effects) {
    const note = applyEffect(state, e);
    if (note) notes.push(note);
  }
  return notes;
}

export function createInitialState(): BranchState {
  return {
    currentNodeId: "A1-START",
    act: 1,
    world: {},
    flags: {},
    relation: {},
    inventory: [],
    log: ["第一幕《雨至》开始。"],
    actEndings: [],
    completed: false,
  };
}

export function nodeById(content: BranchingContent, id: string): BranchNode | undefined {
  return content.nodes.find((n) => n.id === id);
}

/** 当前可见选项：触发条件全部满足者；按存储 no 排序；调用方需保证 ≤3。 */
export function visibleChoices(state: BranchState, node: BranchNode): BranchChoice[] {
  return node.choices
    .filter((c) => (c.visibleWhen ?? []).every((rule) => testPredicate(state, rule)))
    .filter((c) => (c.enabledWhen ?? []).every((rule) => testPredicate(state, rule)))
    .sort((a, b) => a.no - b.no);
}

export function currentNode(content: BranchingContent, state: BranchState): BranchNode {
  return nodeById(content, state.currentNodeId) ?? content.nodes[0];
}

function resolveEntry(content: BranchingContent, state: BranchState, nextId: string): string {
  if (nextId === ACT_ENTRY_SENTINEL) {
    const role = String(state.flags.role ?? "");
    return content.act2EntryByRole[role] ?? "A2-SHORE";
  }
  return nextId;
}

function enterNode(content: BranchingContent, state: BranchState, nodeId: string): BranchNote[] {
  const node = nodeById(content, nodeId);
  if (!node) return [{ kind: "hint", text: `节点缺失：${nodeId}` }];
  const notes = applyEffects(state, node.onEnterEffects);
  state.log.push(`【${node.act}幕·${node.title}】`);
  if (node.kind === "act-end" && node.actEnd) {
    state.actEndings.push(node.actEnd.endingId);
    notes.push({ kind: "ending", text: node.actEnd.summary });
  }
  return notes;
}

/** 按编号(1..n)做出选择，返回新状态与提示。 */
export function choose(content: BranchingContent, state: BranchState, no: number): { state: BranchState; notes: BranchNote[] } {
  const node = currentNode(content, state);
  const choice = visibleChoices(state, node).find((c) => c.no === no);
  if (!choice) return { state, notes: [{ kind: "hint", text: "该选项不可用。" }] };

  applyEffects(state, choice.costs);
  const choiceNotes = applyEffects(state, choice.effects);
  state.log.push(`选择：${choice.label}`);

  const nextId = resolveEntry(content, state, choice.next);
  const notes: BranchNote[] = [...choiceNotes];

  if (node.kind === "act-end" && node.act === 1) {
    // 第一幕幕终：当前节点已是幕终，按承诺角色推进到第二幕入口（单次进入）。
    state.act = 2;
    state.currentNodeId = nextId;
    notes.push(...enterNode(content, state, nextId));
  } else {
    state.currentNodeId = nextId;
    const arrived = enterNode(content, state, nextId);
    notes.push(...arrived);
    const target = nodeById(content, nextId);
    if (target?.kind === "volume-end") state.completed = true;
  }

  return { state, notes };
}

export interface ValidationIssue {
  nodeId: string;
  level: "error" | "warn";
  message: string;
}

/** 静态校验：每节点可见选项上限、next 可达、幕终/跨幕映射完整。 */
export function validate(content: BranchingContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set(content.nodes.map((n) => n.id));
  // 特殊哨兵
  const reachable = (id: string) => id === ACT_ENTRY_SENTINEL || ids.has(id);

  for (const node of content.nodes) {
    // 1) 总选项数 ≤3
    if (node.choices.length > MAX_CHOICES) {
      issues.push({ nodeId: node.id, level: "error", message: `选项数 ${node.choices.length} 超过上限 ${MAX_CHOICES}` });
    }
    // 2) 任意 flag 组合下，可见选项也不得超过 3（粗略：按 visibleWhen 分组估算）
    const gated = node.choices.filter((c) => c.visibleWhen && c.visibleWhen.length > 0);
    if (gated.length + (node.choices.length - gated.length) > MAX_CHOICES) {
      issues.push({ nodeId: node.id, level: "warn", message: "存在触发条件选项，最坏情况下可见选项可能超过 3，请复核。" });
    }
    // 3) next 可达
    for (const c of node.choices) {
      if (!reachable(c.next)) {
        issues.push({ nodeId: node.id, level: "error", message: `选项 ${c.id} 指向不存在的节点 ${c.next}` });
      }
    }
    // 4) 编号从 1 连续
    const nos = node.choices.map((c) => c.no).sort((a, b) => a - b);
    nos.forEach((n, i) => {
      if (n !== i + 1) issues.push({ nodeId: node.id, level: "warn", message: `选项编号不连续：${nos.join(",")}` });
    });
  }
  // 5) 角色→入口映射完整
  for (const role of ["chronicler", "ferrymate", "seeker"]) {
    if (!content.act2EntryByRole[role]) issues.push({ nodeId: "-", level: "error", message: `缺少角色 ${role} 的第二幕入口` });
  }
  return issues;
}
