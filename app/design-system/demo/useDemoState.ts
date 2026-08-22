"use client";

/**
 * living demo 的「局部交互状态」。
 *
 * 与 `DesignSystemRoot` 的职责分工：
 * - `DesignSystemRoot` 管全局显示模式（高对比 / 减弱动效 / 纹理 / 断点 / 搜索），影响令牌取值；
 * - 本 hook 管演示场景内部的交互事实（抽屉开合、状态机切换、未读计数、行为日志），不影响令牌。
 *
 * 这样拆分的好处：状态机切换不会引起令牌对象重算，也不会让全局 Provider 因一次点击整树重渲染。
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { EvidenceStatus } from "../components";
import type { DangerLevel, MarkerStatus, NarrativeKind } from "../components";

/** 令牌分组筛选值：`all` 或某个分组。 */
export type TokenGroupFilter = "all" | "color" | "font" | "space" | "shape" | "texture" | "motion";

/** 证物卡 7 状态的循环顺序（与说明书十一.4 一致）。 */
export const EVIDENCE_CYCLE: EvidenceStatus[] = [
  "unknown",
  "rumor",
  "evidence",
  "insight",
  "locked",
  "obtained",
  "lost",
];

/** 地图标记 6 状态循环顺序（说明书十一.8）。 */
export const MARKER_CYCLE: MarkerStatus[] = [
  "current",
  "reached",
  "clue",
  "danger",
  "locked",
  "hidden",
];

/** 威胁面板 6 状态循环顺序（说明书十一.7）。 */
export const THREAT_CYCLE: DangerLevel[] = [
  "unknown",
  "observed",
  "negotiable",
  "dangerous",
  "critical",
  "resolved",
];

/** 叙事类型循环顺序（说明书十一.3 七类）。 */
export const NARRATIVE_CYCLE: NarrativeKind[] = [
  "narration",
  "observation",
  "system",
  "omen",
  "npc",
  "player-speech",
  "player-action",
];

/** demo 局部状态。 */
export interface DemoState {
  drawerOpen: boolean;
  evidenceStatus: EvidenceStatus;
  markerStatus: MarkerStatus;
  threatLevel: DangerLevel;
  narrativeKind: NarrativeKind;
  topBarLoading: boolean;
  awayFromLatest: boolean;
  unreadCount: number;
  selectedAction: string;
  tokenGroup: TokenGroupFilter;
  life: number;
  replayKey: number;
  log: string[];
}

/** demo 行为。 */
export interface DemoActions {
  openDrawer: () => void;
  closeDrawer: () => void;
  cycleEvidence: () => void;
  setEvidenceStatus: (status: EvidenceStatus) => void;
  cycleMarker: () => void;
  setMarkerStatus: (status: MarkerStatus) => void;
  cycleThreat: () => void;
  setThreatLevel: (level: DangerLevel) => void;
  setNarrativeKind: (kind: NarrativeKind) => void;
  toggleTopBarLoading: () => void;
  toggleAwayFromLatest: () => void;
  addUnread: () => void;
  backToLatest: () => void;
  selectAction: (label: string) => void;
  setTokenGroup: (group: TokenGroupFilter) => void;
  setLife: (value: number) => void;
  replayNarrative: () => void;
  pushLog: (message: string) => void;
}

/** hook 返回值：状态 + 行为 + 抽屉触发元素 ref。 */
export interface DemoStore extends DemoState, DemoActions {
  /**
   * 抽屉触发按钮 ref。抽屉关闭后需把焦点还给触发者（WCAG 2.4.3）。
   */
  drawerTriggerRef: React.RefObject<HTMLButtonElement | null>;
}

/** 行为日志上限。 */
const LOG_MAX = 8;

/** 初始状态。 */
const INITIAL_STATE: DemoState = {
  drawerOpen: false,
  evidenceStatus: "rumor",
  markerStatus: "current",
  threatLevel: "observed",
  narrativeKind: "narration",
  topBarLoading: false,
  awayFromLatest: true,
  unreadCount: 2,
  selectedAction: "",
  tokenGroup: "all",
  life: 62,
  replayKey: 0,
  log: [],
};

/**
 * 取循环数组的下一项。
 */
function nextInCycle<T>(cycle: T[], current: T): T {
  const index = cycle.indexOf(current);
  if (index < 0) return cycle[0];
  return cycle[(index + 1) % cycle.length];
}

/**
 * living demo 局部状态 hook。
 */
