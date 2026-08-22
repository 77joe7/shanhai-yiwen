"use client";

/**
 * 组件 02 · BrushDivider（说明书十一.2、三.5）
 *
 * 1px、两端透明、中部淡金的渐变细线（模拟收笔刷痕）；可带中部菱形、残日或分类小图标。
 * 用于剧情节拍、抽屉分区、卡片标题和回合分隔。
 *
 * 实现：细线由 `::before/::after` 渲染（`pointer-events: none`），渐变取
 * `--ds-sh-brush` 令牌，不出现任何硬编码色值。
 */

import type { ReactNode } from "react";

export type BrushDividerIcon = "diamond" | "sun" | "category";

export interface BrushDividerProps {
  /** 中部标记：预设图标键或自定义节点。 */
  icon?: BrushDividerIcon | ReactNode;
  /** 中部文字标签（同时作为读屏名称）。 */
  label?: string;
}

const PRESET_GLYPH: Record<BrushDividerIcon, string> = {
  diamond: "",
  sun: "日",
  category: "类",
};

/**
 * 判断 icon 是否为预设键。
 *
 * @param icon 传入的 icon。
 * @returns 是否为预设键。
 */
function isPresetIcon(icon: unknown): icon is BrushDividerIcon {
  return icon === "diamond" || icon === "sun" || icon === "category";
}

/**
 * 刷痕分隔线组件。
 *
 * @param props 组件属性。
 * @returns 分隔线元素。
 */
export function BrushDivider({ icon, label }: BrushDividerProps) {
  const hasMark = icon !== undefined || (label !== undefined && label.length > 0);
  return (
    <div
      className="ds-brush"
      role="separator"
      aria-label={label ?? "分隔"}
      data-bare={hasMark ? "false" : "true"}
    >
      {hasMark ? (
        <span className="ds-brush-mark ds-type-label">
          {isPresetIcon(icon) ? (
            <i className="ds-brush-icon" data-icon={icon} aria-hidden="true">
              {PRESET_GLYPH[icon]}
            </i>
          ) : (
            icon
          )}
          {label !== undefined && label.length > 0 ? (
            <span className="ds-brush-label">{label}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
