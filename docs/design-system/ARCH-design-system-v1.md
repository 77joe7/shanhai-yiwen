# 设计系统 v1 · 架构设计文档（ARCH）

> 项目：《山海异闻录：天地未定》第一卷《黑雨》
> 文档性质：架构设计（令牌真源 + 作用域隔离 + 12 组件契约 + living demo 落地）
> 作者：高见远（架构师）｜日期：2025-08-19
> 依据：`docs/design-system/PRD-design-system-v1.md`、`docs/ui-design/山海异闻录_UI界面说明书_Stitch参考包基线_V1.3.txt`（三/十一/十二/十三章）、`tmp/stitch-ref/DESIGN.md`、`AGENTS.md` 及 `docs/development/*`

---

## 0. 架构结论速览（先给结论）

| 决策点 | 结论 |
|---|---|
| **令牌单一真源** | **TS 常量**为唯一真源（`tokens.ts`）；CSS 变量在运行时由根组件注入到作用域元素，**无需构建期生成脚本、无生成文件**。 |
| **样式隔离（约束 A）** | 全部令牌与组件样式收敛在作用域根类 **`.shj-ds`** 下，自带**局部 reset** + 作用域 CSS 变量命名空间 **`--ds-*`**；**不修改 `globals.css`**，demo 渲染不受其浅色变量与元素级选择器影响。 |
| **Tailwind 4 `@theme`** | **v1 不使用**。因 `@theme` 会向 `:root` 注入全局变量，违反约束 A/C（污染、且不可编辑 globals）。组件用作用域 CSS + `var(--ds-*)`；P1-4 的 Tailwind 映射以 demo 内**映射表**呈现，不做运行时 `@theme`。 |
| **状态管理** | **React Context** 承载交互状态（开关/断点/选中态）；高对比与减弱动效通过根元素 `data-*` 属性 + CSS 变量驱动视觉切换（不重渲染内容），与现有 `GameShell` 模式一致。 |
| **平台抽象（约束 C）** | 令牌/组件不直接调用 `window`/`localStorage`/微信 API；剪贴板写入、安全区等经 `DsPlatform` 适配层（镜像 `app/game/platform.ts` 的 `PlatformAdapter`）。 |
| **demo 落地（问题 1）** | **独立路由 `/design-system`** → `app/design-system/page.tsx`（vinext App Router 文件路由）。 |
| **globals.css 集成（问题 2）** | v1 不碰 `globals.css`；287 处硬编码改造单列评审，迁移路径见 §10。 |
| **浅色纸卷（问题 3）** | v1 不做；令牌架构以 `{ base, highContrast }` + 根 `data-theme` 预留扩展位，未来加 `light` 仅新增一组值、组件零改动。 |
| **字体（问题 4）** | **系统优先回退栈**为令牌真值；webfont 仅作**非阻塞渐进增强**（`font-display: swap`，可选 CDN/自托管），离线 PWA 与微信靠回退栈；微信迁移经 `AssetPort` 打包。v1 不自托管多 MB CJK 字体。 |
| **依赖** | **零新增依赖**（react/react-dom、tailwindcss 已在位；不引入 MUI）。全 Cloudflare Workers 兼容（仅用 Web 标准 API）。 |

---

## 1. 实现方案与技术选型

### 1.1 令牌单一真源与派生形态

- **真源 = TS 常量**。`app/design-system/tokens.ts` 导出 `ALL_TOKENS: TokenSpec[]` 与按分组索引的对象。每个 `TokenSpec` 含 `{ id, group, label, varName, value, highContrast?, specRef }`，`specRef` 标注规范出处（如 `说明书三.1 / DESIGN.md:colors.background`），满足"每个令牌可溯源"。
- **CSS 变量 = 运行时派生**。根组件 `DesignSystemRoot` 在挂载/状态变化时调用 `applyTokens(rootEl, state)`，遍历 `ALL_TOKENS` 把 `varName→value`（高对比态取 `highContrast` 覆盖）逐条 `rootEl.style.setProperty(...)`。变量仅存在于 `.shj-ds` 子树，**不泄漏、不污染全局**，且 TS 单一真源无漂移。
- **为何不用构建期生成脚本**：方案零新增文件、零额外 npm script、无 `globals.css` 改动；变量随 React 状态同步切换，最契合约束 A/C 与 Cloudflare Workers（无 Node-only 构建步骤依赖）。若未来需 Tailwind 工具类，再追加 `@theme` 生成脚本（见 §10 迁移路径）。

