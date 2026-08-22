/**
 * 设计系统 v1 · 令牌单一真源（Single Source of Truth）
 *
 * 真源规则：
 * 1. 本文件是所有设计令牌的唯一真源；`design-system.css` 只允许引用 `var(--ds-*)`，不得出现硬编码色值。
 * 2. 每个令牌必须填写 `specRef`（规范出处），保证逐条可溯源。
 * 3. 令牌通过 `buildTokenStyle()` 以 React `style` prop 输出到作用域根元素，
 *    因此 SSR 首屏 HTML 即携带全部变量，不存在「先浅色后暗色」的样式闪烁，
 *    也无需任何命令式 DOM 操作（不违反平台抽象边界）。
 *
 * 依据：`docs/ui-design/山海异闻录_UI界面说明书_Stitch参考包基线_V1.3.txt` 三/十一/十二/十三章
 *      + `tmp/stitch-ref/DESIGN.md`
 */

import type { CSSProperties } from "react";

/** 令牌分组。 */
export type TokenGroup = "color" | "font" | "space" | "shape" | "texture" | "motion";

/** 单个令牌的完整契约。 */
export interface TokenSpec {
  /** 稳定 ID（用于搜索与测试断言）。 */
  id: string;
  /** 分组。 */
  group: TokenGroup;
  /** 中文标签。 */
  label: string;
  /** CSS 自定义属性名。 */
  varName: string;
  /** 基准值（规范值）。 */
  value: string;
  /** 高对比模式覆盖值。颜色令牌必须提供。 */
  highContrast?: string;
  /** 规范出处，必填，不得为空。 */
  specRef: string;
}

/** 影响令牌取值的状态子集（避免 tokens.ts 依赖完整的 UI 状态类型）。 */
export interface TokenState {
  highContrast: boolean;
}

/* ------------------------------------------------------------------ *
 * 一、色彩令牌（说明书三.1，暗色「湿墨石」单主题）
 * ------------------------------------------------------------------ */

