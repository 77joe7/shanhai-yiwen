/**
 * 设计系统组件统一出入口（说明书十一 全 12 组件）。
 *
 * 约定：
 * - 组件消费方只从本文件导入，不深链到单文件，便于后续重构与替换实现；
 * - 组件实现文件均以 `"use client"` 开头（含 hooks 或事件回调），故本文件被
 *   Server Component 引用时，Vite/RSC 会自动在此处切出客户端边界；
 * - 所有 Props 类型一并导出，供 living demo 与后续业务页面复用（如 `ActionButtonProps[]`）。
 */

export { AppTopBar } from "./AppTopBar";
export type { AppTopBarProps, TopBarAction } from "./AppTopBar";

export { BrushDivider } from "./BrushDivider";
export type { BrushDividerIcon, BrushDividerProps } from "./BrushDivider";

export { NarrativeBlock } from "./NarrativeBlock";
export type { NarrativeBlockProps, NarrativeKind } from "./NarrativeBlock";

export { ArchiveEvidenceCard } from "./ArchiveEvidenceCard";
export type { ArchiveEvidenceCardProps, EvidenceStatus } from "./ArchiveEvidenceCard";

export { SquareTag } from "./SquareTag";
export type { SquareTagProps, TagTone } from "./SquareTag";

export { StatusMeter } from "./StatusMeter";
export type { MeterTone, StatusMeterProps, WarningState } from "./StatusMeter";

export { ActionButton } from "./ActionButton";
export type { ActionButtonProps, DangerLevelBtn } from "./ActionButton";

export { MapMarker } from "./MapMarker";
export type { MapMarkerProps, MarkerKind, MarkerStatus } from "./MapMarker";

export { LocationCard } from "./LocationCard";
export type { LocationCardProps } from "./LocationCard";

export { ThreatPanel } from "./ThreatPanel";
export type { DangerLevel, ThreatPanelProps } from "./ThreatPanel";

export { CharacterQuestDrawer } from "./CharacterQuestDrawer";
export type { CharacterQuestDrawerProps, QuestItem } from "./CharacterQuestDrawer";

export { BackToLatestButton } from "./BackToLatestButton";
export type { BackToLatestButtonProps } from "./BackToLatestButton";

export { IllustrationFrame } from "./IllustrationFrame";
export type { IllustrationFrameProps, IllustrationKind } from "./IllustrationFrame";