### 1.2 样式隔离方案（约束 A 正面回答）

`globals.css` 的污染源：`* {box-sizing}`、`html,body{background:#17130f;color:var(--ink)}`、`body{font-family}`、`button:focus-visible{outline:2px solid var(--cinnabar);outline-offset:3px}`、`:root` 浅色变量（`--ink/#171b18` 等）。本设计系统**全部收敛在 `.shj-ds` 作用域根**下：

1. **作用域根**：`DesignSystemRoot` 渲染 `<div className="shj-ds" data-contrast=... data-motion=... data-texture=...>`，所有组件/令牌变量挂在其子树。
2. **局部 reset**（写在 `design-system.css` 的 `.shj-ds` 下，不碰全局）：
   ```css
   .shj-ds, .shj-ds *, .shj-ds *::before, .shj-ds *::after { box-sizing: border-box; margin: 0; }
   .shj-ds { color: var(--ds-c-on-surface); background: var(--ds-c-bg);
             font-family: var(--ds-font-serif); -webkit-text-size-adjust: 100%; }
   .shj-ds button:focus-visible, .shj-ds input:focus-visible {
     outline: 2px solid var(--ds-c-cinnabar); outline-offset: 3px; }   /* 覆盖 globals 的 --cinnabar */
   ```
   作用域选择器特异性（0,1,2）高于 `button:focus-visible`（0,1,1），且只作用于 demo 子树，故**不修改 globals.css 行为**即消除其焦点环污染。
3. **变量命名空间 `--ds-*`**：组件样式只引用 `var(--ds-*)`，绝不引用 globals 的 `--ink/--paper/--cinnabar` 等，从源头隔离。
4. **噪点层/刷痕分隔线**等结构样式同样在 `.shj-ds` 内以 `::before/::after` + `pointer-events:none` 实现，不干扰交互。

> 结论：以"作用域根类 + 局部 reset + `--ds-*` 命名空间 + 运行时注入变量"实现隔离，**零 globals.css 改动**，demo 渲染与 globals 完全解耦。

### 1.3 状态管理（React 19）

- `DesignSystemProvider`（Context）持有 `DesignSystemState`：`{ highContrast, reducedMotion, texture, typewriter, semanticText, breakpoint, frameWidth, search }` 与 `set(patch)` / `copyToken(varName)`。
- **视觉开关走 data-* + CSS 变量**：`highContrast`→`data-contrast="high"` 并注入 highContrast 子集变量；`reducedMotion`→`data-motion="reduced"`（CSS 把过渡/动画置 0）；`texture`→`data-texture="simple"`（噪点透明度归 0）。切换时**只改根属性与变量，组件内容不重渲染**，性能与现有 `GameShell` 一致。
- **内容态走 React**：组件状态切换（如 ArchiveEvidenceCard 的 7 状态）、断点 frame 宽度、逐字开关联动 NarrativeBlock 等由 demo 本地 state / Context 驱动重渲染。

### 1.4 平台抽象（约束 C）

`app/design-system/dsPlatform.ts` 定义 `DsPlatform` 接口（裁剪自 `app/game/platform.ts` 的 `PlatformAdapter`）：
```ts
interface DsPlatform {
  clipboard: { write(text: string): Promise<void> };       // 复制令牌值
  safeArea: { getInsets(): { top: number; right: number; bottom: number; left: number } }; // 安全区（demo 用 CSS env 读取）
}
```
- `BrowserDsPlatform`：clipboard 用 `navigator.clipboard.writeText`（带 `document.execCommand` 兜底），safeArea 用 `getComputedStyle` 读 `env(safe-area-inset-*)`。
- 微信小游戏迁移：新增 `WechatDsPlatform` 实现同一接口（clipboard→`wx.setClipboardData`，safeArea→`SafeAreaPort`），**组件与令牌代码不变**。
- demo 的"视口宽度模拟"是纯 React state 控制 frame 容器 `width`，**不调用** `window`/resize，符合约束。

