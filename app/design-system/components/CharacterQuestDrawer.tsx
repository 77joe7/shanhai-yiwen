"use client";

/**
 * 组件 11 · CharacterQuestDrawer（说明书十一.11、十二.3）
 *
 * 属性：playerSummary、quickLinks、inventoryPreview、activeQuests、openState。
 * 行为：左滑进入、遮罩关闭、Esc 关闭、焦点回归。
 *
 * 焦点与键盘（组件自身不触碰 `document`，浏览器能力一律经 `dsPlatform`）：
 * - 打开时把焦点移到抽屉容器本身（`tabIndex={-1}`，标准 dialog 模式），读屏会播报抽屉名称；
 * - Esc 关闭经 `platform.keyboard.onEscape` 订阅，仅在打开期间生效、关闭即退订。
 *   之所以不把 `onKeyDown` 绑在 `role="dialog"` 容器上：那是给非交互元素挂键盘监听
 *   （jsx-a11y/no-noninteractive-element-interactions 会正确报错），且焦点一旦落到浮层外
 *   就再也收不到 Esc；收敛到平台层同时解决这两点，SSR 下自动降级为空操作。
 * - 关闭后回到触发元素由调用方在 `onClose` 中 focus 自己的触发按钮（demo 已实现），
 *   组件不猜测调用方的 DOM 结构。
 *
 * 依赖说明：本组件通过 `useDesignSystem()` 取平台适配层，故须置于 `DesignSystemRoot` 子树内。
 * 这与样式约束一致——所有设计系统 DOM 本就必须位于 `.shj-ds` 作用域内。
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useDesignSystem } from "../DesignSystemRoot";
import { BrushDivider } from "./BrushDivider";
import { SquareTag } from "./SquareTag";

export interface QuestItem {
  /** 任务 ID。 */
  id: string;
  /** 任务名称。 */
  name: string;
  /** 任务摘要。 */
  summary?: string;
  /** 是否已完成。 */
  done?: boolean;
}

export interface CharacterQuestDrawerProps {
  /** 角色摘要区。 */
  playerSummary?: ReactNode;
  /** 快捷入口区。 */
  quickLinks?: ReactNode;
  /** 行囊速览区。 */
  inventoryPreview?: ReactNode;
  /** 人物关系速览区（血亲/盟友/友善/中立/戒备/敌对，各用独立颜色 + 文字）。 */
  relationsPreview?: ReactNode;
  /** 进行中的任务。 */
  activeQuests?: QuestItem[];
  /** 开合状态。 */
  openState: "open" | "closed";
  /** 关闭回调（遮罩点击 / Esc / 关闭按钮）。 */
  onClose?: () => void;
}

/**
 * 角色与任务抽屉组件。
 *
 * @param props 组件属性。
 * @returns 抽屉元素（含遮罩）。
 */
export function CharacterQuestDrawer({
  playerSummary,
  quickLinks,
  inventoryPreview,
  relationsPreview,
  activeQuests = [],
  openState,
  onClose,
}: CharacterQuestDrawerProps) {
  const isOpen = openState === "open";
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const { platform } = useDesignSystem();

  useEffect(() => {
    // 打开后把焦点移到抽屉容器本身（标准 dialog 模式）：读屏会播报抽屉的可访问名称，
    // 且后续 Tab 从抽屉起点开始；容器带 tabIndex={-1} 只能编程聚焦，不进 Tab 序列。
    if (isOpen) drawerRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    // Esc 关闭：仅在打开期间订阅，关闭即退订，不留全局监听。
    // 经 `dsPlatform` 而非直接 `document.addEventListener`，SSR 下自动降级为空操作。
    if (!isOpen || onClose === undefined) return undefined;
    return platform.keyboard.onEscape(onClose);
  }, [isOpen, onClose, platform]);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="ds-drawer-scrim"
          aria-label="关闭角色与任务抽屉"
          onClick={onClose}
        />
      ) : null}

      <div
        className="ds-drawer"
        data-open={openState}
        role="dialog"
        aria-modal="false"
        aria-label="角色与任务"
        aria-hidden={isOpen ? "false" : "true"}
        tabIndex={-1}
        ref={drawerRef}
      >
        <div className="ds-drawer-head">
          <h2 className="ds-type-headline-mobile">角色与任务</h2>
          <button type="button" className="ds-drawer-close ds-transition" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className="ds-sr-only">关闭抽屉</span>
          </button>
        </div>

        <BrushDivider icon="diamond" label="摘要" />
        <div className="ds-drawer-section">
          {playerSummary ?? <p className="ds-type-body-sm">尚未建立角色摘要。</p>}
        </div>

        <BrushDivider icon="category" label="任务" />
        <div className="ds-drawer-section" aria-label="进行中的任务">
          {activeQuests.length > 0 ? (
            <ul className="ds-drawer-section">
              {activeQuests.map((quest) => (
                <li
                  key={quest.id}
                  className="ds-drawer-quest"
                  data-done={quest.done === true ? "true" : "false"}
                >
                  <SquareTag
                    label={quest.done === true ? "已结" : "在办"}
                    tone={quest.done === true ? "nature" : "gold"}
                  />
                  <span className="ds-drawer-quest-name ds-type-body-sm">{quest.name}</span>
                  {quest.summary !== undefined && quest.summary.length > 0 ? (
                    <span className="ds-drawer-quest-summary ds-type-label">{quest.summary}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-type-body-sm">暂无进行中的任务。</p>
          )}
        </div>

        <BrushDivider icon="sun" label="行囊速览" />
        <div className="ds-drawer-section">
          {inventoryPreview ?? <p className="ds-type-body-sm">行囊空空。</p>}
        </div>

        <BrushDivider icon={<i className="ds-brush-icon" aria-hidden="true">缘</i>} label="人物关系" />
        <div className="ds-drawer-section" aria-label="人物关系">
          {relationsPreview ?? <p className="ds-type-body-sm">暂无相关人物。</p>}
        </div>

        {quickLinks !== undefined ? (
          <>
            <BrushDivider label="快捷入口" />
            <div className="ds-drawer-section">{quickLinks}</div>
          </>
        ) : null}
      </div>
    </>
  );
}
