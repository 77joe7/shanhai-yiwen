"use client";

/**
 * 展示区 09 · 页面范例（PageShowcase）。
 *
 * 用既有 13 组件组合出的 6 个核心游戏页：主菜单 / 地图探索 / 角色任务 /
 * 图鉴物证 / 战斗威胁 / 设置。标签页切换；当前页以 `DsViewportFrame` 承载，
 * 宽度取自全局 `frameWidth`，故「断点模拟器」与「设置页」能实时重排本区。
 * 每页下方附 `SpecCard` 视觉规范卡（6 维度）。
 */

import { useState } from "react";
import { useDesignSystem, DsViewportFrame } from "../DesignSystemRoot";
import { SquareTag } from "../components/SquareTag";
import { PAGE_DEFINITIONS } from "../pages";
import { SpecCard } from "../pages/spec";

/**
 * 页面范例展示区。
 *
 * @returns 展示区元素。
 */
export function PageShowcase(): React.ReactNode {
  const { frameWidth, activeBreakpoint } = useDesignSystem();
  const [activeId, setActiveId] = useState<string>(PAGE_DEFINITIONS[0].id);
  const active =
    PAGE_DEFINITIONS.find((page) => page.id === activeId) ?? PAGE_DEFINITIONS[0];
  const Screen = active.Screen;

  /** 手机断点用 750×1334 比例（标准 iPhone 6/7/8），其余自动高度。 */
  const aspectRatio = activeBreakpoint.id === "mobile" ? "750 / 1334" : undefined;

  return (
    <section className="ds-section" id="page-showcase">
      <header className="ds-section-head">
        <h2 className="ds-type-display">页面范例 · 设计系统落地</h2>
        <p className="ds-section-note ds-type-body-sm">
          用既有 13 个组件组合出的 6 个核心游戏页；切换断点或设置页可实时重排本区。
          每页附完整视觉设计规范（布局 / 配色 / 字体 / 组件 / 间距 / 断点）。
        </p>
      </header>

      <div className="ds-page-tabs" role="tablist" aria-label="页面切换">
        {PAGE_DEFINITIONS.map((page) => (
          <SquareTag
            key={page.id}
            label={page.name}
            tone={page.id === activeId ? "gold" : "neutral"}
            interactive
            selected={page.id === activeId}
            onClick={() => setActiveId(page.id)}
          />
        ))}
      </div>

      <p className="ds-page-tagline ds-type-body-sm">{active.tagline}</p>

      <div className="ds-page-stage">
        <DsViewportFrame
          width={frameWidth}
          label={`${active.name} 预览（${activeBreakpoint.label}档 · ${frameWidth}px）`}
          aspectRatio={aspectRatio}
        >
          <Screen />
        </DsViewportFrame>

        <SpecCard title={active.name} spec={active.spec} />
      </div>
    </section>
  );
}