### 1.5 字体加载（问题 4）

- **令牌真值 = 回退栈**：`--ds-font-serif`、`--ds-font-read`、`--ds-font-label` 均为 `"Noto Serif SC","Source Han Serif SC","Songti SC",... serif` 形式，目标中文设备普遍具备系统衬线，离线/PWA/微信均不破版。
- **渐进增强**：`design-system.css` 内可选 `@font-face`（Noto Serif SC / Literata / Source Serif 4）指向 CDN，`font-display: swap`，失败时自动回退，**不阻塞首屏**。
- **不 v1 自托管**：CJK webfont 多 MB，违反离线 PWA 与包体预算；微信迁移由 `AssetPort` 打包字体资源（见 `WECHAT_MINIGAME_READINESS.md` §4）。
- 窄屏正文逻辑下限 16px：字阶 `body-narrative` 18px，辅助 14px 在窄屏经 `clamp()` 不低于 16px（见 `tokens.ts` 的 `bodyMin` 规则与 CSS `clamp`）。

---

## 2. 完整文件列表（相对路径 + 职责）

**令牌与基座（T01）**
- `app/design-system/page.tsx` — vinext 路由入口 `/design-system`；渲染 `DesignSystemRoot`（客户端组件），含可选非阻塞 webfont `<link>`。
- `app/design-system/DesignSystemRoot.tsx` — 设计系统根：提供 `DesignSystemContext`、运行时注入 `--ds-*` 变量、`data-*` 属性、`.shj-ds` 作用域根与视口 frame、装载 `DsPlatform`。
- `app/design-system/tokens.ts` — **单一真源**：TS 常量令牌（颜色/字体/字阶/间距/形状/纹理动效）+ 规范出处 + highContrast 覆盖集 + `applyTokens()`。
- `app/design-system/design-system.css` — 作用域样式：`.shj-ds` 局部 reset；全部引用 `var(--ds-*)`；12 组件样式；刷痕分隔线/噪点层/焦点环/高对比与减弱动效降级；无新增硬编码色值。
- `app/design-system/dsPlatform.ts` — 平台适配边界：`DsPlatform` 接口 + `BrowserDsPlatform`（剪贴板/安全区），为微信迁移预留。

**基础组件（T02）**
- `app/design-system/components/AppTopBar.tsx` — 顶部栏（默认/返回/菜单/加载/禁用）。
- `app/design-system/components/BrushDivider.tsx` — 刷痕分隔线（两端透明中部淡金，可带菱形/残日/分类图标）。
- `app/design-system/components/NarrativeBlock.tsx` — 叙事块（7 类型 + 逐字 + 最新标记）。
- `app/design-system/components/ArchiveEvidenceCard.tsx` — 档案证据卡（7 状态）。
- `app/design-system/components/SquareTag.tsx` — 方括号标签（非 pill，可选交互）。
- `app/design-system/components/StatusMeter.tsx` — 状态条（细方轨道/固色填充/数字可见/warning）。

**复合与交互组件（T03）**
- `app/design-system/components/ActionButton.tsx` — 行动按钮（直角/图标上文字下/翻转填充/危险/禁用）。
- `app/design-system/components/MapMarker.tsx` — 地图标记（6 状态 + 当前/可达/锁定提示）。
- `app/design-system/components/LocationCard.tsx` — 地点卡（左下定位，含标签/行动/天气/时日/危险）。
- `app/design-system/components/ThreatPanel.tsx` — 威胁面板（6 状态 + 意图/稳定/已知弱点）。
- `app/design-system/components/CharacterQuestDrawer.tsx` — 角色任务抽屉（左滑/遮罩/Esc/焦点回归）。
- `app/design-system/components/BackToLatestButton.tsx` — 回到最新按钮（离尾可见 + 未读计数）。
- `app/design-system/components/index.ts` — 统一导出 12 组件与 Props 类型。

