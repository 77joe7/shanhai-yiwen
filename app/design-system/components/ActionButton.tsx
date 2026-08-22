"use client";

/**
 * 组件 08 · ActionButton（说明书十一.8、十二.6）
 *
 * 样式：直角、图标上文字下、细边；按下或选中翻转为旧丝填充 + 深色文字。
 * 触控：最小 44×44 CSS px（说明书十二.2）。
 * 铁律：危险等级除朱砂色外必须同时有「危」标记与边框加粗；禁用必须给出可读原因，
 * 不得只用灰色暗示（说明书十二.6）。
 */

export type DangerLevelBtn = "none" | "low" | "high";

export interface ActionButtonProps {
  /** 图标字符。 */
  icon?: string;
  /** 行动名称。 */
  label: string;
  /** 快捷键提示。 */
  shortcut?: string;
  /** 是否可用，默认可用。 */
  enabled?: boolean;
  /** 不可用原因（禁用时必须提供，会同时用于读屏）。 */
  reason?: string;
  /** 危险等级。 */
  dangerLevel?: DangerLevelBtn;
  /** 选中态（翻转填充）。 */
  selected?: boolean;
  /** 点击回调。 */
  onClick?: () => void;
}

/** 危险等级 → 文字标记（颜色之外的第二线索）。 */
const DANGER_MARK: Record<DangerLevelBtn, string> = {
  none: "",
  low: "慎",
  high: "危",
};

/** 危险等级 → 读屏说明。 */
const DANGER_TEXT: Record<DangerLevelBtn, string> = {
  none: "",
  low: "需谨慎",
  high: "危险行动",
};

/**
 * 行动按钮组件。
 *
 * @param props 组件属性。
 * @returns 按钮元素（附禁用原因说明时为按钮 + 说明的组合）。
 */
export function ActionButton({
  icon,
  label,
  shortcut,
  enabled = true,
  reason,
  dangerLevel = "none",
  selected = false,
  onClick,
}: ActionButtonProps) {
  const mark = DANGER_MARK[dangerLevel];
  const dangerText = DANGER_TEXT[dangerLevel];
  const showReason = !enabled && reason !== undefined && reason.length > 0;
  const ariaLabel = [label, dangerText, showReason ? `不可用：${reason}` : ""]
    .filter((part) => part.length > 0)
    .join("，");

  const button = (
    <button
      type="button"
      className="ds-action ds-transition"
      data-danger={dangerLevel}
      data-selected={selected ? "true" : "false"}
      disabled={!enabled}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon !== undefined && icon.length > 0 ? (
        <i className="ds-action-icon ds-type-headline-mobile" aria-hidden="true">
          {icon}
        </i>
      ) : null}
      <span className="ds-action-label ds-type-label">{label}</span>
      {mark.length > 0 ? (
        <span className="ds-action-danger-mark ds-type-label" aria-hidden="true">
          {mark}
        </span>
      ) : null}
      {shortcut !== undefined && shortcut.length > 0 ? (
        <span className="ds-action-shortcut ds-type-label" aria-hidden="true">
          {shortcut}
        </span>
      ) : null}
    </button>
  );

  if (!showReason) return button;

  return (
    <span className="ds-action-wrap">
      {button}
      <span className="ds-action-reason ds-type-label">{reason}</span>
    </span>
  );
}