export const COLOR_TOKENS: TokenSpec[] = [
  {
    id: "bg",
    group: "color",
    label: "画布·湿墨石",
    varName: "--ds-c-bg",
    value: "#17130F",
    highContrast: "#0D0A07",
    specRef: "说明书三.1 background/画布·湿墨石 · DESIGN.md:colors.background",
  },
  {
    id: "surface-lowest",
    group: "color",
    label: "最深容器",
    varName: "--ds-c-surface-lowest",
    value: "#110E0A",
    highContrast: "#070503",
    specRef: "说明书三.1 surface-container-lowest · DESIGN.md:colors.surface-container-lowest",
  },
  {
    id: "surface-low",
    group: "color",
    label: "低层容器",
    varName: "--ds-c-surface-low",
    value: "#1F1B17",
    highContrast: "#14100C",
    specRef: "说明书三.1 surface-container-low · DESIGN.md:colors.surface-container-low",
  },
  {
    id: "surface",
    group: "color",
    label: "标准容器",
    varName: "--ds-c-surface",
    value: "#231F1B",
    highContrast: "#1A1611",
    specRef: "说明书三.1 surface-container · DESIGN.md:colors.surface-container",
  },
  {
    id: "surface-high",
    group: "color",
    label: "高层容器",
    varName: "--ds-c-surface-high",
    value: "#2E2925",
    highContrast: "#241F1A",
    specRef: "说明书三.1 surface-container-high · DESIGN.md:colors.surface-container-high",
  },
  {
    id: "surface-highest",
    group: "color",
    label: "最高层容器",
    varName: "--ds-c-surface-highest",
    value: "#39342F",
    highContrast: "#2E2924",
    specRef: "说明书三.1 surface-container-highest · DESIGN.md:colors.surface-container-highest",
  },
  {
    id: "on-surface",
    group: "color",
    label: "主文字·旧丝绢",
    varName: "--ds-c-on-surface",
    value: "#EAE1DA",
    highContrast: "#FBF7F0",
    specRef: "说明书三.1 on-surface/主文字·旧丝绢 · DESIGN.md:colors.on-surface",
  },
  {
    id: "on-surface-variant",
    group: "color",
    label: "次文字·雾纸",
    varName: "--ds-c-on-surface-variant",
    value: "#CEC5B9",
    highContrast: "#EFE7DC",
    specRef: "说明书三.1 on-surface-variant/次文字·雾纸 · DESIGN.md:colors.on-surface-variant",
  },
  {
    id: "outline",
    group: "color",
    label: "弱文字·残墨",
    varName: "--ds-c-outline",
    value: "#979085",
    highContrast: "#C6BEB0",
    specRef: "说明书三.1 outline/弱文字·残墨 · DESIGN.md:colors.outline",
  },
  {
    id: "outline-variant",
    group: "color",
    label: "弱边框",
    varName: "--ds-c-outline-variant",
    value: "#4C463D",
    highContrast: "#7C7365",
    specRef: "说明书三.1 outline-variant/弱边框 · DESIGN.md:colors.outline-variant",
  },
  {
    id: "primary",
    group: "color",
    label: "主要可交互文字·旧丝",
    varName: "--ds-c-primary",
    value: "#FFF2DE",
    highContrast: "#FFFAF0",
    specRef: "说明书三.1 primary/主要可交互文字·旧丝 · DESIGN.md:colors.primary",
  },
  {
    id: "primary-container",
    group: "color",
    label: "主要填充·旧丝",
    varName: "--ds-c-primary-container",
    value: "#E6D5B8",
    highContrast: "#F2E6CE",
    specRef: "说明书三.1 primary-container/主要填充·旧丝 · DESIGN.md:colors.primary-container",
  },
  {
    id: "gold",
    group: "color",
    label: "金色细节·焦金",
    varName: "--ds-c-gold",
    value: "#F5D294",
    highContrast: "#FBE0AE",
    specRef: "说明书三.1 tertiary-container/金色细节·焦金 · DESIGN.md:colors.tertiary-container",
  },
  {
    id: "gold-dim",
    group: "color",
    label: "固定金色·进度",
    varName: "--ds-c-gold-dim",
    value: "#D5C5A8",
    highContrast: "#E6D9C2",
    specRef: "说明书三.1 primary-fixed-dim/固定金色·进度 · DESIGN.md:colors.primary-fixed-dim",
  },
  {
    id: "cinnabar",
    group: "color",
    label: "朱砂危险",
    varName: "--ds-c-cinnabar",
    value: "#920703",
    highContrast: "#B31E14",
    specRef: "说明书三.1 secondary-container/朱砂危险 · DESIGN.md:colors.secondary-container",
  },
  {
    id: "error",
    group: "color",
    label: "危险文本",
    varName: "--ds-c-error",
    value: "#FFB4AB",
    highContrast: "#FFD2CC",
    specRef: "说明书三.1 error/危险文本 · DESIGN.md:colors.error",
  },
  {
    id: "error-container",
    group: "color",
    label: "危险底",
    varName: "--ds-c-error-container",
    value: "#93000A",
    highContrast: "#B4131D",
    specRef: "说明书三.1 error-container/危险底 · DESIGN.md:colors.error-container",
  },
  /*
   * 《黑雨》补充语义色 + 层级色彩（说明书三.1）。
   * 铁律（周工 2026-08-20 复核）：任何"等级形式"的内容——稀有度、人物关系、
   * 危险等级、其他分层——都须用**互不相同**的颜色区分，且颜色之外**必须附文字/符号**
   * （不唯色，说明书十二.6）。下列层级色为本设计系统的固定语义色板。
   * 使用时必须附文字，不得仅依赖颜色。
   */
  {
    id: "life",
    group: "color",
    label: "生命·伤势（朱砂暗红）",
    varName: "--ds-c-life",
    value: "#920703",
    highContrast: "#B31E14",
    specRef: "说明书三.1《黑雨》补充语义色：生命/伤势=朱砂与暗红（取 secondary-container 朱砂精确值，须附文字）",
  },
  {
    id: "stamina",
    group: "color",
    label: "精力·准备（焦金暗赭）",
    varName: "--ds-c-stamina",
    value: "#D5C5A8",
    highContrast: "#E6D9C2",
    specRef: "说明书三.1《黑雨》补充语义色：精力/准备=焦金与暗赭（取 primary-fixed-dim 精确值，须附文字）",
  },
  {
    id: "resolve",
    group: "color",
    label: "定力·梦境·认知（低饱和冷月蓝）",
    varName: "--ds-c-resolve",
    value: "#6E8298",
    highContrast: "#90A6BC",
    specRef: "派生值（说明书三.1 仅给语义名「低饱和冷月蓝」，未给精确 hex）；须附文字，规范给出精确值后只改此处",
  },
  {
    id: "nature",
    group: "color",
    label: "自然·地点·可采集（低饱和苔绿）",
    varName: "--ds-c-nature",
    value: "#6F8A78",
    highContrast: "#92AB9A",
    specRef: "派生值（说明书三.1 仅给语义名「低饱和苔绿」，未给精确 hex）；须附文字，规范给出精确值后只改此处",
  },
  /* —— 层级色彩（稀有度 / 人物关系）· 各自独立色板，互不相同，均须附文字 —— */
  {
    id: "rarity-epic",
    group: "color",
    label: "稀有度·史诗（绛紫）",
    varName: "--ds-c-rarity-epic",
    value: "#8E7AAE",
    highContrast: "#B6A6D2",
    specRef: "派生值（说明书未规定稀有度精确 hex；为与传说焦金/稀有冷月蓝区分，增设低饱和绛紫，须附文字）",
  },
  {
    id: "rel-wary",
    group: "color",
    label: "人物关系·戒备（赭橙）",
    varName: "--ds-c-rel-wary",
    value: "#C98A4B",
    highContrast: "#E0A66A",
    specRef: "派生值（人物关系·戒备，取低饱和赭橙，须附文字，规范给出精确值后只改此处）",
  },
];

