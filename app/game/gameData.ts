import type { CharacterDraft, GameState } from "./types";

export const origins = [
  { id: "hunter", name: "猎户", note: "善辨足迹与兽性，熟悉野外准备。", bonus: "身法 +1 · 观察异兽" },
  { id: "mountain", name: "山民", note: "熟悉山路、天气与草木的脾气。", bonus: "体魄 +1 · 识别地势" },
  { id: "apprentice", name: "巫祝学徒", note: "能察觉仪式残迹，却不擅正面冲突。", bonus: "灵识 +1 · 感知神异" },
  { id: "wanderer", name: "商旅遗孤", note: "懂交换、察言观色，也更警惕承诺。", bonus: "言契 +1 · 交易门路" },
] as const;

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

export const codexEntries = [
  { id: "unknown-ash", category: "材料", title: "烧不尽的灰", level: "初见记", text: "灰粒温热，雨水冲不散。用途不明，不宜贴身久藏。", source: "玩家亲见" },
  { id: "rain-crow", category: "异兽", title: "雨鸦", level: "众口说", text: "山民说它只在反常天候前落地。也有人说，那只是饥饿的乌鸦。", source: "赤水北岸俗说" },
  { id: "system-demo", category: "事件", title: "未写之卷", level: "行证录", text: "第一卷内容尚未接入。系统记录了这次等待，未来内容包会沿用同一条目 ID。", source: "开发记录" },
];

export function createInitialState(draft?: CharacterDraft): GameState {
  const player: CharacterDraft = draft ?? { name: "无名之人", origin: "hunter", nature: "cautious", flaw: "water" };
  const stats = { 体魄: 3, 身法: 3, 灵识: 3, 心志: 3, 机巧: 2, 言契: 2 };
  const originStat = { hunter: "身法", mountain: "体魄", apprentice: "灵识", wanderer: "言契" } as const;
  stats[originStat[player.origin]] += 1;
  return {
    schemaVersion: 1,
    contentVersion: "system-preview-0.1",
    revision: 1,
    player,
    created: Boolean(draft),
    day: 1,
    period: "清晨",
    location: "卷一入口",
    resources: { life: 12, stamina: 9, resolve: 8 },
    stats,
    inventory: ["粗陶水囊", "旧麻绳", "烧不尽的灰"],
    equipment: ["山行短刃", "旧斗笠", "磨损的护符"],
    codexUnlocked: ["unknown-ash", "rain-crow", "system-demo"],
    relation: { "守门人": 0, "同行者": 1 },
    world: { "sky.suns.count": 1, "volume.one.contentReady": false, "weather.blackRain": false },
    log: ["系统沙盘已载入。", "第一卷故事内容等待接入。"],
  };
}
