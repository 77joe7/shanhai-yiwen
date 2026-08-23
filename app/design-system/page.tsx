import type { Metadata } from "next";
import "./design-system.css";
import { DesignSystemRoot } from "./DesignSystemRoot";
import { DemoApp } from "./demo/DemoApp";

export const metadata: Metadata = {
  title: "设计系统 v1 · 山海异闻录：天地未定",
  description:
    "《山海异闻录：天地未定》暗色「湿墨石」设计系统：受控令牌、12 个核心组件与 1 个媒体组件、页面视觉规范、交互与无障碍约束。",
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