**Living Demo（T04）**
- `app/design-system/demo/DemoApp.tsx` — demo 编排：装配 7 展示区 + 8 控件 + 接 `DesignSystemContext`。
- `app/design-system/demo/sections.tsx` — 7 展示区（TokenSwatches / TypeRuler / SpacingRuler / ComponentGallery / Playground / A11yShowcase / BreakpointSimulator）。
- `app/design-system/demo/controls.tsx` — 8 交互控件（高对比/减弱动效/断点/组件状态切换/复制/逐字/语义色文字[P1]/搜索筛选[P1]）。
- `app/design-system/demo/useDemoState.ts` — demo 本地状态机（开关、断点、选中组件状态、搜索词）。
- `app/design-system/demo/contrast.ts` — 相对亮度/对比度计算（画板展示对比度比值，校验 WCAG AA）。

**验证（T05）**
- `tests/design-system.test.mjs` — 构建冒烟 + 令牌一致性（无硬编码色值、全部可溯源、highContrast 覆盖完整、组件不引用 globals 变量）。

> 规模控制：共 22 个源文件，按"基座 / 基础组件 / 复合组件 / demo / 验证"5 层聚合，避免过度拆分；令牌与组件按规范契约一一对应，无冗余抽象。

---

## 3. 数据结构与接口（Mermaid classDiagram 见 `class-diagram.mermaid`）

### 3.1 令牌类型

```ts
type TokenGroup = "color" | "font" | "space" | "shape" | "texture" | "motion";

interface TokenSpec {
  id: string;            // 稳定 ID，如 "surface-wet-ink"
  group: TokenGroup;
  label: string;         // 中文名，如 "湿墨石"
  varName: string;       // CSS 变量名，如 "--ds-c-bg"
  value: string;         // 基准值（规范值）
  highContrast?: string; // 高对比覆盖值（仅关键可见令牌）
  specRef: string;       // 规范出处，如 "说明书三.1 / DESIGN.md:colors.background"
}

// 单组样例（完整见 tokens.ts）
const COLORS: TokenSpec[] = [
  { id: "bg",              group: "color", label: "湿墨石",       varName: "--ds-c-bg",            value: "#17130F", specRef: "说明书三.1 background" },
  { id: "surface-lowest", group: "color", label: "最深容器",     varName: "--ds-c-surface-lowest",value: "#110E0A", specRef: "说明书三.1 surface-container-lowest" },
  { id: "surface-low",    group: "color", label: "低层容器",     varName: "--ds-c-surface-low",   value: "#1F1B17", specRef: "说明书三.1 surface-container-low" },
  { id: "surface",        group: "color", label: "标准容器",     varName: "--ds-c-surface",       value: "#231F1B", specRef: "说明书三.1 surface-container" },
  { id: "surface-high",   group: "color", label: "高层容器",     varName: "--ds-c-surface-high",  value: "#2E2925", specRef: "说明书三.1 surface-container-high" },
  { id: "surface-highest",group: "color", label: "最高层容器",   varName: "--ds-c-surface-highest",value:"#39342F",specRef: "说明书三.1 surface-container-highest" },
  { id: "on-surface",     group: "color", label: "主文字/旧丝绢",varName: "--ds-c-on-surface",    value: "#EAE1DA", highContrast: "#FBF7F0", specRef: "说明书三.1 on-surface" },
  { id: "on-surface-variant", group:"color", label:"次文字/雾纸",varName:"--ds-c-on-surface-variant", value:"#CEC5B9", highContrast:"#E4DBCB", specRef:"说明书三.1 on-surface-variant" },
  { id: "outline",        group: "color", label: "弱文字/残墨",  varName: "--ds-c-outline",        value: "#979085", highContrast: "#B8AE9E", specRef: "说明书三.1 outline" },
  { id: "outline-variant",group: "color", label: "弱边框",       varName: "--ds-c-outline-variant",value:"#4C463D", highContrast:"rgba(245,210,148,0.55)", specRef:"说明书三.1 outline-variant" },
  { id: "primary",        group: "color", label: "主要交互/旧丝",varName:"--ds-c-primary",        value: "#FFF2DE", highContrast:"#FFF7E8", specRef:"说明书三.1 primary" },
  { id: "primary-container",group:"color",label:"旧丝填充",      varName:"--ds-c-primary-container",value:"#E6D5B8", specRef:"说明书三.1 primary-container" },
  { id: "gold",           group: "color", label: "焦金",         varName: "--ds-c-gold",           value: "#F5D294", highContrast:"#FAD9A0", specRef:"说明书三.1 tertiary-container" },
  { id: "gold-dim",       group: "color", label: "固定金/进度",  varName: "--ds-c-gold-dim",       value: "#D5C5A8", specRef:"说明书三.1 primary-fixed-dim" },
  { id: "cinnabar",       group: "color", label: "朱砂",         varName: "--ds-c-cinnabar",       value: "#920703", highContrast:"#E0533A", specRef:"说明书三.1 secondary-container" },
  { id: "error",          group: "color", label: "错误文本",     varName: "--ds-c-error",          value: "#FFB4AB", specRef:"说明书三.1 error" },
  { id: "error-container",group: "color", label: "错误底",       varName: "--ds-c-error-container",value: "#93000A", specRef:"说明书三.1 error-container" },
  // 黑雨补充语义色（须附文字，不唯色）
  { id: "life",    group:"color", label:"生息(朱砂暗红)", varName:"--ds-c-life",    value:"#920703", specRef:"说明书三.1 黑雨补充·生息=朱砂暗红(派生自 cinnabar)" },
  { id: "stamina", group:"color", label:"精力(焦金暗赭)", varName:"--ds-c-stamina", value:"#D5C5A8", specRef:"说明书三.1 黑雨补充·精力=焦金暗赭(派生自 gold-dim)" },
  { id: "resolve", group:"color", label:"定力(低饱和冷月蓝)",varName:"--ds-c-resolve",value:"#6E8298", specRef:"说明书三.1 黑雨补充·定力=低饱和冷月蓝(设计系统派生,须附文字)" },
  { id: "nature",  group:"color", label:"自然(低饱和苔绿)", varName:"--ds-c-nature", value:"#6F8A78", specRef:"说明书三.1 黑雨补充·自然=低饱和苔绿(设计系统派生,须附文字)" },
];
```