/* ------------------------------------------------------------------ *
 * 二、字体令牌（说明书三.3，6 级字阶）
 * ------------------------------------------------------------------ */

/**
 * 字体策略（ARCH §1.5）：系统回退栈是令牌真值，webfont 仅作非阻塞渐进增强。
 * 目标中文设备普遍具备系统衬线，离线 PWA 与微信小游戏靠回退栈不破版。
 */
export const FONT_TOKENS: TokenSpec[] = [
  {
    id: "font-serif",
    group: "font",
    label: "标题衬线栈（思源宋体）",
    varName: "--ds-f-serif",
    value: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, serif',
    highContrast: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, serif',
    specRef: "说明书三.3 显示标题/大标题/手机标题 字体族 Noto Serif SC·思源宋体 · DESIGN.md:typography.display-title.fontFamily",
  },
  {
    id: "font-read",
    group: "font",
    label: "叙事阅读栈（高可读中文宋体）",
    varName: "--ds-f-read",
    value: 'Literata, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, serif',
    highContrast: 'Literata, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, serif',
    specRef: "说明书三.3 叙事正文/辅助正文 字体族 Literata·高可读中文宋体 · DESIGN.md:typography.body-narrative.fontFamily",
  },
  {
    id: "font-label",
    group: "font",
    label: "标签系统栈（思源黑体）",
    varName: "--ds-f-label",
    value: '"Source Serif 4", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    highContrast: '"Source Serif 4", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    specRef: "说明书三.3 标签系统 字体族 Source Serif 4·思源黑体 · DESIGN.md:typography.label-caps.fontFamily",
  },

  /* 1. 显示标题 36 / 700 / 1.2 / 0.1em */
  { id: "display-size", group: "font", label: "显示标题字号", varName: "--ds-f-display-size", value: "36px", specRef: "说明书三.3 显示标题 36px · DESIGN.md:typography.display-title.fontSize" },
  { id: "display-weight", group: "font", label: "显示标题字重", varName: "--ds-f-display-weight", value: "700", specRef: "说明书三.3 显示标题 700 · DESIGN.md:typography.display-title.fontWeight" },
  { id: "display-lh", group: "font", label: "显示标题行高", varName: "--ds-f-display-lh", value: "1.2", specRef: "说明书三.3 显示标题 lh 1.2 · DESIGN.md:typography.display-title.lineHeight" },
  { id: "display-ls", group: "font", label: "显示标题字距", varName: "--ds-f-display-ls", value: "0.1em", specRef: "说明书三.3 显示标题 ls 0.1em · DESIGN.md:typography.display-title.letterSpacing" },

  /* 2. 大标题 24 / 600 / 1.4 */
  { id: "headline-size", group: "font", label: "大标题字号", varName: "--ds-f-headline-size", value: "24px", specRef: "说明书三.3 大标题 24px · DESIGN.md:typography.headline-lg.fontSize" },
  { id: "headline-weight", group: "font", label: "大标题字重", varName: "--ds-f-headline-weight", value: "600", specRef: "说明书三.3 大标题 600 · DESIGN.md:typography.headline-lg.fontWeight" },
  { id: "headline-lh", group: "font", label: "大标题行高", varName: "--ds-f-headline-lh", value: "1.4", specRef: "说明书三.3 大标题 lh 1.4 · DESIGN.md:typography.headline-lg.lineHeight" },

  /* 3. 手机标题 20 / 600 / 1.4 */
  { id: "headline-mobile-size", group: "font", label: "手机标题字号", varName: "--ds-f-headline-mobile-size", value: "20px", specRef: "说明书三.3 手机标题 20px · DESIGN.md:typography.headline-lg-mobile.fontSize" },
  { id: "headline-mobile-weight", group: "font", label: "手机标题字重", varName: "--ds-f-headline-mobile-weight", value: "600", specRef: "说明书三.3 手机标题 600 · DESIGN.md:typography.headline-lg-mobile.fontWeight" },
  { id: "headline-mobile-lh", group: "font", label: "手机标题行高", varName: "--ds-f-headline-mobile-lh", value: "1.4", specRef: "说明书三.3 手机标题 lh 1.4 · DESIGN.md:typography.headline-lg-mobile.lineHeight" },

  /*
   * 4. 叙事正文 18 / 400 / 1.8
   * 窄屏可降至逻辑 16px、不得低于此值（说明书三.3）：用 clamp() 下限锁 16px。
   * 单位取容器查询单位 cqi，使 demo 的断点 frame 模拟能真实驱动字号（frame 为 container）；
   * 无容器上下文时 cqi 回退到小视口宽度，行为与 vw 一致。
   */
  { id: "body-size", group: "font", label: "叙事正文字号（窄屏下限 16px）", varName: "--ds-f-body-size", value: "clamp(16px, 4.6cqi, 18px)", specRef: "说明书三.3 叙事正文 18px；窄屏正文可降至逻辑 16px 不得低于此值 · DESIGN.md:typography.body-narrative.fontSize" },
  { id: "body-weight", group: "font", label: "叙事正文字重", varName: "--ds-f-body-weight", value: "400", specRef: "说明书三.3 叙事正文 400 · DESIGN.md:typography.body-narrative.fontWeight" },
  { id: "body-lh", group: "font", label: "叙事正文行高", varName: "--ds-f-body-lh", value: "1.8", specRef: "说明书三.3 叙事正文 lh 1.8 · DESIGN.md:typography.body-narrative.lineHeight" },

  /* 5. 辅助正文 14 / 400 / 1.6 */
  { id: "body-sm-size", group: "font", label: "辅助正文字号", varName: "--ds-f-body-sm-size", value: "14px", specRef: "说明书三.3 辅助正文 14px · DESIGN.md:typography.body-sm.fontSize" },
  { id: "body-sm-weight", group: "font", label: "辅助正文字重", varName: "--ds-f-body-sm-weight", value: "400", specRef: "说明书三.3 辅助正文 400 · DESIGN.md:typography.body-sm.fontWeight" },
  { id: "body-sm-lh", group: "font", label: "辅助正文行高", varName: "--ds-f-body-sm-lh", value: "1.6", specRef: "说明书三.3 辅助正文 lh 1.6 · DESIGN.md:typography.body-sm.lineHeight" },

  /* 6. 标签系统 12 / 700 / 1 / 0.2em */
  { id: "label-size", group: "font", label: "标签字号", varName: "--ds-f-label-size", value: "12px", specRef: "说明书三.3 标签系统 12px · DESIGN.md:typography.label-caps.fontSize" },
  { id: "label-weight", group: "font", label: "标签字重", varName: "--ds-f-label-weight", value: "700", specRef: "说明书三.3 标签系统 700" },
  { id: "label-lh", group: "font", label: "标签行高", varName: "--ds-f-label-lh", value: "1", specRef: "说明书三.3 标签系统 lh 1" },
  { id: "label-ls", group: "font", label: "标签字距", varName: "--ds-f-label-ls", value: "0.2em", specRef: "说明书三.3 标签系统 ls 0.2em" },
];

