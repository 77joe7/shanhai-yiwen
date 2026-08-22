"use client";

/**
 * 组件 04 · ArchiveEvidenceCard（说明书十一.4、十.5）
 *
 * 属性：icon、title、category、description、knowledgeLevel、status。
 * 7 状态：未知 / 传闻 / 实证 / 洞彻 / 锁定 / 已获得 / 已失去。
 *
 * 视觉：方形、1px 淡金边、顶部小符号、标题与右侧方括号类别、正文、细分隔。
 * 铁律：状态差异同时由「中文状态文字 + 符号 + 边框样式（实线/虚线/点线/加粗）」表达，
 * 不得仅依赖颜色（说明书十二.6）。
 */

import { SquareTag } from "./SquareTag";
import type { TagTone } from "./SquareTag";

export type EvidenceStatus =
  | "unknown"
  | "rumor"
  | "evidence"
  | "insight"
  | "locked"
  | "obtained"
  | "lost";

export interface ArchiveEvidenceCardProps {
  /** 顶部小符号。 */
  icon?: string;
  /** 标题（当前认知名称）。 */
  title: string;
  /** 类别（右侧方括号标签）。 */
  category?: string;
  /** 描述。 */
  description?: string;
  /** 认知层级 0–4。 */
  knowledgeLevel?: number;
  /** 状态。 */
  status: EvidenceStatus;
  /** 点击回调（存在时渲染为按钮）。 */
  onClick?: () => void;
}

/** 状态 → 中文文字。 */
const STATUS_LABEL: Record<EvidenceStatus, string> = {
  unknown: "未知",
  rumor: "传闻",
  evidence: "实证",
  insight: "洞彻",
  locked: "锁定",
  obtained: "已获得",
  lost: "已失去",
};

/** 状态 → 结构性符号（文字之外的第二线索）。 */
const STATUS_MARK: Record<EvidenceStatus, string> = {
  unknown: "？",
  rumor: "耳",
  evidence: "证",
  insight: "彻",
  locked: "锁",
  obtained: "得",
  lost: "失",
};

/** 状态 → 标签色调。 */
const STATUS_TONE: Record<EvidenceStatus, TagTone> = {
  unknown: "neutral",
  rumor: "neutral",
  evidence: "gold",
  insight: "gold",
  locked: "neutral",
  obtained: "nature",
  lost: "cinnabar",
};

/** 认知层级刻度上限（说明书十.4 认知层级）。 */
const KNOWLEDGE_MAX = 4;

/**
 * 档案证据卡组件。
 *
 * @param props 组件属性。
 * @returns 档案卡元素（提供 onClick 时为 button，否则为 article）。
 */
export function ArchiveEvidenceCard({
  icon,
  title,
  category,
  description,
  knowledgeLevel = 0,
  status,
  onClick,
}: ArchiveEvidenceCardProps) {
  const level = Math.min(Math.max(knowledgeLevel, 0), KNOWLEDGE_MAX);
  const statusLabel = STATUS_LABEL[status];
  const glyph = icon !== undefined && icon.length > 0 ? icon : STATUS_MARK[status];

  const body = (
    <>
      <div className="ds-evidence-head">
        <span className="ds-evidence-title ds-type-headline-mobile">{title}</span>
        <div className="ds-evidence-head-right">
          <i className="ds-evidence-glyph ds-type-label" aria-hidden="true">
            {glyph}
          </i>
          {category !== undefined && category.length > 0 ? (
            <SquareTag label={category} tone="neutral" />
          ) : null}
        </div>
      </div>

      {description !== undefined && description.length > 0 ? (
        <p className="ds-evidence-desc ds-type-body-sm">{description}</p>
      ) : (
        <p className="ds-evidence-desc ds-type-body-sm">
          {status === "unknown" ? "尚无可用记载，先去听、去看、去问。" : "暂无描述。"}
        </p>
      )}

      <div className="ds-evidence-foot">
        <span className="ds-evidence-level ds-type-label">
          <span>认知</span>
          {Array.from({ length: KNOWLEDGE_MAX }, (_unused, index) => (
            <span
              key={index}
              className="ds-evidence-pip"
              data-filled={index < level ? "true" : "false"}
              aria-hidden="true"
            />
          ))}
          <span>
            {level}/{KNOWLEDGE_MAX}
          </span>
        </span>
        <SquareTag label={statusLabel} tone={STATUS_TONE[status]} icon={STATUS_MARK[status]} />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="ds-evidence ds-transition"
        data-status={status}
        onClick={onClick}
        disabled={status === "locked"}
        aria-label={`${title}，${statusLabel}`}
      >
        {body}
      </button>
    );
  }

  return (
    <article className="ds-evidence" data-status={status} aria-label={`${title}，${statusLabel}`}>
      {body}
    </article>
  );
}