> 字阶 / 间距 / 形状 / 纹理动效令牌以同样 `TokenSpec` 结构给出（详见 `tokens.ts`），要点：
> - **字阶 6 级**：display 36/700/1.2/0.1em、headline-lg 24/600/1.4、headline-mobile 20/600/1.4、body 18/400/1.8、body-sm 14/400/1.6、label 12/700/1/0.2em。
> - **间距 6 档**：`--ds-s-unit:4px` `--ds-s-stack-sm:8px` `--ds-s-gutter:12px` `--ds-s-stack-md:16px` `--ds-s-margin-edge:20px` `--ds-s-stack-lg:24px`。
> - **形状**：`--ds-radius:0px`（兼容 `--ds-radius-max:4px`）、`--ds-border-gold-30:rgba(245,210,148,.30)`、`--ds-border-gold-60:rgba(245,210,148,.60)`、`--ds-brush:linear-gradient(90deg,transparent,var(--ds-c-gold) 50%,transparent)`、`--ds-elevation:none`。
> - **纹理/动效**：`--ds-noise-opacity:.05`、`--ds-grid-line:rgba(245,210,148,.08)`（地图 50px 网格）、`--ds-dot-array:rgba(245,210,148,.10)`（战斗 20px 点阵）、`--ds-dur-fast:120ms` `--ds-dur-base:240ms`；`[data-motion="reduced"]` 与 `[data-contrast="high"]`/`[data-texture="simple"]` 下噪点透明度归 0、过渡置 0。

### 3.2 上下文与平台接口

```ts
type Breakpoint = "mobile" | "tablet" | "desktop" | "free";
interface DesignSystemState {
  highContrast: boolean; reducedMotion: boolean; texture: "full" | "simple";
  typewriter: boolean; semanticText: boolean;        // semanticText 为 P1 演示，默认 false
  breakpoint: Breakpoint; frameWidth: number; search: string; // search 为 P1
}
interface DesignSystemContextValue extends DesignSystemState {
  set(patch: Partial<DesignSystemState>): void;
  copyToken(varName: string): Promise<void>;        // 经 dsPlatform.clipboard
}
interface DsPlatform {
  clipboard: { write(text: string): Promise<void> };
  safeArea: { getInsets(): { top: number; right: number; bottom: number; left: number } };
}
```

