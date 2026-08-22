"use client";

/**
 * 组件 07 · ThreatPanel（说明书十一.7、十二.6）
 *
 * 属性：name、type、intentText、stability／life、dangerLevel、knownWeakness。
 * 6 状态：未知 / 已观察 / 可交涉 / 危险 / 濒危 / 已解决。
 *
 * 铁律：危险等级用**中文等级词 + 符号 + 边框结构变化**表达，不得仅依赖颜色；
 * 状态条自带「当前值/最大值」文本（由 `StatusMeter` 保证）。
 */

import { StatusMeter } from "./StatusMeter";
import { SquareTag } from "./SquareTag";
import type { TagTone } from "./SquareTag";

export type DangerLevel =
  | "unknown"
  | "observed"
  | "negotiable"
  | "dangerous"
  | "critical"
  | "resolved";

export interface ThreatPanelProps {
  /** 威胁名称（当前认知）。 */
  name: string;
  /** 类型。 */
  type?: string;
  /** 意图描述。 */
  intentText?: string;
  /** 稳定/定力（0–100）。 */
  stability?: number;
  /** 生息/生命（0–100）。 */
  life?: number;
  /** 危险等级。 */
  dangerLevel: DangerLevel;
  /** 已知弱点。 */
  knownWeakness?: string;
}

/** 等级 → 中文词。 */
const LEVEL_LABEL: Record<DangerLevel, string> = {
  unknown: "未知",
  observed: "已观察",
  negotiable: "可交涉",
  dangerous: "危险",
  critical: "濒危",
  resolved: "已解决",
};

/** 等级 → 符号（颜色之外的第二线索）。 */
const LEVEL_MARK: Record<DangerLevel, string> = {
  unknown: "？",
  observed: "观",
  negotiable: "言",
  dangerous: "危",
  critical: "急",
  resolved: "了",
};

/** 等级 → 标签色调。 */
const LEVEL_TONE: Record<DangerLevel, TagTone> = {
  unknown: "neutral",
  observed: "neutral",
  negotiable: "resolve",
  dangerous: "cinnabar",
  critical: "cinnabar",
  resolved: "nature",
};

/** 生命值阈值：低于此值视为危急（说明书十二.6 需文字与结构同时提示）。 */
const LIFE_CRITICAL = 25;
/** 生命值阈值：低于此值视为告急。 */
const LIFE_WARNING = 50;

/**
 * 依据数值推导警告等级。
 *
 * @param value 当前值。
 * @returns 警告等级。
 */
function deriveWarning(value: number): "normal" | "warning" | "critical" {
  if (value < LIFE_CRITICAL) return "critical";
  if (value < LIFE_WARNING) return "warning";
  return "normal";
}

/**
 * 威胁面板组件。
 *
 * @param props 组件属性。
 * @returns 威胁面板元素。
 */
export function ThreatPanel({
  name,
  type,
  intentText,
  stability,
  life,
  dangerLevel,
  knownWeakness,
}: ThreatPanelProps) {
  const levelLabel = LEVEL_LABEL[dangerLevel];
  const displayName = dangerLevel === "unknown" ? `${name}（未辨明）` : name;

  return (
    <section
      className="ds-threat"
      data-level={dangerLevel}
      aria-label={`威胁：${displayName}，${levelLabel}`}
    >
      <div className="ds-threat-head">
        <h3 className="ds-threat-name ds-type-headline-mobile">{displayName}</h3>
        <span className="ds-threat-level ds-type-label">
          <span aria-hidden="true">{LEVEL_MARK[dangerLevel]}</span>
          <span>{levelLabel}</span>
        </span>
      </div>

      {type !== undefined && type.length > 0 ? (
        <div className="ds-touch-row">
          <SquareTag label={type} tone={LEVEL_TONE[dangerLevel]} />
        </div>
      ) : null}

      <p className="ds-threat-intent ds-type-body-sm">
        {intentText !== undefined && intentText.length > 0
          ? intentText
          : "意图不明；再观察一回合或尝试搭话。"}
      </p>

      {stability !== undefined || life !== undefined ? (
        <div className="ds-threat-meters">
          {life !== undefined ? (
            <StatusMeter
              label="生息"
              value={life}
              max={100}
              tone="life"
              warningState={deriveWarning(life)}
            />
          ) : null}
          {stability !== undefined ? (
            <StatusMeter
              label="稳定"
              value={stability}
              max={100}
              tone="resolve"
              warningState={deriveWarning(stability)}
            />
          ) : null}
        </div>
      ) : null}

      {knownWeakness !== undefined && knownWeakness.length > 0 ? (
        <div className="ds-threat-weakness ds-type-label">
          <span aria-hidden="true">◆</span>
          <span>已知弱点</span>
          <span className="ds-threat-weakness-text">{knownWeakness}</span>
        </div>
      ) : (
        <div className="ds-threat-weakness ds-type-label">
          <span aria-hidden="true">◇</span>
          <span>尚无已知弱点</span>
        </div>
      )}
    </section>
  );
}
