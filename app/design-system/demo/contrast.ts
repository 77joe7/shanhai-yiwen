/**
 * WCAG 2.2 对比度计算与验收对照表。
 *
 * 纯函数模块：不引入 React，不访问任何浏览器全局，可在 SSR 与 node 测试中直接运行；
 * 颜色一律从 `tokens.ts` 取值（调用方传入 resolver），本文件不硬编码任何色值。
 *
 * 判定依据：
 * - 1.4.3 正文文字 ≥ 4.5:1；大号文字（≥24px 或 ≥18.66px 且加粗）≥ 3:1；
 * - 1.4.11 非文字（状态填充、边框、图形线索）≥ 3:1。
 *
 * 关于「以线索补偿」：说明书十二.6 规定状态差异不得仅靠颜色。当某个纯色填充在暗底上
 * 达不到 3:1（例如朱砂 #920703 这类深色只能作重点色而非文字色）时，正确解法不是篡改
 * 规范色值，而是同时给出文字/结构线索。此类条目判定为 `mitigated`，并在 `mitigation`
 * 字段写明补偿手段与出处，保证审计时可追溯而非被静默忽略。
 */

/** 线性 RGB 前的 8bit 通道 + alpha。 */
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** 对比度用途分类，决定合格阈值。 */
export type ContrastKind = "text" | "large-text" | "non-text";

/** 各用途的最小合格比例。 */
export const MIN_RATIO: Record<ContrastKind, number> = {
  text: 4.5,
  "large-text": 3,
  "non-text": 3,
};

/** 用途中文名。 */
export const KIND_LABEL: Record<ContrastKind, string> = {
  text: "正文文字 4.5:1",
  "large-text": "大号文字 3:1",
  "non-text": "非文字线索 3:1",
};

/**
 * 解析颜色字符串为 RGBA。
 *
 * 支持 `#rgb` / `#rrggbb` / `rgb(r, g, b)` / `rgba(r, g, b, a)`，
 * 其余形式（如 `none`、渐变）返回 `null`。
 */
export function parseColor(input: string): RgbaColor | null {
  const text = input.trim().toLowerCase();

  if (text.startsWith("#")) {
    const hex = text.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
      return { r, g, b, a: 1 };
    }
    return null;
  }

  const match = /^rgba?\(([^)]+)\)$/.exec(text);
  if (match === null) return null;
  const parts = match[1]
    .split(/[,/\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length < 3) return null;
  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  const a = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
  if ([r, g, b, a].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b, a };
}

/**
 * 将半透明前景按 alpha 合成到不透明背景上。
 */
export function compositeOver(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = Math.min(Math.max(foreground.a, 0), 1);
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  };
}

/**
 * 单通道 sRGB → 线性值。
 */