/* ------------------------------------------------------------------ *
 * 三、间距令牌（说明书三.4，基础单位 4px，6 档）
 * ------------------------------------------------------------------ */

export const SPACE_TOKENS: TokenSpec[] = [
  { id: "space-unit", group: "space", label: "基础单位", varName: "--ds-s-unit", value: "4px", specRef: "说明书三.4 基础单位 4px" },
  { id: "space-stack-sm", group: "space", label: "紧密", varName: "--ds-s-stack-sm", value: "8px", specRef: "说明书三.4 紧密 8px（亦为相邻控件最小间距，说明书十二.2）" },
  { id: "space-gutter", group: "space", label: "窄沟槽", varName: "--ds-s-gutter", value: "12px", specRef: "说明书三.4 窄沟槽 12px" },
  { id: "space-stack-md", group: "space", label: "标准", varName: "--ds-s-stack-md", value: "16px", specRef: "说明书三.4 标准 16px" },
  { id: "space-margin-edge", group: "space", label: "页面边距", varName: "--ds-s-margin-edge", value: "20px", specRef: "说明书三.4 页面边距 20px" },
  { id: "space-stack-lg", group: "space", label: "大段落", varName: "--ds-s-stack-lg", value: "24px", specRef: "说明书三.4 大段落 24px（叙事段落之间至少 24px）" },
];

