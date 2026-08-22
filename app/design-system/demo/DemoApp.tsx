"use client";

/**
 * living demo 编排层。
 *
 * 由 `app/design-system/page.tsx`（Server Component）作为 `children` 传入
 * `<DesignSystemRoot>`，因此本文件不导入 `page.tsx`，不存在循环依赖。
 *
 * 结构：标题 → 控制台（8 控件） → 八大展示区 → 复制反馈 toast → 页脚。
 * 全局状态一律经 `useDesignSystem()` 读写；局部展示态经 `useDemoState()`。
 */

import { useDesignSystem } from "../DesignSystemRoot";
import { DemoControls } from "./controls";
import {
  A11yShowcase,
  BreakpointSimulator,
  ComponentGallery,
  IllustrationShowcase,
  Playground,
  SpacingRuler,
  TokenSwatches,
  TypeRuler,
} from "./sections";
import { PageShowcase } from "./pageShowcase";
import { useDemoState } from "./useDemoState";
import { ALL_TOKENS } from "../tokens";

/**
 * living demo 根组件。
 *
 * @returns demo 页面内容。
 */
export function DemoApp() {
  const demo = useDemoState();
  const { highContrast, reducedMotion, texture, activeBreakpoint, frameWidth, copyFeedback } =
    useDesignSystem();

  return (
    <div className="ds-demo">
      <header className="ds-demo-header">
        <span className="ds-demo-eyebrow ds-type-label">山海异闻录 · 天地未定</span>
        <h1 className="ds-type-display">设计系统 living demo</h1>
        <p className="ds-demo-lede ds-type-body">
          本页是《山海异闻录》UI 界面说明书 V1.3 的可运行实现：{ALL_TOKENS.length} 条设计令牌、
          13 个正式组件、9 个展示区。所有取值皆由 <code>tokens.ts</code> 单一来源在服务端直出
          为 <code>--ds-*</code>，故首屏不会先按站点浅色变量渲染再闪变。
        </p>
        <p className="ds-demo-lede ds-type-body-sm">
          当前状态：{highContrast ? "高对比" : "标准对比"} · {reducedMotion ? "减弱动效" : "常规动效"} ·
          纹理 {texture === "full" ? "细颗粒 5%" : "已降级"} · frame {frameWidth}px（
          {activeBreakpoint.label}档）
        </p>
      </header>

      <DemoControls store={demo} />

      <TokenSwatches demo={demo} />
      <TypeRuler />
      <SpacingRuler />
      <ComponentGallery demo={demo} />
      <IllustrationShowcase />
      <Playground demo={demo} />
      <A11yShowcase />
      <BreakpointSimulator demo={demo} />
      <PageShowcase />

      <footer className="ds-note ds-type-body-sm">
        本页样式全部封闭在 <code>.shj-ds</code> 作用域内，未改动 <code>app/globals.css</code>；
        所有浏览器能力（剪贴板、安全区）经 <code>dsPlatform.ts</code> 适配层访问，模块顶层不触碰
        <code> navigator / window / document</code>，可在 Cloudflare Workers 上安全 SSR。
      </footer>

      {copyFeedback !== null ? (
        <div className="ds-toast" role="status">
          <span className="ds-type-label">
            {copyFeedback.ok ? "已复制到剪贴板" : "复制失败，请手动复制"}
          </span>
          <code className="ds-type-body-sm">{copyFeedback.text}</code>
        </div>
      ) : null}
    </div>
  );
}