function linearize(channel: number): number {
  const normalized = Math.min(Math.max(channel, 0), 255) / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

/**
 * 计算相对亮度（WCAG 定义）。
 */
export function relativeLuminance(color: RgbaColor): number {
  return (
    0.2126 * linearize(color.r) +
    0.7152 * linearize(color.g) +
    0.0722 * linearize(color.b)
  );
}

/**
 * 计算两色对比度。前景若带 alpha，先按背景合成。
 *
 * @param foreground 前景色字符串。
 * @param background 背景色字符串（须不透明）。
 * @returns 对比度（1–21）；任一颜色无法解析时返回 `null`。
 */
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (fg === null || bg === null) return null;
  const flatFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
  const lighter = Math.max(relativeLuminance(flatFg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(flatFg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

/** 一条验收对照。 */
export interface ContrastPair {
  id: string;
  label: string;
  fgVar: string;
  bgVar: string;
  kind: ContrastKind;
  mitigation?: string;
  specRef: string;
}

/**
 * 验收对照表：覆盖全部前景/背景实际组合，含语义色与弱边框。
 */
export const CONTRAST_PAIRS: ContrastPair[] = [
  { id: "on-surface-on-bg", label: "叙事正文 / 画布", fgVar: "--ds-c-on-surface", bgVar: "--ds-c-bg", kind: "text", specRef: "说明书十二.1 正文对比度 ≥ 4.5:1" },
  { id: "on-surface-variant-on-bg", label: "辅助正文 / 画布", fgVar: "--ds-c-on-surface-variant", bgVar: "--ds-c-bg", kind: "text", specRef: "说明书十二.1 正文对比度 ≥ 4.5:1" },
  { id: "on-surface-variant-on-surface", label: "辅助正文 / 标准容器", fgVar: "--ds-c-on-surface-variant", bgVar: "--ds-c-surface", kind: "text", specRef: "说明书十二.1 正文对比度 ≥ 4.5:1" },
  { id: "outline-on-bg", label: "弱化说明文字 / 画布", fgVar: "--ds-c-outline", bgVar: "--ds-c-bg", kind: "text", specRef: "说明书十二.1 次要文字亦须达 4.5:1" },
  { id: "gold-on-surface-low", label: "金色标签 / 低层容器", fgVar: "--ds-c-gold", bgVar: "--ds-c-surface-low", kind: "text", specRef: "说明书三.1 旧丝金作强调文字 · 十二.1" },
  { id: "primary-on-surface-high", label: "主色按钮文字 / 高层容器", fgVar: "--ds-c-primary", bgVar: "--ds-c-surface-high", kind: "text", specRef: "说明书三.1 primary · 十二.1" },
  { id: "error-on-bg", label: "错误提示文字 / 画布", fgVar: "--ds-c-error", bgVar: "--ds-c-bg", kind: "text", specRef: "说明书三.1 error · 十二.1" },
  { id: "gold-dim-on-surface-lowest", label: "淡金说明文字 / 最深容器", fgVar: "--ds-c-gold-dim", bgVar: "--ds-c-surface-lowest", kind: "text", specRef: "说明书三.1 gold-dim · 十二.1" },
  { id: "resolve-on-bg", label: "定力语义色 / 画布", fgVar: "--ds-c-resolve", bgVar: "--ds-c-bg", kind: "non-text", mitigation: "状态条同时给出「当前值/最大值」文本与名称（StatusMeter）", specRef: "说明书三.1 定力语义（派生值）· 十二.6 不得唯色" },
  { id: "nature-on-bg", label: "自然语义色 / 画布", fgVar: "--ds-c-nature", bgVar: "--ds-c-bg", kind: "non-text", mitigation: "地点标签同时给出中文标签文字（SquareTag）", specRef: "说明书三.1 自然语义（派生值）· 十二.6 不得唯色" },
  { id: "stamina-on-surface-high", label: "精力填充 / 状态条槽", fgVar: "--ds-c-stamina", bgVar: "--ds-c-surface-high", kind: "non-text", mitigation: "状态条自带数值文本与名称，槽边框在告急时加粗", specRef: "说明书三.1 精力语义 · 十二.6" },
  { id: "life-on-surface-high", label: "生命填充 / 状态条槽", fgVar: "--ds-c-life", bgVar: "--ds-c-surface-high", kind: "non-text", mitigation: "低于阈值时追加「告急/危急」文字并加粗槽边框（StatusMeter）", specRef: "说明书三.1 生命语义 · 十二.6 状态三要素" },
  { id: "cinnabar-on-bg", label: "朱砂重点色 / 画布", fgVar: "--ds-c-cinnabar", bgVar: "--ds-c-bg", kind: "non-text", mitigation: "朱砂只作填充/描边，危险一律附「危」「慎」文字标记（ActionButton / ThreatPanel）", specRef: "说明书三.2 朱砂仅作重点不作大面积 · 十二.6" },
  { id: "outline-variant-on-surface-lowest", label: "弱边框 / 最深容器", fgVar: "--ds-c-outline-variant", bgVar: "--ds-c-surface-lowest", kind: "non-text", mitigation: "高对比模式下弱边框提升为金边 30%；边界从不作为唯一状态线索", specRef: "说明书三.5 1px 细线 · 十二.5 高对比模式" },
  { id: "border-gold-60-on-surface", label: "金边 60% / 标准容器", fgVar: "--ds-sh-border-gold-60", bgVar: "--ds-c-surface", kind: "non-text", specRef: "说明书三.5 强调边框 · 十二.1 非文字 3:1" },
];

/** 判定结果。 */
export type ContrastVerdict = "pass" | "mitigated" | "fail" | "skipped";

/** 判定中文名。 */
export const VERDICT_LABEL: Record<ContrastVerdict, string> = {
  pass: "达标",
  mitigated: "未达比例·已用文字线索补偿",
  fail: "不达标",
  skipped: "不参与计算",
};

/** 单条判定输出。 */
export interface ContrastResult {
  pair: ContrastPair;
  ratio: number | null;
  ratioHighContrast: number | null;
  minRatio: number;
  verdict: ContrastVerdict;
  verdictHighContrast: ContrastVerdict;
}

/** 取值函数签名：由调用方注入 `resolveTokenValue` 的偏应用。 */
export type TokenResolver = (varName: string, highContrast: boolean) => string;

/**
 * 依据比例与阈值给出判定。
 */
function judge(ratio: number | null, minRatio: number, mitigation?: string): ContrastVerdict {
  if (ratio === null) return "skipped";
  if (ratio >= minRatio) return "pass";
  return mitigation !== undefined && mitigation.length > 0 ? "mitigated" : "fail";
}

/**
 * 评估单条对照（同时给出常规与高对比两种模式）。
 */
export function evaluateContrast(pair: ContrastPair, resolve: TokenResolver): ContrastResult {
  const minRatio = MIN_RATIO[pair.kind];
  const ratio = contrastRatio(resolve(pair.fgVar, false), resolve(pair.bgVar, false));
  const ratioHighContrast = contrastRatio(
    resolve(pair.fgVar, true),
    resolve(pair.bgVar, true),
  );
  return {
    pair,
    ratio,
    ratioHighContrast,
    minRatio,
    verdict: judge(ratio, minRatio, pair.mitigation),
    verdictHighContrast: judge(ratioHighContrast, minRatio, pair.mitigation),
  };
}

/**
 * 评估全部对照。
 */
export function evaluateAllContrast(resolve: TokenResolver): ContrastResult[] {
  return CONTRAST_PAIRS.map((pair) => evaluateContrast(pair, resolve));
}

/**
 * 格式化比例文本。
 */
export function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toFixed(2)}:1`;
}