/* ------------------------------------------------------------------ *
 * 四、形状与层次令牌（说明书三.5、十二.2、十二.3）
 * ------------------------------------------------------------------ */

export const SHAPE_TOKENS: TokenSpec[] = [
  { id: "radius", group: "shape", label: "圆角基线", varName: "--ds-sh-radius", value: "0px", specRef: "说明书三.5 圆角 0 为正式基线" },
  { id: "radius-max", group: "shape", label: "圆角兼容上限", varName: "--ds-sh-radius-max", value: "4px", specRef: "说明书三.5 兼容上限 4px，禁止现代化大圆角" },
  { id: "border-width", group: "shape", label: "细线宽度", varName: "--ds-sh-border-width", value: "1px", specRef: "说明书三.5 深度靠色调层 + 1px 细线" },
  {
    id: "border-gold-30",
    group: "shape",
    label: "常规金边（30%）",
    varName: "--ds-sh-border-gold-30",
    value: "rgba(245, 210, 148, 0.30)",
    highContrast: "rgba(251, 224, 174, 0.60)",
    specRef: "说明书三.5 常规边框金色 30% 透明（焦金 #F5D294）",
  },
  {
    id: "border-gold-60",
    group: "shape",
    label: "悬停聚焦金边（60%）",
    varName: "--ds-sh-border-gold-60",
    value: "rgba(245, 210, 148, 0.60)",
    highContrast: "rgba(251, 224, 174, 0.88)",
    specRef: "说明书三.5 悬停/聚焦增强到 60%（焦金 #F5D294）",
  },
  {
    id: "brush",
    group: "shape",
    label: "刷痕分隔渐变",
    varName: "--ds-sh-brush",
    value: "linear-gradient(90deg, transparent 0%, var(--ds-sh-border-gold-60) 50%, transparent 100%)",
    specRef: "说明书三.5 分隔线两端透明、中部淡金的渐变细线（模拟收笔刷痕）",
  },
  { id: "elevation", group: "shape", label: "阴影（禁用厚阴影）", varName: "--ds-sh-elevation", value: "none", specRef: "说明书三.5 深度靠色调层 + 1px 细线，禁止厚阴影" },
  { id: "touch-min", group: "shape", label: "最小触摸尺寸", varName: "--ds-sh-touch-min", value: "44px", specRef: "说明书十二.2 最小触摸面积 44×44 CSS px" },
  { id: "focus-width", group: "shape", label: "焦点环宽度", varName: "--ds-sh-focus-width", value: "2px", specRef: "说明书十二.3 焦点使用 2px 旧丝或朱砂轮廓" },
  { id: "focus-offset", group: "shape", label: "焦点环偏移", varName: "--ds-sh-focus-offset", value: "3px", specRef: "说明书十二.3 焦点轮廓 3px 偏移" },
  { id: "read-measure", group: "shape", label: "阅读列最大宽度", varName: "--ds-sh-read-measure", value: "68ch", specRef: "说明书十三.4（1）正文阅读列不因桌面变宽而无限拉伸" },
];

