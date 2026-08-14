// 分支剧情系统类型定义。
// 复用 src/content/contracts.ts 的 Predicate / Effect / StoryBlock 契约，
// 在其上扩展「带编号选项」「幕标识」「幕终/卷终」等分支剧情所需字段。
import type { Predicate, Effect, StoryBlock } from "../../../src/content/contracts";
export type { Predicate, Effect, StoryBlock } from "../../../src/content/contracts";

export type ActId = 1 | 2;
export type NodeKind = "story" | "act-end" | "volume-end";

/** 单个决策选项。no 为人工编号(1..3)，方便按轮次定位与修改。 */
export interface BranchChoice {
  /** 选项编号：本节点内 1..3，渲染与修改均以此为准。 */
  no: number;
  id: string;
  label: string;
  /** 选择后前往的节点 id；跨幕目的地亦直接写节点 id。 */
  next: string;
  /** 触发条件：全部满足才向玩家展示该选项（缺省即始终可见）。 */
  visibleWhen?: Predicate[];
  enabledWhen?: Predicate[];
  disabledHint?: string;
  costs?: Effect[];
  /** 选择后果：写入 flag / 世界变量，用于跨幕交叉影响。 */
  effects?: Effect[];
  /** 不可逆选项（fork 命运节点强制全部不可逆，V1.4 §2.3②）。 */
  irreversible?: boolean;
}

export interface BranchNode {
  id: string;
  act: ActId;
  title: string;
  kind?: NodeKind;
  blocks: StoryBlock[];
  onEnterEffects?: Effect[];
  /** V1.4 §2.3② 选项分级：sediment(≤3)/reflow(≤4)/fork(≤6 全部不可逆)，缺省 sediment。 */
  branchClass?: "sediment" | "reflow" | "fork";
  /** 每节点选项按 branchClass 分级校验（引擎 validate 强制）。 */
  choices: BranchChoice[];
  /** 幕终节点：记录本幕结局走向，并由角色决定下一幕入口。 */
  actEnd?: { endingId: string; summary: string };
}

export interface BranchingContent {
  schemaVersion: string;
  contentVersion: string;
  /** 第一幕幕终 → 第二幕入口（按玩家承诺的角色分流）。 */
  act2EntryByRole: Record<string, string>;
  nodes: BranchNode[];
}

/** 分支剧情运行态（独立于存档，聚焦剧情走向与世界变量）。 */
export interface BranchState {
  currentNodeId: string;
  act: ActId;
  world: Record<string, string | number | boolean>;
  flags: Record<string, string | number | boolean>;
  relation: Record<string, number>;
  inventory: string[];
  log: string[];
  actEndings: string[];
  completed: boolean;
}

export type BranchNote = { kind: "effect" | "hint" | "ending" | "enter"; text: string };
