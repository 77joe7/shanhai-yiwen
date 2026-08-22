"use client";

/**
 * 组件 06 · StatusMeter（说明书十一.6、十二.4（4）、十二.6）
 *
 * 细方形轨道、固色填充、数字可见。
 * 铁律：状态条除视觉长度外**必须**有「当前值/最大值」文本；警告态除颜色外
 * 同时具备「告急/危急」文字 + 轨道加粗（结构变化），不得仅依赖颜色。
 */

export type MeterTone = "life" | "stamina" | "resolve" | "neutral";
export type WarningState = "normal" | "warning" | "critical";

export interface StatusMeterProps {
  /** 名称。 */
  label: string;
  /** 当前值。 */
  value: number;
  /** 最大值。 */
  max: number;
  /** 语义色调。 */
  tone?: MeterTone;
  /** 简易警告开关（等价于 warningState="warning"）。 */
  warning?: boolean;
  /** 精确警告等级，优先于 `warning`。 */
  warningState?: WarningState;
}

/** 语义色 → 读屏补充说明（保证语义色不唯色）。 */
const TONE_MEANING: Record<MeterTone, string> = {
  life: "生命与伤势",
  stamina: "精力与准备",
  resolve: "定力与认知",
  neutral: "一般状态",
};

/** 警告等级 → 中文文字标记。 */
const WARNING_LABEL: Record<WarningState, string> = {
  normal: "",
  warning: "告急",
  critical: "危急",
};

/**
 * 状态条组件。
 *
 * @param props 组件属性。
 * @returns 状态条元素。
 */
export function StatusMeter({
  label,
  value,
  max,
  tone = "neutral",
  warning = false,
  warningState,
}: StatusMeterProps) {
  const safeMax = max > 0 ? max : 1;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);
  const effectiveWarning: WarningState = warningState ?? (warning ? "warning" : "normal");
  const warningText = WARNING_LABEL[effectiveWarning];
  const valueText = `${safeValue}/${safeMax}`;

  return (
    <div className="ds-meter" data-tone={tone} data-warning={effectiveWarning}>
      <div className="ds-meter-head">
        <span className="ds-meter-label ds-type-label">
          {label}
          <span className="ds-sr-only">（{TONE_MEANING[tone]}）</span>
        </span>
        <span className="ds-meter-value ds-type-label">
          {warningText.length > 0 ? (
            <span className="ds-meter-flag">
              <span aria-hidden="true">▲</span>
              <span>{warningText}</span>
            </span>
          ) : null}
          {" "}
          {valueText}
        </span>
      </div>
      <div
        className="ds-meter-track"
        role="meter"
        aria-label={`${label} ${warningText.length > 0 ? warningText : ""}`.trim()}
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={`${valueText}${warningText.length > 0 ? `，${warningText}` : ""}`}
      >
        <div className="ds-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