/* ------------------------------------------------------------------ *
 * 五、纹理令牌（说明书三.6）
 * ------------------------------------------------------------------ */

export const TEXTURE_TOKENS: TokenSpec[] = [
  {
    id: "noise-opacity",
    group: "texture",
    label: "噪点层透明度",
    varName: "--ds-tx-noise-opacity",
    value: "0.05",
    highContrast: "0",
    specRef: "说明书三.6 全局可叠 5% 透明度细颗粒噪点；说明书十二.5 高对比关闭/降低纸张纹理",
  },
  {
    id: "noise-dot",
    group: "texture",
    label: "噪点颗粒色",
    varName: "--ds-tx-noise-dot",
    value: "rgba(234, 225, 218, 0.85)",
    highContrast: "rgba(234, 225, 218, 0)",
    specRef: "说明书三.6 细颗粒纸张纹理（颗粒取 on-surface 旧丝绢 #EAE1DA 低透明度）",
  },
  { id: "noise-size", group: "texture", label: "噪点颗粒密度", varName: "--ds-tx-noise-size", value: "3px", specRef: "说明书三.6 细颗粒（非粗噪点）" },
  {
    id: "grid-line",
    group: "texture",
    label: "舆图网格线",
    varName: "--ds-tx-grid-line",
    value: "rgba(245, 210, 148, 0.08)",
    highContrast: "rgba(251, 224, 174, 0.16)",
    specRef: "说明书三.6 背景纹理（舆图淡金网格，取焦金 #F5D294 低透明度）",
  },
  {
    id: "scrim",
    group: "texture",
    label: "遮罩",
    varName: "--ds-tx-scrim",
    value: "rgba(17, 14, 10, 0.72)",
    highContrast: "rgba(7, 5, 3, 0.88)",
    specRef: "说明书十一.11 抽屉遮罩关闭（取 surface-container-lowest #110E0A）",
  },
];

/* ------------------------------------------------------------------ *
 * 六、动效令牌（说明书三.6、十二.5、十四.1）
 * ------------------------------------------------------------------ */

export const MOTION_TOKENS: TokenSpec[] = [
  { id: "dur-fast", group: "motion", label: "快过渡时长", varName: "--ds-mo-dur-fast", value: "120ms", specRef: "说明书三.6 动效克制（即时状态变化）" },
  { id: "dur-base", group: "motion", label: "标准过渡时长", varName: "--ds-mo-dur-base", value: "240ms", specRef: "说明书三.6 浮层过渡/抽屉过渡" },
  { id: "ease", group: "motion", label: "过渡曲线", varName: "--ds-mo-ease", value: "cubic-bezier(0.2, 0.8, 0.2, 1)", specRef: "说明书三.6 动效自然收敛、不夸张" },
  { id: "typewriter-cps", group: "motion", label: "逐字速度（字/秒）", varName: "--ds-mo-typewriter-cps", value: "33", specRef: "说明书十四.1 约每秒 30—36 字逐字显示（取中值 33）" },
];

