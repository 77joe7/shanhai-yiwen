"use client";

/**
 * 6 个核心产品页（页面范例）。
 *
 * 全部由既有 13 个设计系统组件组合而成，不引入新组件、不写死色值：
 * - 主菜单 / 地图探索 / 角色任务 / 图鉴物证 / 战斗威胁 / 设置
 * 每页附 `PageSpec` 结构化视觉规范（6 维度），由 `PageShowcase` 渲染规范卡。
 * 设置页直接读写 `useDesignSystem()` 全局状态，是设计系统能力的真实演练。
 *
 * 插画范例（Logo / 舆图 / 人物）以 SVG data URI 承载，取色均来自设计系统令牌
 * （湿墨 #17130F、旧丝 #EAE1DA、焦金 #F5D294、朱砂 #93000A、冷月蓝 #6E8298），
 * 经 `IllustrationFrame` 统一承载，满足「风格锚定 + 不硬编码路径」。
 */

import type { ComponentType, ReactNode } from "react";
import React, { useState } from "react";
import { useDesignSystem } from "../DesignSystemRoot";
import { AppTopBar } from "../components/AppTopBar";
import { ActionButton } from "../components/ActionButton";
import { SquareTag, type TagTone } from "../components/SquareTag";
import { BrushDivider } from "../components/BrushDivider";
import { StatusMeter } from "../components/StatusMeter";
import { IllustrationFrame } from "../components/IllustrationFrame";
import { MapMarker, type MarkerKind, type MarkerStatus } from "../components/MapMarker";
import { LocationCard } from "../components/LocationCard";
import { ArchiveEvidenceCard, type EvidenceStatus } from "../components/ArchiveEvidenceCard";
import { ThreatPanel, type DangerLevel } from "../components/ThreatPanel";
import {
  CharacterQuestDrawer,
  type QuestItem,
} from "../components/CharacterQuestDrawer";
import type { PageSpec } from "./spec";

/* ------------------------------------------------------------------ */
/* 插画范例（SVG data URI，取色全部源自设计系统令牌）                    */
/* ------------------------------------------------------------------ */

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const LOGO_SVG = svgToDataUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>` +
    `<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>` +
    `<stop offset='0' stop-color='#17130F'/><stop offset='1' stop-color='#312A22'/>` +
    `</linearGradient></defs>` +
    `<rect width='320' height='180' fill='url(#sky)'/>` +
    `<circle cx='160' cy='122' r='46' fill='#93000A'/>` +
    `<path d='M0 150 L60 110 L110 140 L170 95 L230 135 L290 100 L320 130 L320 180 L0 180 Z' fill='#0D0A07'/>` +
    `<path d='M0 165 L80 135 L150 160 L220 130 L320 158 L320 180 L0 180 Z' fill='#0A0806'/>` +
    `<line x1='0' y1='122' x2='320' y2='122' stroke='#F5D294' stroke-opacity='0.5' stroke-width='1'/>` +
    `<text x='160' y='34' fill='#EAE1DA' font-size='15' text-anchor='middle' font-family='serif'>天地未定</text>` +
    `</svg>`,
);

const MAP_SVG = svgToDataUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'>` +
    `<rect width='320' height='240' fill='#1F1B17'/>` +
    `<g stroke='#F5D294' stroke-opacity='0.16' stroke-width='1'>` +
    `<line x1='0' y1='60' x2='320' y2='60'/><line x1='0' y1='120' x2='320' y2='120'/><line x1='0' y1='180' x2='320' y2='180'/>` +
    `<line x1='80' y1='0' x2='80' y2='240'/><line x1='160' y1='0' x2='160' y2='240'/><line x1='240' y1='0' x2='240' y2='240'/>` +
    `</g>` +
    `<path d='M16 188 q28 -18 56 0 t56 0 t56 0 t56 0' stroke='#6E8298' stroke-width='3' fill='none'/>` +
    `<text x='58' y='92' fill='#F5D294' font-size='22' font-family='serif'>山</text>` +
    `<text x='196' y='74' fill='#EAE1DA' font-size='20' font-family='serif'>邑</text>` +
    `<text x='244' y='172' fill='#93000A' font-size='20' font-family='serif'>凶</text>` +
    `<text x='120' y='150' fill='#6F8A78' font-size='16' font-family='serif'>祠</text>` +
    `</svg>`,
);

