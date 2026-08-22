"use client";

/**
 * 插画承载组件（说明书：地图 / 人物 / 物品等插画类内容的统一承载）。
 *
 * 设计系统对插画的固定范围（方案一）：
 * - **固定「承载」与「风格」**：统一圆角、outline-variant 描边、surface 衬底、内边距、
 *   缺失 / 加载的统一占位、风格锚定底纹（焦金舆图网格），全部引用 `--ds-*`；
 * - **不固定「画面内容」**：具体某张地图 / 人物立绘 / 物品的美术资源归素材库 + 版本管理；
 * - **可达性**：插画必须提供 `alt` 语义描述（状态三要素在内容层的延伸），不唯色；
 * - **资源隔离**：`src` 经资源映射层访问，业务方禁止硬编码真实路径（AGENTS.md 平台抽象）。
 *
 * 风格锚定由本组件样式落实：衬底取 surface 令牌、底纹取 `--ds-tx-grid-line`（焦金）、
 * 描边取 outline-variant，全程零硬编码色值。
 */

import { type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

/** 插画语义类型（用于角标与可达性分组）。 */
export type IllustrationKind = "map" | "character" | "item" | "scene" | "generic";

export interface IllustrationFrameProps {
  /** 插画语义类型，用于角标与可达性分组。 */
  kind?: IllustrationKind;
  /** 插画资源地址（须经资源映射层访问，禁止业务方硬编码真实路径）。 */
  src?: string;
  /** 无障碍替代文字（必填；缺失时显式占位并提示，满足「不唯色」）。 */
  alt: string;
  /** 底部说明文字。 */
  caption?: string;
  /** 宽高比，如 "4 / 3"（舆图）、"3 / 4"（人物立绘）、"1 / 1"（物品）。 */
  aspectRatio?: string;
  /** 资源未就绪时显示骨架 + 文字。 */
  loading?: boolean;
  /** 资源缺失 / 加载失败：统一占位，仍显示 alt 文字。 */
  failed?: boolean;
  /** 角标文字，缺省取 kind 的中文。 */
  badgeLabel?: string;
  /** 点击（如放大查看）；提供时组件转为可聚焦按钮语义。 */
  onClick?: () => void;
  /** 额外类名。 */
  className?: string;
}

const KIND_LABEL: Record<IllustrationKind, string> = {
  map: "舆图",
  character: "人物",
  item: "物品",
  scene: "场景",
  generic: "插画",
};

/**
 * 插画承载组件。
 *
 * @param props 组件属性。
 * @returns figure 包裹的插画承载容器。
 */
export function IllustrationFrame({
  kind = "generic",
  src,
  alt,
  caption,
  aspectRatio = "4 / 3",
  loading = false,
  failed = false,
  badgeLabel,
  onClick,
  className,
}: IllustrationFrameProps) {
  const badge = badgeLabel ?? KIND_LABEL[kind];
  const interactive = onClick !== undefined;
  const frameStyle: CSSProperties = { aspectRatio };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="ds-illu-shimmer" role="status" aria-label="插画加载中">
        <span className="ds-type-body-sm">载入中…</span>
      </div>
    );
  } else if (failed || src === undefined) {
    body = (
      <div className="ds-illu-missing">
        <span className="ds-illu-missing-icon" aria-hidden="true">
          ◍
        </span>
        <span className="ds-type-body-sm">{alt}</span>
        <span className="ds-type-label ds-illu-missing-note">插画缺失 · 文字替代</span>
      </div>
    );
  } else {
    body = (
      <div
        className="ds-illu-img"
        role="img"
        aria-label={alt}
        style={{ backgroundImage: `url("${src}")` }}
      />
    );
  }

  return (
    <figure
      className={
        `ds-illu${interactive ? " ds-illu-interactive" : ""}` +
        (className !== undefined ? ` ${className}` : "")
      }
      data-kind={kind}
      {...(interactive
        ? { role: "button" as const, tabIndex: 0, onClick, onKeyDown }
        : {})}
    >
      <div className="ds-illu-frame" style={frameStyle}>
        <span className="ds-illu-badge ds-type-label">{badge}</span>
        {body}
      </div>
      {caption !== undefined && caption.length > 0 ? (
        <figcaption className="ds-illu-caption ds-type-body-sm">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