/** 全部令牌（唯一真源；顺序即 demo 画板展示顺序）。 */
export const ALL_TOKENS: TokenSpec[] = [
  ...COLOR_TOKENS,
  ...FONT_TOKENS,
  ...SPACE_TOKENS,
  ...SHAPE_TOKENS,
  ...TEXTURE_TOKENS,
  ...MOTION_TOKENS,
];

/** 按 CSS 变量名索引令牌，供 demo 查值、避免重复硬编码。 */
export const TOKEN_BY_VAR: Record<string, TokenSpec> = ALL_TOKENS.reduce<Record<string, TokenSpec>>(
  (acc, token) => {
    acc[token.varName] = token;
    return acc;
  },
  {},
);

/** 分组中文名（demo 筛选器用）。 */
export const TOKEN_GROUP_LABELS: Record<TokenGroup, string> = {
  color: "色彩",
  font: "字体",
  space: "间距",
  shape: "形状与层次",
  texture: "纹理",
  motion: "动效",
};

/** 逐字播放速度（字/秒），由动效令牌派生，避免二次硬编码。 */
export const TYPEWRITER_CPS: number = Number(
  MOTION_TOKENS.find((token) => token.id === "typewriter-cps")?.value ?? "33",
);

/* ------------------------------------------------------------------ *
 * 七、字阶描述（引用令牌变量名，不重复取值）
 * ------------------------------------------------------------------ */

/** 字阶条目：只持有令牌变量名引用，真实取值统一从 `TOKEN_BY_VAR` 查询。 */
export interface TypeScaleEntry {
  id: string;
  label: string;
  usage: string;
  familyVar: string;
  sizeVar: string;
  weightVar: string;
  lineHeightVar: string;
  letterSpacingVar?: string;
  className: string;
  specRef: string;
}

export const TYPE_SCALE: TypeScaleEntry[] = [
  {
    id: "display",
    label: "显示标题",
    usage: "章卷首屏、结算大标题",
    familyVar: "--ds-f-serif",
    sizeVar: "--ds-f-display-size",
    weightVar: "--ds-f-display-weight",
    lineHeightVar: "--ds-f-display-lh",
    letterSpacingVar: "--ds-f-display-ls",
    className: "ds-type-display",
    specRef: "说明书三.3 显示标题",
  },
  {
    id: "headline",
    label: "大标题",
    usage: "分区标题、详情卡标题",
    familyVar: "--ds-f-serif",
    sizeVar: "--ds-f-headline-size",
    weightVar: "--ds-f-headline-weight",
    lineHeightVar: "--ds-f-headline-lh",
    className: "ds-type-headline",
    specRef: "说明书三.3 大标题",
  },
  {
    id: "headline-mobile",
    label: "手机标题",
    usage: "手机顶部栏标题、抽屉分区标题",
    familyVar: "--ds-f-serif",
    sizeVar: "--ds-f-headline-mobile-size",
    weightVar: "--ds-f-headline-mobile-weight",
    lineHeightVar: "--ds-f-headline-mobile-lh",
    className: "ds-type-headline-mobile",
    specRef: "说明书三.3 手机标题",
  },
  {
    id: "body",
    label: "叙事正文",
    usage: "卷册叙事、NPC 对话、玩家行动",
    familyVar: "--ds-f-read",
    sizeVar: "--ds-f-body-size",
    weightVar: "--ds-f-body-weight",
    lineHeightVar: "--ds-f-body-lh",
    className: "ds-type-body",
    specRef: "说明书三.3 叙事正文（窄屏下限 16px）",
  },
  {
    id: "body-sm",
    label: "辅助正文",
    usage: "说明、来源、次要描述",
    familyVar: "--ds-f-read",
    sizeVar: "--ds-f-body-sm-size",
    weightVar: "--ds-f-body-sm-weight",
    lineHeightVar: "--ds-f-body-sm-lh",
    className: "ds-type-body-sm",
    specRef: "说明书三.3 辅助正文",
  },
  {
    id: "label",
    label: "标签系统",
    usage: "方括号标签、状态标签、导航文字",
    familyVar: "--ds-f-label",
    sizeVar: "--ds-f-label-size",
    weightVar: "--ds-f-label-weight",
    lineHeightVar: "--ds-f-label-lh",
    letterSpacingVar: "--ds-f-label-ls",
    className: "ds-type-label",
    specRef: "说明书三.3 标签系统",
  },
];