export function useDemoState(): DemoStore {
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const pushLog = useCallback((message: string) => {
    setState((previous) => ({
      ...previous,
      log: [message, ...previous.log].slice(0, LOG_MAX),
    }));
  }, []);

  const openDrawer = useCallback(() => {
    setState((previous) => ({
      ...previous,
      drawerOpen: true,
      log: ["打开角色与任务抽屉", ...previous.log].slice(0, LOG_MAX),
    }));
  }, []);

  const closeDrawer = useCallback(() => {
    setState((previous) => ({
      ...previous,
      drawerOpen: false,
      log: ["关闭抽屉，焦点已还给触发按钮", ...previous.log].slice(0, LOG_MAX),
    }));
    drawerTriggerRef.current?.focus();
  }, []);

  const cycleEvidence = useCallback(() => {
    setState((previous) => {
      const status = nextInCycle(EVIDENCE_CYCLE, previous.evidenceStatus);
      return {
        ...previous,
        evidenceStatus: status,
        log: [`证物卡状态 → ${status}`, ...previous.log].slice(0, LOG_MAX),
      };
    });
  }, []);

  const setEvidenceStatus = useCallback((status: EvidenceStatus) => {
    setState((previous) => ({ ...previous, evidenceStatus: status }));
  }, []);

  const cycleMarker = useCallback(() => {
    setState((previous) => {
      const status = nextInCycle(MARKER_CYCLE, previous.markerStatus);
      return {
        ...previous,
        markerStatus: status,
        log: [`地图标记状态 → ${status}`, ...previous.log].slice(0, LOG_MAX),
      };
    });
  }, []);

  const setMarkerStatus = useCallback((status: MarkerStatus) => {
    setState((previous) => ({ ...previous, markerStatus: status }));
  }, []);

  const cycleThreat = useCallback(() => {
    setState((previous) => {
      const level = nextInCycle(THREAT_CYCLE, previous.threatLevel);
      return {
        ...previous,
        threatLevel: level,
        log: [`威胁等级 → ${level}`, ...previous.log].slice(0, LOG_MAX),
      };
    });
  }, []);

  const setThreatLevel = useCallback((level: DangerLevel) => {
    setState((previous) => ({ ...previous, threatLevel: level }));
  }, []);

  const setNarrativeKind = useCallback((kind: NarrativeKind) => {
    setState((previous) => ({
      ...previous,
      narrativeKind: kind,
      replayKey: previous.replayKey + 1,
    }));
  }, []);

  const toggleTopBarLoading = useCallback(() => {
    setState((previous) => ({ ...previous, topBarLoading: !previous.topBarLoading }));
  }, []);

  const toggleAwayFromLatest = useCallback(() => {
    setState((previous) => ({ ...previous, awayFromLatest: !previous.awayFromLatest }));
  }, []);

  const addUnread = useCallback(() => {
    setState((previous) => ({
      ...previous,
      awayFromLatest: true,
      unreadCount: previous.unreadCount + 1,
    }));
  }, []);

  const backToLatest = useCallback(() => {
    setState((previous) => ({
      ...previous,
      awayFromLatest: false,
      unreadCount: 0,
      log: ["回到卷尾，未读计数归零", ...previous.log].slice(0, LOG_MAX),
    }));
  }, []);

  const selectAction = useCallback((label: string) => {
    setState((previous) => ({
      ...previous,
      selectedAction: previous.selectedAction === label ? "" : label,
      log: [`选择行动：${label}`, ...previous.log].slice(0, LOG_MAX),
    }));
  }, []);

  const setTokenGroup = useCallback((group: TokenGroupFilter) => {
    setState((previous) => ({ ...previous, tokenGroup: group }));
  }, []);

  const setLife = useCallback((value: number) => {
    const clamped = Math.min(Math.max(Math.round(value), 0), 100);
    setState((previous) => ({ ...previous, life: clamped }));
  }, []);

  const replayNarrative = useCallback(() => {
    setState((previous) => ({ ...previous, replayKey: previous.replayKey + 1 }));
  }, []);

  return useMemo<DemoStore>(
    () => ({
      ...state,
      drawerTriggerRef,
      openDrawer,
      closeDrawer,
      cycleEvidence,
      setEvidenceStatus,
      cycleMarker,
      setMarkerStatus,
      cycleThreat,
      setThreatLevel,
      setNarrativeKind,
      toggleTopBarLoading,
      toggleAwayFromLatest,
      addUnread,
      backToLatest,
      selectAction,
      setTokenGroup,
      setLife,
      replayNarrative,
      pushLog,
    }),
    [
      state,
      openDrawer,
      closeDrawer,
      cycleEvidence,
      setEvidenceStatus,
      cycleMarker,
      setMarkerStatus,
      cycleThreat,
      setThreatLevel,
      setNarrativeKind,
      toggleTopBarLoading,
      toggleAwayFromLatest,
      addUnread,
      backToLatest,
      selectAction,
      setTokenGroup,
      setLife,
      replayNarrative,
      pushLog,
    ],
  );
}
