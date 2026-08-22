"use client";

/**
 * 页面视觉规范卡（方案一延伸 · 6 维度）。
 *
 * 每张产品页除「可交互预览」外，附一份结构化设计规范，覆盖：
 * 整体布局结构 / 配色方案 / 字体排版 / 组件样式 / 间距与层次 / 响应式断点。
 * 规范文本一律引用 `--ds-*` 令牌名与组件名，不写死具体色值，便于评审与迭代。
 */

import type { ReactNode } from "react";

/** 页面视觉规范（6 维度，结构化字符串）。 */
export interface PageSpec {
  /** 整体布局结构。 */
  layout: string;
  /** 配色方案。 */
  color: string;
  /** 字体排版。 */
  typography: string;
  /** 组件样式。 */
  components: string;
  /** 间距与层次。 */
  spacing: string;
  /** 响应式断点。 */
  breakpoints: string;
}

/** 维度顺序与中文名（同时作读屏分组标题）。 */
const DIMENSIONS: { key: keyof PageSpec; label: string }[] = [
  { key: "layout", label: "整体布局结构" },
  { key: "color", label: "配色方案" },
  { key: "typography", label: "字体排版" },
  { key: "components", label: "组件样式" },
  { key: "spacing", label: "间距与层次" },
  { key: "breakpoints", label: "响应式断点" },
];

/**
 * 视觉规范卡：<details> 默认展开，逐维度列出规范。
 *
 * @param props.title 页面名（作卡片标题）。
 * @param props.spec  规范数据。
 * @returns 规范卡元素。
 */
export function SpecCard({ title, spec }: { title: string; spec: PageSpec }): ReactNode {
  return (
    <details className="ds-spec" open>
      <summary className="ds-spec-title ds-type-headline-mobile">
        {title} · 视觉设计规范
      </summary>
      <div className="ds-spec-grid">
        {DIMENSIONS.map(({ key, label }) => (
          <div className="ds-spec-item" key={key}>
            <span className="ds-spec-key ds-type-label">{label}</span>
            <p className="ds-spec-val ds-type-body-sm">{spec[key]}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