### 3.3 12 组件 Props 签名（依据说明书十一）

```ts
// 1. AppTopBar
interface TopBarAction { label: string; icon?: string; onClick: () => void; disabled?: boolean; }
interface AppTopBarProps {
  title: string; leftAction?: TopBarAction; rightAction?: TopBarAction;
  sticky?: boolean; safeArea?: boolean;
  variant?: "default" | "back" | "menu"; loading?: boolean; disabled?: boolean;
}
// 2. BrushDivider
interface BrushDividerProps { icon?: "diamond" | "sun" | "category" | React.ReactNode; label?: string; }
// 3. NarrativeBlock
type NarrativeKind = "narration" | "observation" | "system" | "omen" | "npc" | "player-speech" | "player-action";
interface NarrativeBlockProps {
  kind: NarrativeKind; timeLabel?: string; locationLabel?: string; text: string;
  isLatest?: boolean; typewriter?: boolean; onRevealAll?: () => void;
}
// 4. ArchiveEvidenceCard
type EvidenceStatus = "unknown" | "rumor" | "evidence" | "insight" | "locked" | "obtained" | "lost";
interface ArchiveEvidenceCardProps {
  icon?: string; title: string; category?: string; description?: string;
  knowledgeLevel?: number; status: EvidenceStatus; onClick?: () => void;
}
// 5. SquareTag
type TagTone = "neutral" | "gold" | "cinnabar" | "life" | "stamina" | "resolve" | "nature";
interface SquareTagProps {
  label: string; tone?: TagTone; icon?: string; interactive?: boolean; selected?: boolean; onClick?: () => void;
}
// 6. StatusMeter
type MeterTone = "life" | "stamina" | "resolve" | "neutral";
type WarningState = "normal" | "warning" | "critical";
interface StatusMeterProps {
  label: string; value: number; max: number; tone?: MeterTone; warning?: boolean; warningState?: WarningState;
}
// 7. ThreatPanel
type DangerLevel = "unknown" | "observed" | "negotiable" | "dangerous" | "critical" | "resolved";
interface ThreatPanelProps {
  name: string; type?: string; intentText?: string; stability?: number; life?: number;
  dangerLevel: DangerLevel; knownWeakness?: string;
}
// 8. ActionButton
type DangerLevelBtn = "none" | "low" | "high";
interface ActionButtonProps {
  icon?: string; label: string; shortcut?: string; enabled?: boolean; reason?: string;
  dangerLevel?: DangerLevelBtn; selected?: boolean; onClick?: () => void;
}
// 9. MapMarker
type MarkerStatus = "current" | "reached" | "clue" | "danger" | "locked" | "hidden";
type MarkerKind = "mountain" | "city" | "water" | "clue" | "danger" | "shrine";
interface MapMarkerProps {
  kind: MarkerKind; name: string; status?: MarkerStatus; isCurrent?: boolean; isReachable?: boolean;
  lockedHint?: string; onClick?: () => void;
}
// 10. LocationCard
interface LocationCardProps {
  name: string; description?: string; tags?: string[];
  availableActions?: ActionButtonProps[]; weather?: string; time?: string; danger?: string;
}
// 11. CharacterQuestDrawer
interface QuestItem { id: string; name: string; summary?: string; done?: boolean; }
interface CharacterQuestDrawerProps {
  playerSummary?: React.ReactNode; quickLinks?: React.ReactNode; inventoryPreview?: React.ReactNode;
  activeQuests?: QuestItem[]; openState: "open" | "closed"; onClose?: () => void;
}
// 12. BackToLatestButton
interface BackToLatestButtonProps {
  visibleWhenAwayFromLatest: boolean; unreadCount?: number; onClick: () => void;
}
```

