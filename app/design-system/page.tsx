import type { Metadata } from "next";
import "./design-system.css";
import { DesignSystemRoot } from "./DesignSystemRoot";
import { DemoApp } from "./demo/DemoApp";

export const metadata: Metadata = {
  title: "设计系统 v1 · 山海异闻录：天地未定",
  description:
    "《山海异闻录：天地未定》暗色「湿墨石」设计系统的可交互实时演示：色彩/字体/间距/形状令牌、12 组件契约、交互与可访问性规范。",
};

/**
 * `/design-system` 路由入口。
 *
 * 本文件保持 Server Component（导出 `metadata`）；客户端状态全部下沉到
 * `DesignSystemRoot`（`"use client"`）。living demo 以 children 传入，
 * 避免「根 → demo → 根」的循环导入。
 *
 * @returns 设计系统 living demo 页面。
 */
export default function DesignSystemPage() {
  return (
    <DesignSystemRoot>
      <DemoApp />
    </DesignSystemRoot>
  );
}
