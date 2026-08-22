"use client";

/**
 * 组件 12 · BackToLatestButton（说明书十一.12、十四.1）
 *
 * 属性：visibleWhenAwayFromLatest、unreadCount、onClick。
 *
 * 设计要点：
 * - 仅当读者离开卷尾时出现；隐藏时仍保留等高占位（`.ds-back-latest-slot` 最小 44px），
 *   避免按钮出现/消失导致叙事列整体跳动（说明书十四.1 动效克制）。
 * - 未读计数是「文字数字」而非纯色圆点，颜色之外始终有可读线索（说明书十二.6）。
 * - 计数超过 99 时显示「99+」，但读屏名称仍播报精确条数，不丢信息。
 */

export interface BackToLatestButtonProps {
  /** 是否处于「已离开卷尾」状态（由调用方的滚动判定给出）。 */
  visibleWhenAwayFromLatest: boolean;
  /** 未读新增条数。 */
  unreadCount?: number;
  /** 点击回调（回到卷尾）。 */
  onClick: () => void;
}

/** 计数显示上限，超出以「99+」表示。 */
const COUNT_DISPLAY_MAX = 99;

/**
 * 回到最新按钮组件。
 *
 * @param props 组件属性。
 * @returns 按钮元素；不可见时返回等高占位以稳定布局。
 */
export function BackToLatestButton({
  visibleWhenAwayFromLatest,
  unreadCount = 0,
  onClick,
}: BackToLatestButtonProps) {
  if (!visibleWhenAwayFromLatest) {
    // 占位保持同高，读屏跳过，避免出现「幽灵按钮」。
    return <div className="ds-back-latest-slot" aria-hidden="true" />;
  }

  const safeCount = Number.isFinite(unreadCount) && unreadCount > 0 ? Math.floor(unreadCount) : 0;
  const hasUnread = safeCount > 0;
  const countText = safeCount > COUNT_DISPLAY_MAX ? `${COUNT_DISPLAY_MAX}+` : String(safeCount);
  const ariaLabel = hasUnread ? `回到最新，有 ${safeCount} 条新记述` : "回到最新";

  return (
    <div className="ds-back-latest-slot">
      <button
        type="button"
        className="ds-back-latest ds-type-label"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <span aria-hidden="true">↓</span>
        <span>回到最新</span>
        {hasUnread ? (
          <span className="ds-back-latest-count" aria-hidden="true">
            {countText}
          </span>
        ) : null}
      </button>
    </div>
  );
}