const CHARACTER_SVG = svgToDataUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 320'>` +
    `<rect width='240' height='320' fill='#17130F'/>` +
    `<circle cx='120' cy='62' r='28' fill='#EAE1DA'/>` +
    `<path d='M120 92 C 92 92 82 132 82 202 L72 320 L168 320 L158 202 C158 132 148 92 120 92 Z' fill='#E6D5B8'/>` +
    `<path d='M82 202 L158 202' stroke='#F5D294' stroke-width='6'/>` +
    `<rect x='150' y='214' width='10' height='44' fill='#F5D294'/>` +
    `<path d='M104 150 q16 14 32 0' stroke='#17130F' stroke-width='3' fill='none'/>` +
    `</svg>`,
);

/* ------------------------------------------------------------------ */
/* 页面 1 · 主菜单 / 开始                                                */
/* ------------------------------------------------------------------ */

function MainMenuScreen(): ReactNode {
  return (
    <div className="ds-screen ds-mainmenu">
      <AppTopBar
        title="山海异闻录"
        variant="default"
        rightAction={{ label: "设置", icon: "设", onClick: () => {} }}
      />
      <div className="ds-mainmenu-body">
        <IllustrationFrame
          kind="scene"
          aspectRatio="16 / 9"
          src={LOGO_SVG}
          alt="《山海异闻录》主视觉：朱砂残日悬于湿墨山脊之上"
          caption="第一卷 · 天地未定"
        />
        <div className="ds-mainmenu-actions">
          <ActionButton icon="入" label="开始游戏" onClick={() => {}} />
          <ActionButton icon="续" label="继续旅程" onClick={() => {}} />
          <ActionButton icon="设" label="设置" onClick={() => {}} />
        </div>
        <div className="ds-mainmenu-tags">
          <SquareTag label="第一卷 · 已解锁" tone="gold" />
          <SquareTag label="存档 ×3" tone="neutral" />
          <SquareTag label="云同步中" tone="nature" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面 2 · 地图探索                                                    */
/* ------------------------------------------------------------------ */

function MapExploreScreen(): ReactNode {
  const pins: {
    kind: MarkerKind;
    name: string;
    status: MarkerStatus;
    top: string;
    left: string;
  }[] = [
    { kind: "mountain", name: "不周遗墟", status: "current", top: "30%", left: "22%" },
    { kind: "city", name: "青丘邑", status: "reached", top: "28%", left: "62%" },
    { kind: "water", name: "归墟", status: "clue", top: "74%", left: "30%" },
    { kind: "danger", name: "相柳之渊", status: "danger", top: "70%", left: "76%" },
    { kind: "shrine", name: "未名祠", status: "locked", top: "58%", left: "50%" },
  ];
  return (
    <div className="ds-screen ds-map">
      <AppTopBar
        title="舆图"
        variant="back"
        leftAction={{ label: "返回", icon: "←", onClick: () => {} }}
      />
      <div className="ds-map-grid">
        <div className="ds-map-canvas">
          <IllustrationFrame
            kind="map"
            aspectRatio="4 / 3"
            src={MAP_SVG}
            alt="山海舆图：山岭、聚落、水域与凶险之地的分布示意"
            caption="山海舆图 · 卷一"
          />
          <div className="ds-map-markers">
            {pins.map((pin) => (
              <span
                key={pin.name}
                className="ds-map-pin"
                style={{ top: pin.top, left: pin.left }}
              >
                <MapMarker
                  kind={pin.kind}
                  name={pin.name}
                  status={pin.status}
                  isCurrent={pin.status === "current"}
                  lockedHint={pin.status === "locked" ? "需先取得「残简」" : undefined}
                  onClick={() => {}}
                />
              </span>
            ))}
          </div>
        </div>
        <aside className="ds-map-list">
          <LocationCard
            name="青丘邑"
            weather="微雨"
            time="辰时"
            description="狐族旧地，檐角悬着未干的咒纸。可探可谈。"
            tags={["可采集", "线索"]}
            availableActions={[
              { icon: "探", label: "探查" },
              { icon: "谈", label: "搭话" },
            ]}
          />
          <LocationCard
            name="相柳之渊"
            weather="雾"
            time="未时"
            danger="水毒弥漫"
            description="九首之渊，气息翻涌。未备结界，慎入。"
            availableActions={[{ icon: "守", label: "结界" }]}
          />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面 3 · 角色与任务                                                  */
/* ------------------------------------------------------------------ */

function CharacterQuestScreen(): ReactNode {
  const quests: QuestItem[] = [
    { id: "q1", name: "寻回残简", summary: "青丘邑书库底层", done: false },
    { id: "q2", name: "问狐火之由", summary: "与族长搭话", done: false },
    { id: "q3", name: "初探不周", summary: "已标记路径", done: true },
  ];

  /** 人物关系（各用独立颜色 + 文字，不唯色）。 */
  const REL_LABEL: Record<string, string> = {
    "rel-kin": "血亲",
    "rel-ally": "盟友",
    "rel-friendly": "友善",
    "rel-neutral": "中立",
    "rel-wary": "戒备",
    "rel-hostile": "敌对",
  };
  const NPC_RELATIONS: { name: string; rel: TagTone; note: string }[] = [
    { name: "残简之灵", rel: "rel-kin", note: "半句谶语牵系，似有旧缘" },
    { name: "青丘族长", rel: "rel-ally", note: "狐族之主，曾受恩于你" },
    { name: "狐火灵", rel: "rel-friendly", note: "祠中初遇，尚无嫌隙" },
    { name: "未名祠守", rel: "rel-neutral", note: "沉默的守门者" },
    { name: "暗处窥伺者", rel: "rel-wary", note: "来意不明，宜戒备" },
    { name: "相柳", rel: "rel-hostile", note: "九首之渊，欲溺行旅" },
  ];
  return (
    <div className="ds-screen ds-char">
      <AppTopBar title="角色" variant="menu" />
      <div className="ds-char-body">
        <IllustrationFrame
          kind="character"
          aspectRatio="3 / 4"
          src={CHARACTER_SVG}
          alt="主角：着湿墨长袍，腰悬残简"
          caption="无名 · 行旅"
        />
        <div className="ds-char-stats">
          <StatusMeter label="生命" value={72} max={100} tone="life" />
          <StatusMeter label="精力" value={40} max={100} tone="stamina" warningState="warning" />
          <StatusMeter label="定力" value={18} max={100} tone="resolve" warningState="critical" />
        </div>
        <CharacterQuestDrawer
          openState="open"
          onClose={() => {}}
          playerSummary={
            <p className="ds-type-body-sm">
              无名行旅，自东海来。腰间残简记着半句谶语，余者待补。
            </p>
          }
          activeQuests={quests}
          inventoryPreview={
            <div className="ds-char-inv">
              <SquareTag label="残简" tone="gold" />
              <SquareTag label="狐火符" tone="nature" />
              <SquareTag label="干粮" tone="neutral" />
            </div>
          }
          relationsPreview={
            <ul className="ds-char-rels">
              {NPC_RELATIONS.map((npc) => (
                <li key={npc.name} className="ds-char-rel">
                  <SquareTag label={REL_LABEL[npc.rel]} tone={npc.rel} />
                  <span className="ds-char-rel-name ds-type-body-sm">{npc.name}</span>
                  <span className="ds-char-rel-note ds-type-label">{npc.note}</span>
                </li>
              ))}
            </ul>
          }
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面 4 · 图鉴 / 物证（缩略图网格 + 点击展开详情）                   */
/* ------------------------------------------------------------------ */

/** 物品稀有度。 */
type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** 稀有度 → 中文标签与色令牌引用。 */
const RARITY_LABEL: Record<ItemRarity, string> = {
  common: "普通",
  uncommon: "优良",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const RARITY_TONE: Record<ItemRarity, TagTone> = {
  common: "rarity-common",
  uncommon: "rarity-uncommon",
  rare: "rarity-rare",
  epic: "rarity-epic",
  legendary: "rarity-legendary",
};

/** 图鉴物品（扩展 ArchiveEvidenceCard，增加稀有度与等级）。 */
interface CodexItem {
  title: string;
  category?: string;
  icon?: string;
  description?: string;
  status: EvidenceStatus;
  knowledgeLevel?: number;
  /** 稀有度。 */
  rarity?: ItemRarity;
  /** 物品等级（1–99）。 */
  itemLevel?: number;
  /** 持有数量（未持有/未解锁则留空）。 */
  quantity?: number;
}

const CODEX_ITEMS: CodexItem[] = [
  {
    title: "残简",
    category: "器物",
    icon: "简",
    description: "半句谶语，墨色犹新。似与天地未定之局相关。记载着一段被抹去的预言碎片。",
    status: "evidence",
    knowledgeLevel: 2,
    rarity: "rare",
    itemLevel: 12,
    quantity: 2,
  },
  {
    title: "相柳之鳞",
    category: "异兽",
    icon: "鳞",
    description: "触之刺骨，水毒之证。九首凶兽蜕落之物，可炼制解毒剂或强化水系术法。",
    status: "rumor",
    knowledgeLevel: 1,
    rarity: "uncommon",
    itemLevel: 8,
    quantity: 7,
  },
  {
    title: "青丘狐火",
    category: "术法",
    icon: "火",
    description: "可照幽冥，亦可燃妄念。狐族秘传，燃尽后化为青烟归天。",
    status: "insight",
    knowledgeLevel: 4,
    rarity: "epic",
    itemLevel: 24,
    quantity: 1,
  },
  {
    title: "未名祠钥匙",
    category: "线索",
    icon: "钥",
    description: "祠门紧锁，钥在何处未明。铜质古钥，刻有看不懂的符文。",
    status: "locked",
    rarity: "common",
    itemLevel: 1,
  },
  {
    title: "归墟图",
    category: "舆地",
    icon: "图",
    description: "水脉尽头，万物归处。标注了五处疑似入口的坐标。",
    status: "obtained",
    knowledgeLevel: 3,
    rarity: "rare",
    itemLevel: 15,
    quantity: 1,
  },
  {
    title: "天地未定印",
    category: "神器",
    icon: "印",
    description: "上古遗物，据说能改写既定命运。但每次使用都要付出代价——具体是什么代价，无人知晓。",
    status: "locked",
    rarity: "legendary",
    itemLevel: 50,
  },
  { title: "？", category: "未知", status: "unknown", rarity: "common" },
];

/**
 * 缩略图格子（紧凑：icon + 名称 + 稀有度色点 + 等级）。
 * 点击触发 onSelect。
 */
function CodexThumbnail({
  item,
  selected,
  onSelect,
}: {
  item: CodexItem;
  selected: boolean;
  onSelect: () => void;
}): ReactNode {
  const r = item.rarity ?? "common";
  return (
    <button
      type="button"
      className={`ds-codex-thumb${selected ? " ds-codex-thumb-sel" : ""}`}
      onClick={onSelect}
      aria-label={`${item.title}${item.quantity != null ? ` · ×${item.quantity}` : ""} · ${RARITY_LABEL[r]}`}
      aria-pressed={selected}
    >
      <span className="ds-codex-thumb-icon" aria-hidden="true">
        {item.icon ?? "？"}
      </span>
      <span className="ds-codex-thumb-name ds-type-label">{item.title}</span>
      <span className="ds-codex-thumb-meta">
        <span
          className="ds-codex-thumb-dot"
          data-rarity={r}
          aria-hidden="true"
          title={RARITY_LABEL[r]}
        />
        {item.quantity != null ? (
          <span className="ds-codex-thumb-qty ds-type-label">×{item.quantity}</span>
        ) : null}
      </span>
    </button>
  );
}

function CodexEvidenceScreen(): ReactNode {
  const [selectedId, setSelectedId] = useState<string>(CODEX_ITEMS[0].title);
  const selected = CODEX_ITEMS.find((i) => i.title === selectedId) ?? CODEX_ITEMS[0];

  return (
    <div className="ds-screen ds-codex">
      <AppTopBar title="图鉴" variant="default" />
      <BrushDivider icon="category" label="物证" />

      {/* 缩略图网格（出血框约束：格子严格限制在界面可视边界内） */}
      <div className="ds-codex-bleed">
        <div className="ds-codex-grid" role="listbox" aria-label="物品列表">
          {CODEX_ITEMS.map((item) => (
            <CodexThumbnail
              key={item.title}
              item={item}
              selected={item.title === selectedId}
              onSelect={() => setSelectedId(item.title)}
            />
          ))}
        </div>
      </div>

      {/* 展开详情卡 */}
      <div className="ds-codex-detail" role="region" aria-label="物品详情">
        {/* 稀有度 + 等级行（在卡片上方独立显示） */}
        <div className="ds-codex-detail-meta">
          <SquareTag
            label={selected.rarity ? `${RARITY_LABEL[selected.rarity]}` : "—"}
            tone={selected.rarity ? RARITY_TONE[selected.rarity] : "neutral"}
          />
          {selected.itemLevel != null ? (
            <span className="ds-type-label">
              等级 <strong>{selected.itemLevel}</strong>
            </span>
          ) : null}
        </div>

        <ArchiveEvidenceCard
          icon={selected.icon}
          title={selected.title}
          category={selected.category}
          description={selected.description}
          status={selected.status}
          knowledgeLevel={selected.knowledgeLevel}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面 5 · 战斗 / 威胁（含滚动战报）                                 */
/* ------------------------------------------------------------------ */

/** 战报条目。 */
interface BattleLogEntry {
  turn: number;
  text: string;
  kind: "action" | "damage" | "status" | "system";
}

const INITIAL_BATTLE_LOG: BattleLogEntry[] = [
  { turn: 1, text: "—— 战斗开始 ——", kind: "system" },
  { turn: 1, text: "相柳发起「水毒弥漫」，范围伤害", kind: "action" },
  { turn: 1, text: "你受到 12 点伤害（精力 -12）", kind: "damage" },
  { turn: 2, text: "你使用「斩首」，瞄准首级", kind: "action" },
  { turn: 2, text: "命中！相柳生命 -8，稳定性 -16", kind: "damage" },
  { turn: 2, text: "⚠ 相柳进入「告急」状态", kind: "status" },
  { turn: 3, text: "相柳「九首翻涌」，连续攻击", kind: "action" },
  { turn: 3, text: "你受到 8 点伤害（生命 -8）", kind: "damage" },
  { turn: 3, text: "⚠ 你的精力进入「危急」状态", kind: "status" },
  { turn: 4, text: "你使用「结界」，开启护盾", kind: "action" },
  { turn: 4, text: "结界生效，下次伤害减半", kind: "status" },
];

/** 战报颜色按种类。 */
const LOG_KIND_TONE: Record<BattleLogEntry["kind"], string> = {
  action: "var(--ds-c-on-surface)",
  damage: "var(--ds-c-secondary-container)", /* 朱砂 */
  status: "var(--ds-c-tertiary-container)", /* 焦金 */
  system: "var(--ds-c-outline)",
};

function CombatThreatScreen(): ReactNode {
  const [log, setLog] = useState<BattleLogEntry[]>(INITIAL_BATTLE_LOG);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  /** 追加一条战报并自动滚底。 */
  const appendLog = (entry: BattleLogEntry) => {
    setLog((prev) => [...prev, entry]);
  };

  /** 自动滚到底部。 */
  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="ds-screen ds-combat">
      <AppTopBar
        title="交锋"
        variant="back"
        leftAction={{ label: "撤退", icon: "←", onClick: () => {} }}
      />
      <div className="ds-combat-grid">
        <ThreatPanel
          name="相柳"
          type="凶兽 · 水"
          intentText="九首翻涌，欲溺行旅于渊。先断一首以缓其势。"
          life={22}
          stability={64}
          dangerLevel="critical"
          knownWeakness="断其九首之一可缓其势"
        />
        <div className="ds-combat-self">
          <StatusMeter label="生命" value={58} max={100} tone="life" />
          <StatusMeter label="精力" value={30} max={100} tone="stamina" warningState="warning" />
        </div>
        {/* 滚动战报（上） */}
        <div className="ds-combat-log" role="log" aria-label="战斗过程记录">
          <span className="ds-combat-log-label ds-type-label">战报</span>
          <div className="ds-combat-log-scroll">
            {log.map((entry, i) => (
              <p
                key={i}
                className="ds-combat-log-entry ds-type-body-sm"
                data-kind={entry.kind}
                style={{ color: LOG_KIND_TONE[entry.kind] }}
              >
                <span className="ds-combat-log-turn ds-type-label" aria-hidden="true">
                  T{entry.turn}
                </span>
                {entry.text}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* 攻击选项（下） */}
        <div className="ds-combat-actions">
          <ActionButton icon="攻" label="斩首" dangerLevel="high" onClick={() => appendLog({ turn: log.length + 1, text: "你使用「斩首」，瞄准首级", kind: "action" })} />
          <ActionButton icon="守" label="结界" onClick={() => appendLog({ turn: log.length + 1, text: "你使用「结界」，开启护盾", kind: "action" })} />
          <ActionButton icon="退" label="撤退" onClick={() => appendLog({ turn: log.length + 1, text: "—— 撤退脱出战斗 ——", kind: "system" })} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面 6 · 设置（联动全局设计系统状态）                                 */
/* ------------------------------------------------------------------ */

function SetRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}): ReactNode {
  return (
    <div className="ds-set-row">
      <div className="ds-set-row-main">
        <span className="ds-set-row-label ds-type-body-sm">{label}</span>
        <span className="ds-set-row-desc ds-type-label">{desc}</span>
      </div>
      <ActionButton label={on ? "开" : "关"} selected={on} onClick={onToggle} />
    </div>
  );
}

function SettingsScreen(): ReactNode {
  const {
    highContrast,
    reducedMotion,
    texture,
    typewriter,
    semanticText,
    frameWidth,
    activeBreakpoint,
    set,
  } = useDesignSystem();

  const presets: { id: string; label: string; width: number; tone: TagTone }[] = [
    { id: "mobile", label: "手机 390", width: 390, tone: "gold" },
    { id: "tablet", label: "平板 900", width: 900, tone: "gold" },
    { id: "desktop", label: "桌面 1280", width: 1280, tone: "gold" },
  ];

  return (
    <div className="ds-screen ds-settings">
      <AppTopBar
        title="设置"
        variant="back"
        leftAction={{ label: "返回", icon: "←", onClick: () => {} }}
      />
      <div className="ds-set-list">
        <SetRow
          label="高对比模式"
          desc="提升文字与描边对比，满足弱光可读"
          on={highContrast}
          onToggle={() => set({ highContrast: !highContrast })}
        />
        <SetRow
          label="减弱动效"
          desc="关闭定位脉冲 / 逐字 / 刷痕动效"
          on={reducedMotion}
          onToggle={() => set({ reducedMotion: !reducedMotion })}
        />
        <SetRow
          label="细颗粒纹理"
          desc="full = 5% 噪点；simple = 关闭"
          on={texture === "full"}
          onToggle={() => set({ texture: texture === "full" ? "simple" : "full" })}
        />
        <SetRow
          label="叙事逐字"
          desc="约 33 字/秒，可随时显示全文"
          on={typewriter}
          onToggle={() => set({ typewriter: !typewriter })}
        />
        <SetRow
          label="语义色附加文字"
          desc="关闭即演示「唯色」反例"
          on={semanticText}
          onToggle={() => set({ semanticText: !semanticText })}
        />
      </div>
      <BrushDivider icon="category" label="显示框架" />
      <div className="ds-set-break">
        <span className="ds-type-label">断点模拟</span>
        <div className="ds-set-break-tabs">
          {presets.map((preset) => (
            <SquareTag
              key={preset.id}
              label={preset.label}
              tone={frameWidth === preset.width ? preset.tone : "neutral"}
              interactive
              selected={frameWidth === preset.width}
              onClick={() => set({ breakpoint: preset.id as "mobile", frameWidth: preset.width })}
            />
          ))}
        </div>
        <span className="ds-type-label">
          当前 {frameWidth}px · {activeBreakpoint.label}档
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面定义表（屏幕 + 规范）                                            */
/* ------------------------------------------------------------------ */

export interface PageDef {
  /** 页面 id。 */
  id: string;
  /** 页面名（用于标签页与规范标题）。 */
  name: string;
  /** 一句话定位。 */
  tagline: string;
  /** 屏幕组件。 */
  Screen: ComponentType;
  /** 视觉规范（6 维度）。 */
  spec: PageSpec;
}

export const PAGE_DEFINITIONS: PageDef[] = [
  {
    id: "main-menu",
    name: "主菜单",
    tagline: "进入世界的门户",
    Screen: MainMenuScreen,
    spec: {
      layout:
        "顶部 AppTopBar（标题 + 设置入口）吸顶；主体垂直居中，依次为场景插画（16:9 IllustrationFrame）→ 行动按钮组（开始/继续/设置）→ 状态标签行。整体单栏、留白充足。",
      color:
        "背景取 --ds-c-background(#17130F)；插画衬底 --ds-c-surface-low；主行动文字 --ds-c-primary(#FFF2DE)；标签金 --ds-c-tertiary-container(#F5D294)；同步态取自然苔绿 --ds-c-（派生 #6F8A78）。",
      typography:
        "页标题 ds-type-display(36/700/1.2/0.1em)；栏标题 ds-type-headline-mobile(20/600)；按钮标签 ds-type-label(12/700/0.2em)；说明 ds-type-body-sm(14/400/1.6)。",
      components:
        "AppTopBar（默认+设置按钮）、IllustrationFrame（scene）、ActionButton（直角、图标上文字下）、SquareTag（方括号、不唯色）。禁用态须附可读原因。",
      spacing:
        "主体间距 --ds-s-stack-lg(24)；按钮组 --ds-s-stack-sm(12)；标签行 --ds-s-stack-sm；统一 4 倍数阶（4/8/12/16/20/24）。",
      breakpoints:
        "手机(360–720)单栏居中；平板(721–1050)插画与按钮组并排留白；桌面(>1050)最大宽 480 居中卡片 + 两侧负空间。断点模拟器可实时重排。",
    },
  },
  {
    id: "map-explore",
    name: "地图探索",
    tagline: "行走与发现",
    Screen: MapExploreScreen,
    spec: {
      layout:
        "顶部返回栏；主体分左「舆图画布（4:3 IllustrationFrame + 绝对定位 MapMarker 叠层）」与右「地点列（LocationCard 列表）」。左侧地图承载全部标记，右侧列出已探地点与可行动作。",
      color:
        "舆图衬底 --ds-c-surface-low；网格线取 --ds-c-tertiary-container(#F5D294) 低透明度；当前地点标签 --ds-c-primary；危险地点朱砂 --ds-c-secondary-container(#920703)+「危」字；状态不唯色。",
      typography:
        "栏标题 ds-type-headline-mobile；地点名 ds-type-headline-mobile；描述 ds-type-body-sm；标记名与状态 ds-type-label；时间/天气 SquareTag 内联。",
      components:
        "AppTopBar（返回）、IllustrationFrame（map）、MapMarker（6 态：当前/已达/线索/危险/锁定/未显形，由中文+符号+边框结构表达）、LocationCard（圆角 --ds-sh-radius + outline-variant 描边）、ActionButton（地点行动）。",
      spacing:
        "地图与列表间距 --ds-s-stack-md(16)；卡内 --ds-s-stack-md；标记叠层用百分比定位，不依赖固定像素；统一 4 倍数阶。",
      breakpoints:
        "手机单栏堆叠（地图在上、列表在下）；平板起舆图与列表并排（1.4:1）；桌面三栏 + 留白。容器查询 @container dsframe 驱动。",
    },
  },
  {
    id: "character-quest",
    name: "角色任务",
    tagline: "自我与征途",
    Screen: CharacterQuestScreen,
    spec: {
      layout:
        "顶部菜单栏；主体左侧人物立绘（3:4 IllustrationFrame），右侧三档状态条（生命/精力/定力）；CharacterQuestDrawer 默认展开，含角色摘要、进行中任务、行囊速览。",
      color:
        "立绘衬底 --ds-c-surface-low；状态条固色填充取语义令牌（life/stamina/resolve 派生色）；告急/危急除色外有「告急/危急」文字 + 轨道加粗；抽屉分隔刷痕取 --ds-c-tertiary-container。人物关系启用独立 6 阶色板——血亲(焦金)/盟友(苔绿)/友善(冷月蓝)/中立(残墨灰)/戒备(赭橙)/敌对(朱砂)——各阶色互不相同且必附关系文字，绝不唯色。",
      typography:
        "抽屉标题 ds-type-headline-mobile；状态名 ds-type-label + 数值同体；任务名 ds-type-body-sm；摘要 ds-type-body-sm。",
      components:
        "AppTopBar（菜单）、IllustrationFrame（character）、StatusMeter（细方轨、数字可见、警告三要素）、CharacterQuestDrawer（左滑入、遮罩关、Esc 关、焦点回归）、SquareTag（在办/已结）。",
      spacing:
        "立绘与状态条间距 --ds-s-stack-md；状态条间距 --ds-s-stack-sm；抽屉内每个 BrushDivider 分区 + --ds-s-stack-md 段距。",
      breakpoints:
        "手机单栏（立绘在上、状态与抽屉在下）；平板立绘与状态并排、抽屉转左窄栏；桌面三栏。抽屉遮罩与安全区在真机叠加。",
    },
  },
  {
    id: "codex-evidence",
    name: "图鉴物证",
    tagline: "认知的积累",
    Screen: CodexEvidenceScreen,
    spec: {
      layout:
        "顶部栏 + 刷痕分隔（物证）；上方为等宽方格「棋盘」缩略图网格（图标 + 名称 + 稀有度色点 + 等级），点击任一格在下方展开 ArchiveEvidenceCard 详情卡（图标/标题/类别/描述/认知层级/状态 + 稀有度标签与等级）。",
      color:
        "卡片方角 1px 淡金边（--ds-c-outline-variant）；类别 SquareTag 中性；状态标签取语义色（实证/洞彻=金、已获得=苔绿、已失去=朱砂）；未知/锁定用中性 + 符号。稀有度启用独立 5 阶色板——普通(残墨灰)/优良(苔绿)/稀有(冷月蓝)/史诗(绛紫)/传说(焦金+辉光)——每阶色互不相同且必附文字标签，缩略图色点与详情卡标签同步。",
      typography:
        "卡标题 ds-type-headline-mobile；描述 ds-type-body-sm；类别与状态 ds-type-label；认知层级 pip 配数字。",
      components:
        "AppTopBar、BrushDivider（分类）、ArchiveEvidenceCard（7 态：未知/传闻/实证/洞彻/锁定/已获得/已失去，由中文+符号+边框结构表达，不唯色）、SquareTag。",
      spacing:
        "网格卡间距 --ds-s-stack-md；卡内标题—描述—底栏用 --ds-s-stack-sm；网格列数随容器宽度变化。",
      breakpoints:
        "手机 1–2 列；平板 3 列；桌面 4 列。@container dsframe 驱动重排，卡片方角与圆角均取 --ds-sh-radius。",
    },
  },
  {
    id: "combat-threat",
    name: "战斗威胁",
    tagline: "交锋与生机",
    Screen: CombatThreatScreen,
    spec: {
      layout:
        "顶部返回栏（撤退）；主体上 ThreatPanel（敌方意图 + 生息/稳定状态条 + 已知弱点），中我方状态条（生命/精力），下行动按钮组（斩首/结界/撤退）。",
      color:
        "威胁名取 --ds-c-on-surface；危险等级朱砂 --ds-c-secondary-container +「危/急」符号 + 边框加粗；状态条 warning/critical 自动叠文字与结构变化；行动危险级（斩首）须有「危」标记。",
      typography:
        "威胁名 ds-type-headline-mobile；意图 ds-type-body-sm；状态条标签/数值 ds-type-label；按钮标签 ds-type-label。",
      components:
        "AppTopBar（返回）、ThreatPanel（6 态：未知/已观察/可交涉/危险/濒危/已解决）、StatusMeter（life/resolve 派生色）、ActionButton（含 dangerLevel 高危标记）。",
      spacing:
        "面板与状态区间距 --ds-s-stack-md；状态条 --ds-s-stack-sm；行动组 --ds-s-stack-sm；危险信息额外 --ds-s-stack-sm 强调。",
      breakpoints:
        "手机单栏堆叠；平板 ThreatPanel 与状态并排；桌面 ThreatPanel + 我方状态 + 行动三栏。容器查询驱动。",
    },
  },
  {
    id: "settings",
    name: "设置",
    tagline: "统御全局观感",
    Screen: SettingsScreen,
    spec: {
      layout:
        "顶部返回栏；主体为设置行列表（每行：名称 + 说明 + 开关按钮），下方刷痕分隔「显示框架」+ 断点预设标签 + 当前宽度档位。所有开关实时改写全局设计系统状态。",
      color:
        "行底色 --ds-c-surface-low；开关「开」态翻转旧丝填充（ActionButton selected）；断点预设选中取 --ds-c-tertiary-container；其余沿用 on-surface 文本色。",
      typography:
        "设置名 ds-type-body-sm；说明 ds-type-label；分组标题 ds-type-label；数值档位 ds-type-label。",
      components:
        "AppTopBar（返回）、ActionButton（作开关，selected 翻转填充）、BrushDivider（分组）、SquareTag（断点预设，选中态）。本页直接驱动 useDesignSystem() 全局态。",
      spacing:
        "设置行间距 --ds-s-stack-sm；分组前后 --ds-s-stack-md；断点标签间距 --ds-s-stack-sm；统一 4 倍数阶。",
      breakpoints:
        "手机单栏；平板/桌面加宽留白。断点预设按钮本身即改变 PageShowcase 的 frame 宽度，故切换时本页随之外框重排，形成闭环演示。",
    },
  },
];
