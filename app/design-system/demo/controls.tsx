"use client";

/**
 * living demo 控制台：8 个控件。
 *
 * 铁律落地：
 * - 每个开关除了勾选框，还渲染「开 / 关」文字状态（`.ds-switch-state`），任何模式都不靠颜色单独表达；
 * - 每个控件都有 `ds-control-hint` 说明「这个开关验证的是说明书哪一条」，让 demo 同时是验收清单；
 * - 控件均 ≥ 44px 触控高度，label 包裹 input，天然满足标签关联。
 */

import { useId, type ChangeEvent } from "react";
import { BREAKPOINTS, TOKEN_GROUP_LABELS, type BreakpointId, type TokenGroup } from "../tokens";
import { useDesignSystem, type TextureMode } from "../DesignSystemRoot";
import type { DemoStore, TokenGroupFilter } from "./useDemoState";

interface SwitchControlProps {
  title: string;
  hint: string;
  checked: boolean;
  onLabel?: string;
  offLabel?: string;
  onChange: (next: boolean) => void;
}

/**
 * 文字状态开关。
 */
function SwitchControl({
  title,
  hint,
  checked,
  onLabel = "开",
  offLabel = "关",
  onChange,
}: SwitchControlProps) {
  return (
    <div className="ds-control">
      <label className="ds-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        />
        <span className="ds-type-label">{title}</span>
        <span className="ds-switch-state ds-type-label">{checked ? onLabel : offLabel}</span>
      </label>
      <p className="ds-control-hint ds-type-body-sm">{hint}</p>
    </div>
  );
}

interface SelectControlProps<T extends string> {
  title: string;
  hint: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}

/**
 * 下拉选择控件。
 */
function SelectControl<T extends string>({
  title,
  hint,
  value,
  options,
  onChange,
}: SelectControlProps<T>) {
  const id = useId();
  return (
    <div className="ds-control">
      <label className="ds-control-title ds-type-label" htmlFor={id}>
        {title}
      </label>
      <select
        id={id}
        className="ds-select ds-type-label"
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="ds-control-hint ds-type-body-sm">{hint}</p>
    </div>
  );
}

interface RangeControlProps {
  title: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (next: number) => void;
}

/**
 * 数值滑块控件（当前值以文字同步显示，不靠滑块位置猜）。
 */
function RangeControl({
  title,
  hint,
  value,
  min,
  max,
  step,
  unit,
  disabled = false,
  onChange,
}: RangeControlProps) {
  const id = useId();
  return (
    <div className="ds-control">
      <label className="ds-control-title ds-type-label" htmlFor={id}>
        {title}
        <span className="ds-switch-state ds-type-label">
          {value}
          {unit}
        </span>
      </label>
      <input
        id={id}
        className="ds-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
      />
      <p className="ds-control-hint ds-type-body-sm">
        {disabled ? `${hint}（当前为预设断点，切到「自由拖动」后可用）` : hint}
      </p>
    </div>
  );
}

interface TextControlProps {
  title: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}

/**
 * 文本输入控件。
 */
function TextControl({ title, hint, value, placeholder, onChange }: TextControlProps) {
  const id = useId();
  return (
    <div className="ds-control">
      <label className="ds-control-title ds-type-label" htmlFor={id}>
        {title}
      </label>
      <input
        id={id}
        className="ds-text-input ds-type-body-sm"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      <p className="ds-control-hint ds-type-body-sm">{hint}</p>
    </div>
  );
}

/** 分组筛选选项：`all` + 六个令牌分组。 */
const GROUP_OPTIONS: { value: TokenGroupFilter; label: string }[] = [
  { value: "all", label: "全部分组" },
  ...(Object.keys(TOKEN_GROUP_LABELS) as TokenGroup[]).map((group) => ({
    value: group as TokenGroupFilter,
    label: TOKEN_GROUP_LABELS[group],
  })),
];

/** 纹理选项。 */
const TEXTURE_OPTIONS: { value: TextureMode; label: string }[] = [
  { value: "full", label: "全纹理（噪点 5%）" },
  { value: "simple", label: "简化（关闭噪点）" },
];

/** 断点选项。 */
const BREAKPOINT_OPTIONS: { value: BreakpointId; label: string }[] = BREAKPOINTS.map(
  (breakpoint) => ({
    value: breakpoint.id,
    label: `${breakpoint.label}（${breakpoint.id === "free" ? "360—1600" : `${breakpoint.min}—${breakpoint.max}`} px）`,
  }),
);

export interface DemoControlsProps {
  store: DemoStore;
}

/**
 * demo 控制台。
 */