> 状态表达三要素（说明书十二.6）：所有"状态/危险/警告"除颜色外必须同时有**文字 + 图标/结构**。`ActionButton` 危险用朱砂边线+「危」字标；`StatusMeter` warning 用文字「告急」+ 边框加粗；`ThreatPanel` dangerLevel 用中文等级词 + 符号；语义色 `life/stamina/resolve/nature` 强制 `SquareTag`/文案叠加文字。

---

## 4. 程序调用流程（Mermaid sequenceDiagram 见 `sequence-diagram.mermaid`）

关键链路：**加载 → 注入基准变量 → 渲染**；**切换高对比**（data-* + 变量，内容不重渲染）；**复制令牌**（经 `DsPlatform.clipboard`）；**断点模拟**（frame 宽度 state）；**组件状态切换**（Gallery 本地 state）。

---

## 5. 有序任务列表（交付工程师寇豆码，按依赖排列，≤5 任务）

| Task | 名称 | 源文件（≥3） | 依赖 | 优先级 |
|---|---|---|---|---|
| **T01** | 设计系统基座：令牌真源 + 作用域样式 + 平台适配 + 根/上下文 | `tokens.ts`、`design-system.css`、`DesignSystemRoot.tsx`、`dsPlatform.ts`、`page.tsx` | — | P0 |
| **T02** | 基础组件组：AppTopBar / BrushDivider / NarrativeBlock / ArchiveEvidenceCard / SquareTag / StatusMeter | 上述 6 个 `.tsx` + `components/index.ts` | T01 | P0 |
| **T03** | 复合与交互组件组：ActionButton / MapMarker / LocationCard / ThreatPanel / CharacterQuestDrawer / BackToLatestButton | 上述 6 个 `.tsx` + `components/index.ts` | T01 | P0 |
| **T04** | Living Demo：7 展示区 + 8 控件 + 状态机接线 | `demo/DemoApp.tsx`、`demo/sections.tsx`、`demo/controls.tsx`、`demo/useDemoState.ts`、`demo/contrast.ts` | T01,T02,T03 | P0 |
| **T05** | 验证与一致性：构建冒烟 + 令牌一致性自检 + a11y 基线 | `tests/design-system.test.mjs` | T01–T04 | P0 |

> 依赖图：T01 为根；T02、T03 并行（仅依赖 T01）；T04 依赖 T01+T02+T03；T05 最后。符合"尽量独立或仅依赖 T01"。

---

## 6. 依赖包列表

**零新增依赖。** 理由：
- `react@19.2.6` / `react-dom@19.2.6` 已在 `dependencies`；`tailwindcss@4.2.1` + `@tailwindcss/postcss` 已在 `devDependencies`，仅用于 `globals.css` 既有能力，本系统不新增 Tailwind 配置。
- **不引入 MUI**（PRD 硬约束）。
- 剪贴板用浏览器原生 `navigator.clipboard`（Web 标准，Cloudflare Workers 客户端运行时可用）；安全区用 CSS `env()` + `getComputedStyle`，无库。
- 对比度计算为纯函数（自写 `contrast.ts`），不引 `wcag-contrast` 等。
- 全部代码仅用 Web 标准 API，无 Node-only 依赖，Cloudflare Workers 部署兼容。

---

## 7. 共享知识（跨文件约定）

- **目录**：设计系统全部在 `app/design-system/`；组件 `components/`，demo `demo/`。
- **CSS 作用域根类**：`.shj-ds`（唯一）；所有设计系统 DOM 必须在其子树内。
- **CSS 变量命名前缀**：`--ds-c-*`（颜色）`--ds-f-*`（字体/字阶）`--ds-s-*`（间距）`--ds-sh-*`（形状/边框/层次）`--ds-tx-*`（纹理）`--ds-mo-*`（动效）。**禁止引用 globals 的 `--ink/--paper/--cinnabar/--gold/--moss/--line` 等**。
- **组件类名前缀**：`ds-`（如 `ds-topbar`、`ds-brush`、`ds-narrative`、`ds-evidence-card`、`ds-tag`、`ds-meter`、`ds-threat`、`ds-action-btn`、`ds-marker`、`ds-location-card`、`ds-drawer`、`ds-back-latest`）；状态修饰类 `ds-is-* / ds-has-*`。
- **状态命名**：组件状态用字符串联合类型（见 §3.3），CSS 以 `data-status="..."` 或 `ds-is-<state>` 表达；状态变化**不得仅用颜色**。
- **可访问性硬指标**：触摸目标 ≥44×44px、相邻间距 ≥8px（`--ds-s-stack-sm`）、焦点环 `2px + 3px` 偏移（见 `.shj-ds` reset）、`Tab` 序=视觉序、语义 `region` 标签（`header/nav/main/section[aria-label]`）。
- **令牌溯源**：每个 `TokenSpec.specRef` 必填；新增派生色（定力/自然）须注明"设计系统派生，须附文字"。
- **不修改 globals.css**：任何设计系统代码不得 `import` 或编辑 `app/globals.css`；隔离靠 `.shj-ds` 作用域。