/* ------------------------------------------------------------------ *
 * 八、断点（说明书十三）
 * ------------------------------------------------------------------ */

export type BreakpointId = "mobile" | "tablet" | "desktop" | "free";

export interface BreakpointSpec {
  id: BreakpointId;
  label: string;
  /** 预设 frame 宽度（px）；`free` 由滑块控制。 */
  width: number;
  min: number;
  max: number;
  layout: string;
  specRef: string;
}

export const BREAKPOINTS: BreakpointSpec[] = [
  { id: "mobile", label: "手机", width: 390, min: 360, max: 720, layout: "顶部栏 + 单列主内容 + 底部主导航；侧抽屉为覆盖层", specRef: "说明书十三.1 360—720 CSS px" },
  { id: "tablet", label: "平板", width: 860, min: 721, max: 1050, layout: "顶部栏 + 中央阅读列；角色抽屉可变左侧窄栏", specRef: "说明书十三.2 721—1050 CSS px" },
  { id: "desktop", label: "桌面", width: 1280, min: 1051, max: 1920, layout: "三栏：左角色状态 / 中阅读列 / 右导航与世界异兆", specRef: "说明书十三.3 >1050 CSS px" },
  { id: "free", label: "自由拖动", width: 720, min: 360, max: 1600, layout: "手动拖动验证阈值行为", specRef: "说明书十三 响应式验证" },
];

/** 依据 frame 宽度判定当前断点（不读取真实 window）。 */
export function resolveBreakpoint(width: number): BreakpointSpec {
  if (width <= 720) return BREAKPOINTS[0];
  if (width <= 1050) return BREAKPOINTS[1];
  return BREAKPOINTS[2];
}

/* ------------------------------------------------------------------ *
 * 九、令牌 → React style（SSR 首屏即生效）
 * ------------------------------------------------------------------ */

/**
 * 把全部令牌编译为可直接挂在作用域根元素上的 `style` 对象。
 *
 * 之所以走 React `style` prop 而不是 `useEffect` + `setProperty`：
 * 服务端渲染阶段就把 `--ds-*` 写进 HTML，首屏不会先按 `globals.css` 的浅色
 * `:root` 变量渲染再闪变暗色；同时高对比切换只是重算同一个对象，交给 React diff。
 *
 * @param state 影响取值的状态（当前仅高对比）。
 * @returns 含全部 `--ds-*` 自定义属性的样式对象。
 */
export function buildTokenStyle(state: TokenState): CSSProperties {
  const vars: Record<string, string> = {};
  for (const token of ALL_TOKENS) {
    vars[token.varName] = state.highContrast && token.highContrast !== undefined
      ? token.highContrast
      : token.value;
  }
  // React 19 原生支持 CSS 自定义属性；CSSProperties 类型未覆盖自定义属性键，故显式转换。
  return vars as unknown as CSSProperties;
}

/**
 * 读取某令牌在当前状态下的生效值（demo 画板与复制功能使用）。
 *
 * @param varName CSS 变量名。
 * @param state 当前状态。
 * @returns 生效值；变量不存在时返回空字符串。
 */
export function resolveTokenValue(varName: string, state: TokenState): string {
  const token = TOKEN_BY_VAR[varName];
  if (!token) return "";
  return state.highContrast && token.highContrast !== undefined ? token.highContrast : token.value;
}