export function DemoControls({ store }: DemoControlsProps) {
  const ds = useDesignSystem();
  const isFree = ds.breakpoint === "free";

  return (
    <section className="ds-section" aria-labelledby="ds-controls-title">
      <div className="ds-section-head">
        <h2 className="ds-section-title ds-type-headline" id="ds-controls-title">
          控制台
        </h2>
        <p className="ds-section-note ds-type-body-sm">
          每一项都对应说明书里的一条硬约束。切换后请直接观察下方各区，令牌为唯一真源，
          首屏由服务端渲染即带上全部 <code>--ds-*</code>，不存在浅色闪变。
        </p>
      </div>

      <div className="ds-controls">
        <SwitchControl
          title="高对比模式"
          hint="十二.5：文字与边界对比提升、噪点归零。切换后可对照下方「可访问性验收」两列比例。"
          checked={ds.highContrast}
          onChange={(next) => ds.set({ highContrast: next })}
        />

        <SwitchControl
          title="减弱动效"
          hint="十二.5：仅保留必要过渡。开启后逐字播放与脉冲呼吸一并停止，光标结构也隐藏。"
          checked={ds.reducedMotion}
          onChange={(next) => ds.set({ reducedMotion: next, typewriter: next ? false : ds.typewriter })}
        />

        <SelectControl<TextureMode>
          title="纹理层级"
          hint="三.6：噪点为 5% 细颗粒且不可拦截指针。高对比模式会强制降为简化。"
          value={ds.texture}
          options={TEXTURE_OPTIONS}
          onChange={(next) => ds.set({ texture: next })}
        />

        <SwitchControl
          title="逐字播放"
          hint="十四.1：约每秒 33 字，且必须提供「显示全文」出口。减弱动效时自动关闭。"
          checked={ds.typewriter && !ds.reducedMotion}
          onChange={(next) => ds.set({ typewriter: next, reducedMotion: next ? false : ds.reducedMotion })}
        />

        <SwitchControl
          title="语义色附加文字"
          hint="十二.6 反例开关：关闭后语义色的文字线索会被隐藏，用来自证「唯色」不可接受。"
          checked={ds.semanticText}
          onLabel="保留（合规）"
          offLabel="隐藏（反例）"
          onChange={(next) => ds.set({ semanticText: next })}
        />

        <SelectControl<BreakpointId>
          title="断点预设"
          hint="十三：切换后下方「断点剧场」的 frame 宽度随之改变，布局由容器查询驱动。"
          value={ds.breakpoint}
          options={BREAKPOINT_OPTIONS}
          onChange={(next) => {
            const target = BREAKPOINTS.find((breakpoint) => breakpoint.id === next);
            ds.set({ breakpoint: next, frameWidth: target?.width ?? ds.frameWidth });
          }}
        />

        <RangeControl
          title="自由宽度"
          hint="十三：手动拖过 720 / 1050 两个阈值，验证抽屉转窄栏与三栏切换。"
          value={ds.frameWidth}
          min={360}
          max={1600}
          step={10}
          unit="px"
          disabled={!isFree}
          onChange={(next) => ds.set({ frameWidth: next })}
        />

        <TextControl
          title="令牌搜索"
          hint="按中文名、变量名或规范出处过滤下方令牌画板与总表，用于快速定位取值来源。"
          value={ds.search}
          placeholder="例如：朱砂 / --ds-c-gold / 三.1"
          onChange={(next) => ds.set({ search: next })}
        />
      </div>

      <div className="ds-controls">
        <SelectControl<TokenGroupFilter>
          title="令牌分组"
          hint="与搜索联动，缩小画板范围。"
          value={store.tokenGroup}
          options={GROUP_OPTIONS}
          onChange={store.setTokenGroup}
        />

        <RangeControl
          title="演示生命值"
          hint="十二.6：跌破 50 追加「告急」、跌破 25 追加「危急」文字并加粗槽边框。"
          value={store.life}
          min={0}
          max={100}
          step={1}
          unit=" / 100"
          onChange={store.setLife}
        />

        <SwitchControl
          title="顶部栏加载态"
          hint="十二.6：加载除颜色外必须有「载入中」文字与闪动方块结构。"
          checked={store.topBarLoading}
          onChange={store.toggleTopBarLoading}
        />

        <SwitchControl
          title="已离开卷尾"
          hint="十一.12：仅在离开卷尾时出现「回到最新」，隐藏时保留等高占位不跳动。"
          checked={store.awayFromLatest}
          onLabel="已离开"
          offLabel="在卷尾"
          onChange={store.toggleAwayFromLatest}
        />
      </div>
    </section>
  );
}
