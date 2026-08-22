"use client";

/**
 * 组件 01 · AppTopBar（说明书十一.1）
 *
 * 属性：title、leftAction、rightAction、sticky、safeArea。
 * 状态：默认、滚动后（sticky）、返回模式、菜单模式、加载、禁用。
 *
 * 契约要点：
 * - 栏高 64 CSS px（说明书十四.1），左右操作位为 44×44 触控区（说明书十二.2）。
 * - `variant` 只决定左侧操作的默认图标语义，不伪造不存在的按钮：未传 `leftAction`
 *   时保留等宽空位以维持标题居中，避免出现无行为的假按钮。
 * - 加载态除颜色外同时具备「载入中」文字与闪动方块结构（说明书十二.6）。
 */

import type { ReactElement } from "react";

export interface TopBarAction {
  /** 无障碍名称与提示文字。 */
  label: string;
  /** 可选图标字符（不使用 emoji，保持古卷观感）。 */
  icon?: string;
  /** 点击回调。 */
  onClick: () => void;
  /** 是否禁用。 */
  disabled?: boolean;
}

export interface AppTopBarProps {
  /** 标题。 */
  title: string;
  /** 左侧操作。 */
  leftAction?: TopBarAction;
  /** 右侧操作。 */
  rightAction?: TopBarAction;
  /** 是否吸顶（滚动后状态）。 */
  sticky?: boolean;
  /** 是否套用安全区内边距。 */
  safeArea?: boolean;
  /** 模式：默认 / 返回 / 菜单。 */
  variant?: "default" | "back" | "menu";
  /** 加载态。 */
  loading?: boolean;
  /** 整栏禁用。 */
  disabled?: boolean;
}

const VARIANT_ICON: Record<NonNullable<AppTopBarProps["variant"]>, string> = {
  default: "",
  back: "←",
  menu: "≡",
};

/**
 * 渲染一个顶部栏操作按钮。
 *
 * @param action 操作定义。
 * @param fallbackIcon 模式默认图标。
 * @param barDisabled 整栏是否禁用。
 * @param side 位置（用于类名与读屏顺序）。
 * @returns 按钮元素或等宽空位。
 */
function renderAction(
  action: TopBarAction | undefined,
  fallbackIcon: string,
  barDisabled: boolean,
  side: "left" | "right",
): ReactElement {
  if (!action) {
    return <span className="ds-topbar-slot-empty" data-side={side} aria-hidden="true" />;
  }
  const icon = action.icon ?? fallbackIcon;
  const isDisabled = barDisabled || action.disabled === true;
  return (
    <button
      type="button"
      className="ds-topbar-btn ds-transition"
      data-side={side}
      onClick={action.onClick}
      disabled={isDisabled}
      aria-label={action.label}
      title={action.label}
    >
      {icon.length > 0 ? (
        <span className="ds-type-headline-mobile" aria-hidden="true">
          {icon}
        </span>
      ) : (
        <span className="ds-type-label">{action.label}</span>
      )}
    </button>
  );
}

/**
 * 顶部栏组件。
 *
 * @param props 组件属性。
 * @returns 顶部栏元素。
 */
export function AppTopBar({
  title,
  leftAction,
  rightAction,
  sticky = false,
  safeArea = false,
  variant = "default",
  loading = false,
  disabled = false,
}: AppTopBarProps) {
  const fallbackIcon = VARIANT_ICON[variant];
  return (
    <header
      className="ds-topbar"
      data-sticky={sticky ? "true" : "false"}
      data-safe-area={safeArea ? "true" : "false"}
      data-variant={variant}
      data-loading={loading ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      aria-label={`顶部栏：${title}`}
      aria-busy={loading ? "true" : "false"}
    >
      {renderAction(leftAction, fallbackIcon, disabled, "left")}
      <h2 className="ds-topbar-title ds-type-headline-mobile">
        {loading ? (
          <span className="ds-topbar-loading ds-type-label">
            <span>载入中</span>
            <span className="ds-sr-only">{title}</span>
          </span>
        ) : (
          title
        )}
      </h2>
      {renderAction(rightAction, "", disabled, "right")}
    </header>
  );
}