---

## 8. 待明确事项（假设与需确认）

1. **派生语义色取值**：`定力=#6E8298`、`自然=#6F8A78` 为设计系统按"低饱和冷月蓝/苔绿"派生的低饱和值（说明书三.1 只给语义名未给精确 hex）。**须主理人/PM 确认**；当前强制"必须附文字"，不唯色。如后续规范给出精确值，改 `tokens.ts` 一处即可。
2. **demo 是否进入首页导航**：v1 为独立路由 `/design-system`，建议首页暂不强行接入，待集成阶段（任务 #3 范围）决定入口。
3. **断点模拟为 frame 容器**：用容器内 `width` 模拟 360–720 / 721–1050 / >1050，**不改变 window**；与真机 safe-area 不同，真机验证单列评审（符合 `WEB_MOBILE_STANDARD.md` 真机优先）。
4. **webfont 启用**：默认系统回退；若主理人要求精确字体观感，再于 `design-system.css` 启用 `@font-face` CDN（非阻塞）。当前未默认开启，避免离线 PWA 依赖网络。

---

## 9. 钉 PM 四个问题的定稿

1. **demo 落地形式**：独立路由 `/design-system` → `app/design-system/page.tsx`（vinext App Router 文件路由，复用根 layout 但 `.shj-ds` 作用域隔离；URL 可分享/评审，符合 PRD P0-7"独立网页"）。
2. **globals.css 集成时机**：v1 **不修改** `globals.css`；287 处硬编码改造单列评审（迁移路径见 §10）。确认。
3. **浅色纸卷**：v1 不做；令牌以 `{ base, highContrast }` + 根 `data-theme` 预留扩展位，未来加 `light` 仅新增一组值、组件零改动（预留但不实现，对应 P2-1）。
4. **字体加载**：系统优先回退栈为令牌真值；webfont 非阻塞渐进增强（`font-display: swap`）；离线 PWA/微信靠回退栈；微信迁移经 `AssetPort` 打包；v1 不自托管多 MB CJK 字体。

---

## 10. globals.css 集成迁移路径（约束 C）

- **v1 边界**：设计系统 + demo 完全独立，零 globals.css 改动；`globals.css` 仅被根 layout 引入，其浅色变量/`.mythic-shell` 偏离值**不影响** `.shj-ds` 子树。
- **后续集成（单列评审，非 v1）**：
  1. 在 `globals.css`（或新建 `app/theme.css`）引入 `@theme`/`:root` 引用设计系统令牌（`--ds-c-*` 等），替换 287 处硬编码色值为 `var(--ds-*)`。
  2. 将 `.mythic-shell` 偏离值（`#e0bd7e`/`#d56d50`/`#d8b46b` 等）对齐规范焦金 `#F5D294`、朱砂 `#920703`、primary-fixed-dim `#D5C5A8`。
  3. 高对比/减弱动效统一改由 `data-contrast`/`data-motion` 驱动（现有 `GameShell` 已用 `root.dataset.contrast`，可复用）。
  4. 游戏默认观感由浅色纸卷回归暗色湿墨（符合规范正向回归），需评审 200+ 处改造工作量与回滚方案。
- **双主题预留**：若主理人确认需浅色纸卷，新增 `tokens.ts` 的 `light` 覆盖集 + `data-theme="light"`，组件零改动即可支持（P2-1）。

---

—— ARCH 结束 ——
