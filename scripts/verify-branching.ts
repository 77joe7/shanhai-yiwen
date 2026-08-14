// 分支剧情系统验证脚本（Node 直接运行：node --experimental-strip-types scripts/verify-branching.ts）
// 校验：静态约束(≤3选项/可达/角色映射)、两幕连通、跨幕交叉影响、自动备份与恢复。
import { branchingContent } from "../app/game/branching/acts.ts";
import {
  validate,
  createInitialState,
  choose,
  currentNode,
  visibleChoices,
  type BranchState,
} from "../app/game/branching/engine.ts";
import { StoryDataBackup, type BackupStorage } from "../app/game/branching/backup.ts";

let failures = 0;
function check(name: string, cond: boolean): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}`);
  }
}

// ---- 1. 静态校验 ----
console.log("[1] 静态校验（validate）");
const issues = validate(branchingContent);
const errors = issues.filter((i) => i.level === "error");
check(`无 error 级问题（共 ${issues.length} 条提示）`, errors.length === 0);
if (errors.length) errors.forEach((e) => console.error("    -", e.nodeId, e.message));

// ---- 2. 连通性：从 A1-START 经所有 choice.next 可达全部节点 ----
console.log("[2] 连通性 BFS");
{
  const ids = new Set(branchingContent.nodes.map((n) => n.id));
  const seen = new Set<string>(["A1-START"]);
  const queue = ["A1-START"];
  while (queue.length) {
    const id = queue.shift() as string;
    const node = branchingContent.nodes.find((n) => n.id === id);
    if (!node) continue;
    for (const c of node.choices) {
      let tgt = c.next;
      if (tgt === "A2-ENTRY") {
        for (const e of Object.values(branchingContent.act2EntryByRole)) {
          if (!seen.has(e)) {
            seen.add(e);
            queue.push(e);
          }
        }
        continue;
      }
      if (ids.has(tgt) && !seen.has(tgt)) {
        seen.add(tgt);
        queue.push(tgt);
      }
    }
  }
  check(`全部 ${ids.size} 个节点从 A1-START 可达`, seen.size === ids.size);
}

// ---- 3. 三种角色 × 三条后果轴 均能完成两幕并抵达各自卷终 ----
console.log("[3] 三路线 × 三后果轴贯通（角色→第二幕入口→后果轴→卷终）");
function playToEnd(role: string, startChoices: number[], axisChoice = 1): BranchState {
  const s = createInitialState();
  // startChoices: [START选项, SHED/FERRY/GRANARY选项, MID选项, WELL/WATCH/BEACH选项]
  for (const no of startChoices) {
    choose(branchingContent, s, no);
  }
  // 在 A1-END 选择对应角色（按 flag 值匹配，而非第一个 role 选项）
  const endNode = currentNode(branchingContent, s);
  const roleChoice = visibleChoices(s, endNode).find((c) =>
    (c.effects ?? []).some((e) => e.type === "setFlag" && (e as any).key === "role" && (e as any).value === role),
  );
  choose(branchingContent, s, roleChoice ? roleChoice.no : 1);
  // 第二幕：入口选1 → A2-SHORE选 axisChoice → 对应后果轴选1（直达各自卷终，不再汇流）
  choose(branchingContent, s, 1);
  choose(branchingContent, s, axisChoice);
  choose(branchingContent, s, 1);
  return s;
}

const AXIS_ENDING: Record<number, string> = { 1: "A2-END-ARROW", 2: "A2-END-SHADOWS", 3: "A2-END-SALT" };
for (const role of ["chronicler", "ferrymate", "seeker"] as const) {
  const startNo = role === "chronicler" ? 1 : role === "ferrymate" ? 2 : 3;
  for (const axis of [1, 2, 3] as const) {
    const s = playToEnd(role, [startNo, 1, 1, 1], axis);
    const expected = AXIS_ENDING[axis];
    check(
      `${role} × 轴${axis}：抵达卷终 ${s.currentNodeId}（completed=${s.completed}）`,
      s.act === 2 && s.completed && s.currentNodeId === expected && s.actEndings.includes("a1-survived"),
    );
  }
}
check("后果轴1(羿箭)触发 ending.yi_arrow_marks_shared", playToEnd("chronicler", [1, 1, 1, 1], 1).world["ending.yi_arrow_marks_shared"] === true);
check("后果轴2(迟日)触发 ending.chiri_name_open", playToEnd("chronicler", [1, 1, 1, 1], 2).world["ending.chiri_name_open"] === true);
check("后果轴3(含晦)触发 ending.hanhui_open", playToEnd("chronicler", [1, 1, 1, 1], 3).world["ending.hanhui_open"] === true);

// ---- 4. 跨幕交叉影响 ----
console.log("[4] 跨幕交叉影响（第一幕 flag 改变第二幕可见选项）");
{
  // 渡工线 + 偷看货(snoop) → A2-FERRY 应出现 snoop 专属选项
  const s = createInitialState();
  choose(branchingContent, s, 2); // START→FERRY
  choose(branchingContent, s, 3); // FERRY 偷看货(snoop)
  choose(branchingContent, s, 2); // MID→WATCH
  choose(branchingContent, s, 1); // WATCH→A1-END
  const end = currentNode(branchingContent, s);
  const ferryRole = visibleChoices(s, end).find((c) => (c.effects ?? []).some((e) => (e as any).key === "role" && (e as any).value === "ferrymate"));
  choose(branchingContent, s, ferryRole!.no);
  const ferryNode = currentNode(branchingContent, s);
  const hasSnoopOpt = visibleChoices(s, ferryNode).some((c) => c.id === "A2-FERRY-c3");
  check("snoop(第一幕) → A2-FERRY 出现专属选项 A2-FERRY-c3", hasSnoopOpt);

  // 记历线 + 取昼盐(knowHanhui) → A2-SOLO 应出现取盐专属选项
  const s2 = createInitialState();
  choose(branchingContent, s2, 1); // START→SHED
  choose(branchingContent, s2, 1); // SHED 抄谱(knowWellHistory)
  choose(branchingContent, s2, 1); // MID→WELL(触发条件满足)
  choose(branchingContent, s2, 1); // WELL 取昼盐(knowHanhui)
  const end2 = currentNode(branchingContent, s2);
  const seekRole = visibleChoices(s2, end2).find((c) => (c.effects ?? []).some((e) => (e as any).key === "role" && (e as any).value === "seeker"));
  choose(branchingContent, s2, seekRole!.no);
  const soloNode = currentNode(branchingContent, s2);
  const hasSaltOpt = visibleChoices(s2, soloNode).some((c) => c.id === "A2-SOLO-c1");
  check("knowHanhui(第一幕) → A2-SOLO 出现取盐专属选项 A2-SOLO-c1", hasSaltOpt);
}

// ---- 5. 自动备份与恢复 ----
console.log("[5] 自动备份与恢复");
{
  const mem: Record<string, string> = {};
  const store: BackupStorage = {
    get: (k) => (k in mem ? mem[k] : null),
    set: (k, v) => {
      mem[k] = v;
    },
    remove: (k) => {
      delete mem[k];
    },
  };
  const backup = new StoryDataBackup(store);
  const rec = backup.snapshot(branchingContent, { label: "generate", contentVersion: branchingContent.contentVersion });
  check("生成时自动写入一份副本", rec.id.length > 0);
  check("备份列表非空", backup.list().length >= 1);
  const restored = backup.restore(rec.id) as typeof branchingContent;
  check(
    "恢复副本与原数据一致(节点数 + contentVersion)",
    !!restored && restored.nodes.length === branchingContent.nodes.length && restored.contentVersion === branchingContent.contentVersion,
  );
}

console.log("");
if (failures === 0) {
  console.log("全部校验通过 ✓");
  process.exit(0);
} else {
  console.error(`存在 ${failures} 项失败 ✗`);
  process.exit(1);
}
