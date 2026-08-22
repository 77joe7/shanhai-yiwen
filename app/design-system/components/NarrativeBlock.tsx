"use client";

/**
 * 组件 03 · NarrativeBlock（说明书十一.3、十二.4、十四.2）
 *
 * 7 类型：旁白 / 观察 / 系统记录 / 异兆 / NPC 对话 / 玩家说话 / 玩家行动。
 * 版式：全宽旁白、左侧 NPC、右侧玩家、居中异兆与系统记录。
 * 逐字播放约每秒 33 字（令牌 `--ds-mo-typewriter-cps`），播放期间「显示全文」始终可见可访问。
 *
 * 减弱动效：调用方须传 `typewriter={false}`（demo 已按 `reducedMotion` 联动），
 * 此时组件直接显示完整文本，光标结构亦由 CSS 关闭。
 */

import { useCallback, useEffect, useState } from "react";
import { TYPEWRITER_CPS } from "../tokens";

export type NarrativeKind =
  | "narration"
  | "observation"
  | "system"
  | "omen"
  | "npc"
  | "player-speech"
  | "player-action";

export interface NarrativeBlockProps {
  /** 叙事类型。 */
  kind: NarrativeKind;
  /** 时间标签。 */
  timeLabel?: string;
  /** 地点标签。 */
  locationLabel?: string;
  /** 正文。 */
  text: string;
  /** 是否为最新节点（刷痕标记）。 */
  isLatest?: boolean;
  /** 是否逐字播放。 */
  typewriter?: boolean;
  /** 点击「显示全文」时的回调。 */
  onRevealAll?: () => void;
}

/** 类型 → 中文类别名（同时用于读屏播报，说明书十二.4（2））。 */
const KIND_LABEL: Record<NarrativeKind, string> = {
  narration: "旁白",
  observation: "观察",
  system: "系统记录",
  omen: "异兆",
  npc: "对话",
  "player-speech": "你，说话",
  "player-action": "你，行动",
};

/** 类型 → 类别小标记（文字标记，不依赖颜色）。 */
const KIND_MARK: Record<NarrativeKind, string> = {
  narration: "白",
  observation: "察",
  system: "记",
  omen: "兆",
  npc: "话",
  "player-speech": "言",
  "player-action": "行",
};

/** 逐字播放进度：以批次签名 + 已显字数记账。 */
interface TypewriterProgress {
  /** 播放批次签名（类型 + 开关 + 文本）。 */
  runId: string;
  /** 该批次已显示的字数。 */
  count: number;
}

/**
 * 叙事块组件。
 *
 * @param props 组件属性。
 * @returns 叙事块元素。
 */
export function NarrativeBlock({
  kind,
  timeLabel,
  locationLabel,
  text,
  isLatest = false,
  typewriter = false,
  onRevealAll,
}: NarrativeBlockProps) {
  const shouldReveal = typewriter && text.length > 0;

  /**
   * 逐字进度按「播放批次」记账。
   *
   * 换文本或切换逐字开关时，批次签名 `runId` 随之改变，渲染期即可纯计算出「进度归零」，
   * 因此不需要在 effect 体里同步 `setState` 去重置——那会触发级联渲染。
   * 写 state 只发生在定时器回调与用户点击「显示全文」这两个异步/事件时机。
   */
  const runId = `${kind}|${String(typewriter)}|${text}`;
  const [progress, setProgress] = useState<TypewriterProgress>({ runId, count: 0 });

  const revealed = shouldReveal ? (progress.runId === runId ? progress.count : 0) : text.length;
  const isRevealing = shouldReveal && revealed < text.length;

  useEffect(() => {
    if (!isRevealing) return undefined;
    const stepMs = Math.max(1, Math.round(1000 / TYPEWRITER_CPS));
    const timer = setInterval(() => {
      setProgress((previous) => {
        if (previous.runId !== runId) return { runId, count: 1 };
        // 已播完则返回原对象，让 React 跳过重渲染，定时器随后被 cleanup 清掉。
        if (previous.count >= text.length) return previous;
        return { runId, count: previous.count + 1 };
      });
    }, stepMs);
    return () => {
      clearInterval(timer);
    };
  }, [isRevealing, runId, text.length]);

  const revealAll = useCallback(() => {
    setProgress({ runId, count: text.length });
    onRevealAll?.();
  }, [runId, text.length, onRevealAll]);

  const visibleText = isRevealing ? text.slice(0, revealed) : text;

  return (
    <article
      className="ds-narrative"
      data-kind={kind}
      data-latest={isLatest ? "true" : "false"}
      aria-label={KIND_LABEL[kind]}
      aria-busy={isRevealing ? "true" : "false"}
    >
      <div className="ds-narrative-meta ds-type-label">
        <span className="ds-narrative-mark" aria-hidden="true">
          {KIND_MARK[kind]}
        </span>
        <span>{KIND_LABEL[kind]}</span>
        {timeLabel !== undefined && timeLabel.length > 0 ? <span>{timeLabel}</span> : null}
        {locationLabel !== undefined && locationLabel.length > 0 ? <span>{locationLabel}</span> : null}
        {isLatest ? (
          <span className="ds-narrative-latest-flag">
            <span aria-hidden="true">◆</span>
            <span>最新剧情</span>
          </span>
        ) : null}
      </div>

      <p className="ds-narrative-text ds-type-body">
        {visibleText}
        {isRevealing ? <span className="ds-caret" aria-hidden="true" /> : null}
      </p>

      {isRevealing ? (
        <div className="ds-narrative-actions">
          <button type="button" className="ds-action ds-transition" onClick={revealAll}>
            <span className="ds-action-label ds-type-label">显示全文</span>
          </button>
          <p className="ds-action-reason ds-type-label" role="status">
            剧情正在展开，请使用显示全文或等待
          </p>
        </div>
      ) : null}
    </article>
  );
}
