"use client";

/**
 * 组件 09 · MapMarker（说明书十一.9、十二.4（5））
 *
 * 6 状态：当前 / 已达 / 线索 / 危险 / 锁定 / 未显形。
 * 铁律：状态由「中文状态文字 + 类型符号 + 边框结构（实线/虚线/点线/加粗）」共同表达；
 * 地点名称与可达状态必须可被读屏读出；定位脉冲在减弱动效下关闭（CSS 已处理）。
 */

export type MarkerStatus = "current" | "reached" | "clue" | "danger" | "locked" | "hidden";
export type MarkerKind = "mountain" | "city" | "water" | "clue" | "danger" | "shrine";

export interface MapMarkerProps {
  /** 地点类型。 */
  kind: MarkerKind;
  /** 地点名称。 */
  name: string;
  /** 状态。 */
  status?: MarkerStatus;
  /** 是否为当前所在（优先于 status 判定当前态）。 */
  isCurrent?: boolean;
  /** 是否可达。 */
  isReachable?: boolean;
  /** 锁定提示文字。 */
  lockedHint?: string;
  /** 点击回调。 */
  onClick?: () => void;
}

/** 类型 → 符号。 */
const KIND_GLYPH: Record<MarkerKind, string> = {
  mountain: "山",
  city: "邑",
  water: "水",
  clue: "痕",
  danger: "凶",
  shrine: "祠",
};

/** 类型 → 中文名。 */
const KIND_LABEL: Record<MarkerKind, string> = {
  mountain: "山岭",
  city: "聚落",
  water: "水域",
  clue: "线索",
  danger: "凶险",
  shrine: "祠庙",
};

/** 状态 → 中文名。 */
const STATUS_LABEL: Record<MarkerStatus, string> = {
  current: "当前",
  reached: "已达",
  clue: "线索",
  danger: "危险",
  locked: "锁定",
  hidden: "未显形",
};

/**
 * 地图标记组件。
 *
 * @param props 组件属性。
 * @returns 标记元素。
 */
export function MapMarker({
  kind,
  name,
  status = "reached",
  isCurrent = false,
  isReachable = true,
  lockedHint,
  onClick,
}: MapMarkerProps) {
  const effectiveStatus: MarkerStatus = isCurrent ? "current" : status;
  const statusLabel = STATUS_LABEL[effectiveStatus];
  const locked = effectiveStatus === "locked" || effectiveStatus === "hidden";
  const reachable = locked ? false : isReachable;
  const reachText = reachable ? "可前往" : "不可前往";
  const displayName = effectiveStatus === "hidden" ? "未显形之地" : name;

  return (
    <span className="ds-marker-wrap">
      <button
        type="button"
        className="ds-marker ds-transition"
        data-kind={kind}
        data-status={effectiveStatus}
        data-reachable={reachable ? "true" : "false"}
        disabled={locked}
        aria-label={`${displayName}，${KIND_LABEL[kind]}，${statusLabel}，${reachText}`}
        onClick={onClick}
      >
        <i className="ds-marker-glyph ds-type-label" aria-hidden="true">
          {KIND_GLYPH[kind]}
        </i>
        {effectiveStatus === "current" ? (
          <span className="ds-marker-pulse" aria-hidden="true" />
        ) : null}
        <span className="ds-marker-name ds-type-label">{displayName}</span>
        <span className="ds-marker-name ds-type-label" aria-hidden="true">
          {statusLabel}
        </span>
      </button>
      {locked && lockedHint !== undefined && lockedHint.length > 0 ? (
        <span className="ds-marker-hint ds-type-label">{lockedHint}</span>
      ) : null}
    </span>
  );
}
