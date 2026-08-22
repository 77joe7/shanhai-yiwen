"use client";

/**
 * 组件 05 · SquareTag（说明书十一.5）
 *
 * 方括号或方形细边，**不使用圆润 pill**（圆角取 `--ds-sh-radius` = 0）。
 * 语义色（life/stamina/resolve/nature）除颜色外必须带文字：`label` 本身是文字线索，
 * 另补一条读屏专用的语义说明，确保「状态不唯色」（说明书十二.6、三.1）。
 */

/**
 * 色调联合类型。
 * 核心语义色（neutral/gold/cinnabar/life/stamina/resolve/nature）见说明书三.1；
 * 层级色板（稀有度 5 阶 + 人物关系 6 阶）遵循「不同层级用不同颜色区分、且必须附文字」规则，
 * 各自独立色板、互不相同，全部引用 tokens.ts 的 `--ds-c-*` 变量。
 */
export type TagTone =
  | "neutral"
  | "gold"
  | "cinnabar"
  | "life"
  | "stamina"
  | "resolve"
  | "nature"
  /* 稀有度 5 阶（灰 / 苔绿 / 冷月蓝 / 绛紫 / 焦金） */
  | "rarity-common"
  | "rarity-uncommon"
  | "rarity-rare"
  | "rarity-epic"
  | "rarity-legendary"
  /* 人物关系 6 阶（血亲 / 盟友 / 友善 / 中立 / 戒备 / 敌对） */
  | "rel-kin"
  | "rel-ally"
  | "rel-friendly"
  | "rel-neutral"
  | "rel-wary"
  | "rel-hostile";

export interface SquareTagProps {
  /** 标签文字。 */
  label: string;
  /** 色调。 */
  tone?: TagTone;
  /** 可选图标字符。 */
  icon?: string;
  /** 是否可交互（可交互时渲染为按钮并具备 44px 触控高度）。 */
  interactive?: boolean;
  /** 选中态（仅可交互时有意义）。 */
  selected?: boolean;
  /** 点击回调。 */
  onClick?: () => void;
}

/** 语义色 → 读屏补充说明（保证不唯色）。 */
const TONE_MEANING: Partial<Record<TagTone, string>> = {
  life: "生命与伤势",
  stamina: "精力与准备",
  resolve: "定力、梦境与认知",
  nature: "自然、地点与可采集",
  cinnabar: "危险",
  gold: "重点",
  /* 稀有度 5 阶 */
  "rarity-common": "普通",
  "rarity-uncommon": "优良",
  "rarity-rare": "稀有",
  "rarity-epic": "史诗",
  "rarity-legendary": "传说",
  /* 人物关系 6 阶 */
  "rel-kin": "血亲",
  "rel-ally": "盟友",
  "rel-friendly": "友善",
  "rel-neutral": "中立",
  "rel-wary": "戒备",
  "rel-hostile": "敌对",
};

/**
 * 方括号标签组件。
 *
 * @param props 组件属性。
 * @returns 标签元素（可交互时为 button）。
 */
export function SquareTag({
  label,
  tone = "neutral",
  icon,
  interactive = false,
  selected = false,
  onClick,
}: SquareTagProps) {
  const meaning = TONE_MEANING[tone];
  const inner = (
    <>
      <span className="ds-tag-bracket" aria-hidden="true">
        [
      </span>
      {icon !== undefined && icon.length > 0 ? (
        <span className="ds-tag-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="ds-tag-label">{label}</span>
      {meaning !== undefined ? <span className="ds-sr-only">（{meaning}）</span> : null}
      <span className="ds-tag-bracket" aria-hidden="true">
        ]
      </span>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className="ds-tag ds-type-label ds-transition"
        data-tone={tone}
        data-selected={selected ? "true" : "false"}
        aria-pressed={selected}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }

  return (
    <span
      className="ds-tag ds-type-label"
      data-tone={tone}
      data-selected={selected ? "true" : "false"}
    >
      {inner}
    </span>
  );
}
