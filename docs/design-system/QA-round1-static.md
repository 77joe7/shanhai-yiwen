# 设计系统 v1 · 第一轮静态验证报告（QA-round1-static）

- 审查人：严过关（Yan）/ QA 工程师
- 审查轮次：第一轮（静态、只读、未运行构建/测试）
- 审查日期：2026-08-19
- 仓库根：`D:\BaiduSyncdisk\01 personal\03 AI\项目\SHJyouxi\codex`
- 权威基线：`docs/ui-design/山海异闻录_UI界面说明书_Stitch参考包基线_V1.3.txt`（以下简称「说明书」）三/十一/十二/十三章

## 0. 审查边界与前提漂移说明

**本轮审查对象（工程师已锁定不再改动）：**
- `app/design-system/tokens.ts`（614 行）
- `app/design-system/design-system.css`（1745 行）
- `app/design-system/DesignSystemRoot.tsx`（220 行）
- `app/design-system/dsPlatform.ts`（176 行）
- `app/design-system/components/` 下 11 个组件：ActionButton / AppTopBar / ArchiveEvidenceCard / BrushDivider / CharacterQuestDrawer / LocationCard / MapMarker / NarrativeBlock / SquareTag / StatusMeter / ThreatPanel

**前提漂移（重要，影响第二轮判断）：**
主理人告知 `app/design-system/demo/`、`components/BackToLatestButton.tsx`、`components/index.ts`、`tests/design-system.test.mjs`「尚不存在」。但实测磁盘上 **`demo/` 目录、`BackToLatestButton.tsx`、`index.ts` 均已存在**。其中 `demo/controls.tsx` 还存在一处类型错误（见 G 节）。请主理人确认这些文件是否已稳定，还是仍视为并行补全中——这直接决定「第二轮能否直接 `pnpm run build`」。

**未做事项：** 未运行 `pnpm run build` / `pnpm test`（避免悬空引用噪音）；未修改任何被审查源码；未对 `demo/`、`BackToLatestButton.tsx`、`index.ts`、`tests/` 做深入审查（仅因 tsc 顺带发现 demo 一处类型错误而记录，见 G 节，不计入本轮稳定交付缺陷）。

---

## A. 色彩令牌逐条对账（说明书三.1）

将 `tokens.ts` 的 `COLOR_TOKENS` 与说明书三.1 原文逐条比对，**hex 完全一致，无错字/少位/大小写混乱/语义错配**。

| 规范语义（说明书三.1） | 规范 hex | tokens.ts id / varName | 实值 | 结果 |
|---|---|---|---|---|
| background 画布·湿墨石 | #17130F | bg / `--ds-c-bg` | #17130F | ✅ |
| surface-container-lowest 最深容器 | #110E0A | surface-lowest | #110E0A | ✅ |
| surface-container-low 低层容器 | #1F1B17 | surface-low | #1F1B17 | ✅ |
| surface-container 标准容器 | #231F1B | surface | #231F1B | ✅ |
| surface-container-high 高层容器 | #2E2925 | surface-high | #2E2925 | ✅ |
| surface-container-highest 最高层容器 | #39342F | surface-highest | #39342F | ✅ |
| on-surface 主文字·旧丝绢 | #EAE1DA | on-surface | #EAE1DA | ✅ |
| on-surface-variant 次文字·雾纸 | #CEC5B9 | on-surface-variant | #CEC5B9 | ✅ |
| outline 弱文字·残墨 | #979085 | outline | #979085 | ✅ |
| outline-variant 弱边框 | #4C463D | outline-variant | #4C463D | ✅ |
| primary 主要可交互文字·旧丝 | #FFF2DE | primary | #FFF2DE | ✅ |
| primary-container 主要填充·旧丝 | #E6D5B8 | primary-container | #E6D5B8 | ✅ |
| tertiary-container 金色细节·焦金 | #F5D294 | gold | #F5D294 | ✅ |
| primary-fixed-dim 固定金色·进度 | #D5C5A8 | gold-dim | #D5C5A8 | ✅ |
| secondary-container 朱砂危险 | #920703 | cinnabar | #920703 | ✅ |
| error 危险文本 | #FFB4AB | error | #FFB4AB | ✅ |
| error-container 危险底 | #93000A | error-container | #93000A | ✅ |

**《黑雨》补充语义色四条（说明书三.1）均存在且规范：**
- `life`（生命/伤势=朱砂暗红）：#920703，取 secondary-container 精确值；specRef 明确「取 secondary-container 朱砂精确值，须附文字」。
- `stamina`（精力/准备=焦金暗赭）：#D5C5A8，取 primary-fixed-dim 精确值；specRef 明确「取 primary-fixed-dim 精确值，须附文字」。
- `resolve`（定力/梦境/认知=低饱和冷月蓝 #6E8298）：specRef 明确标注「**派生值**（说明书三.1 仅给语义名「低饱和冷月蓝」，未给精确 hex）；须附文字」。✅ 标注到位。
- `nature`（自然/地点/可采集=低饱和苔绿 #6F8A78）：specRef 明确标注「**派生值**……」。✅ 标注到位。

**偏离值排查（主理人特别要求）：** 在 `app/design-system/` 全目录 grep `#e0bd7e / #d56d50 / #d8b46b / #c4a46a / #d15a42` —— **零命中**。确认设计系统未混入 `globals.css` 的偏差色板。佐证：`globals.css:550` 的 `.mythic-shell` 仍使用偏差色板（`--cinnabar:#d15a42`、`--gold:#c4a46a`、`--moss:#526d5a`、`--line:rgba(196,164,106,.3)`），而设计系统令牌使用的是 #920703 / #F5D294 / #6F8A78，二者彻底解耦。

**结论：A 节无缺陷，无阻断。**

---

## B. 令牌可溯源性

遍历 `ALL_TOKENS`（COLOR 21 + FONT 22 + SPACE 6 + SHAPE 11 + TEXTURE 5 + MOTION 4 = 69 条）及 `TYPE_SCALE`、`BREAKPOINTS` 的 `specRef`：

- 全部 `specRef` **非空**、**非空串**、**指向真实规范位置**（如「说明书三.1」「说明书三.3」「说明书十一.4」「说明书十二.2」等，并交叉引用 `DESIGN.md` 路径）。
- 未发现「编造的章节号」或「指向不存在章节」的条目。
- `resolve` / `nature` 两条以「派生值（……）」前缀明确标注为派生，符合主理人已批准的处置方式。

**结论：B 节通过，无缺陷。**

---

## C. 字体与间距令牌

**字体 6 级（说明书三.3）：**

| 级别 | 规范要求 | tokens.ts 实值 | 结果 |
|---|---|---|---|
| 显示标题 | 36/700/lh1.2/ls0.1em | display-size 36px, weight 700, lh 1.2, ls 0.1em | ✅ |
| 大标题 | 24/600/lh1.4 | headline-size 24px, weight 600, lh 1.4 | ✅ |
| 手机标题 | 20/600/lh1.4 | headline-mobile-size 20px, weight 600, lh 1.4 | ✅ |
| 叙事正文 | 18/400/lh1.8 | body-size `clamp(16px,4.6cqi,18px)`, weight 400, lh 1.8 | ⚠️ 见下 |
| 辅助正文 | 14/400/lh1.6 | body-sm-size 14px, weight 400, lh 1.6 | ✅ |
| 标签系统 | 12/700/lh1/ls0.2em | label-size 12px, weight 700, lh 1, ls 0.2em | ✅ |

**说明（非缺陷）：** 叙事正文字号实现为 `clamp(16px, 4.6cqi, 18px)`（上限 18px、下限 16px），与说明书三.3「叙事正文 18px；窄屏可降至逻辑 16px、不得低于此值」**完全兼容**，并非错配。中文回退栈三套均存在：
- 衬线栈：`"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun",Georgia,serif` ✅
- 阅读栈：`Literata,"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun",Georgia,serif` ✅
- 标签栈：`"Source Serif 4","Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif` ✅

**间距 6 档（说明书三.4）：** 4 / 8 / 12 / 16 / 20 / 24 完全一致（`--ds-s-unit:4px`、`--ds-s-stack-sm:8px`、`--ds-s-gutter:12px`、`--ds-s-stack-md:16px`、`--ds-s-margin-edge:20px`、`--ds-s-stack-lg:24px`）。✅

**结论：C 节通过，无阻断（body-size 为合规的自适应实现，非缺陷）。**

---

## D. 对比度实测（WCAG 2.2 AA，说明书十二.5）

算法：sRGB 线性化 → 相对亮度 → (L1+0.05)/(L2+0.05)。背景取 `#17130F`。脚本在系统临时目录（`/tmp`）执行，**未在仓库内留文件**。

| 组合（前景 vs #17130F） | 实测对比度 | 阈值 | 判定 |
|---|---|---|---|
| on-surface #EAE1DA 作正文 | **14.33:1** | ≥4.5 | ✅ PASS |
| on-surface-variant #CEC5B9 作次要文字 | **10.83:1** | ≥4.5 | ✅ PASS |
| outline #979085 作弱文字 | **5.85:1** | ≥4.5 | ✅ PASS |
| outline #979085 作边框 | 5.85:1 | ≥3 | ✅ PASS |
| tertiary-container #F5D294 作文字 | **12.78:1** | ≥4.5 | ✅ PASS |
| primary-container #E6D5B8 作文字 | **12.82:1** | ≥4.5 | ✅ PASS |
| error #FFB4AB 作文字 | **10.88:1** | ≥4.5 | ✅ PASS |
| primary #FFF2DE 作文字 | **16.73:1** | ≥4.5 | ✅ PASS |
| gold #F5D294 作文字 | 12.78:1 | ≥4.5 | ✅ PASS |
| stamina/gold-dim #D5C5A8 作文字 | **10.89:1** | ≥4.5 | ✅ PASS |
| resolve #6E8298 作文字 | **4.67:1** | ≥4.5 | ✅ PASS |
| nature #6F8A78 作文字 | **4.91:1** | ≥4.5 | ✅ PASS |

**派生色作填充（其上文字对比）：**
- resolve #6E8298 填充 + 暗字 #110E0A = **4.87:1**（≥4.5 ✅）；+ 亮字 #EAE1DA = 3.07:1（FAIL，故派生色填充须配暗字）。
- nature #6F8A78 填充 + 暗字 #110E0A = **5.12:1**（≥4.5 ✅）；+ 亮字 #EAE1DA = 2.92:1（FAIL）。
- 实际 CSS 中 resolve/nature 仅作**文字色**或**边框色**，未发现「亮字 + 派生色填充」的用法，故无实际不达标组合。

**高对比模式（`tokens.ts` 的 `highContrast` 覆盖）：** 取高对比背景 #0D0A07 复核原本临界/偏弱组合——on-surface-variant #EFE7DC = 16.11:1、outline #C6BEB0 = 10.71:1、resolve #90A6BC = 7.87:1、nature #92AB9A = 8.00:1，全部进一步达标。高对比覆盖有效。✅

**信息项（非缺陷）：** `cinnabar`/`life` #920703 在 #17130F 上仅 **1.98:1**，但不达标属预期——朱砂是**深色填充/边框色**（危险边框、危险标记），全仓库均不作文字色使用（CSS 与组件已核验无 `color: var(--ds-c-cinnabar/life)` 作正文场景）。故不计入缺陷。

**结论：D 节全部在审组合达标，无阻断。唯一注意点是「派生色填充必须配暗字」，当前代码未违反。**

---

## E. 样式隔离有效性

1. **硬编码色值：** `design-system.css` 实际规则中无任何 `#hex` / `rgb()` / `rgba()` / `hsl()`；grep 命中的仅出现在第 6、9 行**注释**（规则声明本身）。全部颜色走 `var(--ds-*)`。✅
2. **误引用 globals 变量：** 未引用 `--ink` / `--paper` / `--cinnabar` / `--gold` / `--moss` / `--line`（grep 仅在注释第 9 行出现）。✅
3. **作用域泄漏：** 所有选择器均在 `.shj-ds` 下；无 `:root` / `html` / `body` 裸元素选择器；`@keyframes` 为全局性是 CSS 固有（仅被命名引用，不影响元素选择）。`@media` / `@container` 内选择器均带 `.shj-ds` 前缀。✅
4. **焦点环覆盖：** `design-system.css:69` `.shj-ds button:focus-visible`（特异性 **0,2,1**）覆盖 `globals.css:23` `button:focus-visible`（**0,1,1**），值为 `outline: 2px solid var(--ds-c-primary)` + `outline-offset: 3px`。符合说明书十二.3（2px 旧丝/朱砂、3px 偏移）。✅
5. **圆角：** 全部 `border-radius: var(--ds-sh-radius)`（=0px），无违规大圆角（兼容上限令牌 `--ds-sh-radius-max:4px` 仅作令牌存在，未被突破）。✅
6. **噪点层：** `.shj-ds .ds-noise`（line 102）含 `pointer-events: none`。✅
7. **厚阴影：** `--ds-sh-elevation` = `none`，所有 `box-shadow: var(--ds-sh-elevation)`。深度仅靠色调层 + 1px 细线。✅

**结论：E 节通过，无缺陷。**

---

## F. 11 组件契约与可访问性静态审查

| 组件 | 说明书契约属性 | 核对结果 | 状态三要素铁律 |
|---|---|---|---|
| ActionButton (08) | icon/label/shortcut/enabled/reason/dangerLevel | ✅ props 齐全；危险有「危/慎」标记 + 边框加粗 + 禁用原因 | ✅ 文字+图标+结构 |
| AppTopBar (01) | title/leftAction/rightAction/sticky/safeArea | ✅ 另有 variant/loading/disabled 覆盖规范状态；64px 栏、44×44 操作位、载入态含「载入中」文字+闪块 | ✅ |
| ArchiveEvidenceCard (04) | icon/title/category/description/knowledgeLevel/status | ✅ 7 状态齐全（未知/传闻/实证/洞彻/锁定/已获得/已失去）；认知刻度带 `n/4` 文本 | ✅ 中文词+符号+边框样式 |
| BrushDivider (02) | 1px 两端透明中部淡金、可带图标/标签 | ✅ `role=separator`、渐变 `pointer-events:none` | ✅ |
| NarrativeBlock (03) | timeLabel/locationLabel/text/isLatest/typewriterState | ⚠️ prop 名为 `typewriter`（见 F-1） | ✅ KIND_LABEL+KIND_MARK |
| LocationCard (10) | name/description/tags/availableActions/weather/time/danger | ✅ 与契约**逐字一致**；危险用「危险：xxx」文字+朱砂标签 | ✅ 文字+颜色 |
| MapMarker (09) | kind/name/status/isCurrent/isReachable/lockedHint | ✅ 6 状态齐全；`aria-label` 含名称/类型/状态/可达 | ✅ 中文词+符号+边框 |
| SquareTag (05) | label/tone/icon/interactive | ✅ 语义色附 `TONE_MEANING` 读屏说明（不唯色）；方括号、直角 | ✅ 文字+语义说明 |
| StatusMeter (06) | label/value/max/tone/warningState | ✅ 含「当前值/最大值」文本 `n/max`；`role=meter`+aria-value* | ✅ 文字+轨道加粗 |
| ThreatPanel (07) | name/type/intentText/stability/life/dangerLevel/knownWeakness | ✅ 6 等级齐全；嵌 StatusMeter | ✅ 中文词+符号+边框 |
| CharacterQuestDrawer (11) | playerSummary/quickLinks/inventoryPreview/activeQuests/openState | ✅ Esc 关闭 + 遮罩关闭 + 打开时焦点入抽屉；见 F-3 | ✅ |

**通用项核对：**
- **触控 ≥44×44 / 相邻 ≥8px：** ActionButton(`min-width:calc(touch*1.6)`,`min-height:touch`)、AppTopBar 按钮、MapMarker、SquareTag(按钮)、CharacterQuestDrawer 关闭键均为 44px；`.ds-touch-row` gap = stack-sm(8px)。✅
- **StatusMeter 当前值/最大值文本：** `valueText = ${safeValue}/${safeMax}` 始终渲染。✅
- **语义标签/ARIA：** header/article/section/role=dialog|meter|separator、aria-label、aria-busy、aria-valuenow/min/max/text、aria-pressed、ds-sr-only 补充语义均到位。✅
- **模块顶层浏览器全局：** 11 组件均**无**模块顶层 `navigator`/`window`/`document` 访问；浏览器能力一律经 `dsPlatform` 适配层（组件中仅 `useEffect`/`useRef` 等 React hooks 在函体内惰性使用，DesignSystemRoot 经 `useRef` 惰性 `resolveDsPlatform()`）。✅ 无 SSR/Workers 崩溃风险。
- **"use client" 边界：** 11 组件**均显式声明 `"use client"`**（注：这与主理人「全仓库仅 GameShell 与 DesignSystemRoot 显式声明」的描述不符——实际 11 组件也各自声明了，反而更安全），无 Server Component 误用 hooks。✅

**F 节发现（均为次要，无阻断）：**
- **F-1（次要）：** `NarrativeBlock.tsx:37` prop 名为 `typewriter`，而说明书十一.3 契约写为 `typewriterState`。仅命名差异，功能等价（控制逐字播放），不影响实现。
- **F-2（次要）：** `MapMarker.tsx:84` 外套 `<span className="ds-marker-wrap">`，但 `design-system.css` 无 `.ds-marker-wrap` 规则。该 span 为默认 inline，对 flex 布局无实质破坏，仅属未定义样式的小遗漏。
- **F-3（观察/非缺陷）：** `CharacterQuestDrawer` 打开时 `headingRef.focus()` 移入、Esc/遮罩关闭均已实现；但**关闭后焦点回归触发元素**交由调用方在 `onClose` 中处理（组件为受控组件，注释已说明）。独立复用该组件时需调用方自行恢复焦点，属设计取舍而非缺陷。

**结论：F 节契约齐全、铁律达成、可访问性到位，无阻断。**

---

## G. TypeScript 类型检查

执行 `npx tsc --noEmit`（不触发 vinext 构建）。

- **被审查的 4 稳定文件 + 11 组件：零类型错误。** ✅（tokens.ts / DesignSystemRoot.tsx / dsPlatform.ts 及全部 11 组件均未出现在错误列表中）
- **已知项（按主理人指示忽略）：** `app/design-system/page.tsx(4,25)` TS2307 `Cannot find module './demo/DemoApp'`（悬空引用，待 demo 补全）。
- **并行补全中的 demo 文件（超出本轮静态审查范围，但会阻塞第二轮 build）：** `app/design-system/demo/controls.tsx(23,15)` TS2724 `'"./useDemoState"' has no exported member named 'DemoStateApi'. Did you mean 'DemoState'?` —— 已转交 Engineer（寇豆码）在第二轮前修复。
- **其余错误（不在本轮 design-system 范围，与本轮交付无关，仅信息提示）：** `app/game/gameData.ts`、`app/game/GameShell.tsx`、`app/game/storyRuntime.ts`、`worker/index.ts` 存在预存类型错误，属游戏逻辑/Worker 模块，非设计系统问题。

**结论：稳定交付代码类型干净。**

---

## 智能路由判定

| 类别 | 判定 | 说明 |
|---|---|---|
| 源码缺陷（阻断/重要） | **无** | A–F 节未发现任何阻断或重要级缺陷 |
| 规范歧义 / 需产品决策 | **无** | 未发现需 ProductManager 裁决的歧义 |
| 距第二轮需跟进（非本轮稳定交付缺陷） | **Engineer（寇豆码）** | `demo/controls.tsx(23,15)` 类型错误，第二轮 build 前修复 |
| 总体路由 | **NoOne** | 稳定交付物无需返工，可进入第二轮（构建 + 交互验证），待 demo 补全 |

### 阻断级缺陷清单（供主理人决策）
**无。** 本轮静态验证在色彩对账、令牌溯源、字体间距、WCAG 对比度、样式隔离、组件契约与可访问性、类型检查七个维度均未发现阻断级问题，稳定代码质量高、与说明书三/十一/十二/十三章高度一致。

### 进入第二轮的依赖
- 等待 `demo/`、`BackToLatestButton.tsx`、`index.ts`、`tests/design-system.test.mjs` 补全并稳定；
- Engineer 修复 `demo/controls.tsx` 的 `DemoStateApi` 导出类型错误；
- 修复后运行 `pnpm run build` 与交互/可访问性实测（第二轮验证内容）。

---

*附：对比度脚本在 `/tmp` 临时目录执行，未写入仓库；所有 grep 证据均指向具体文件:行号，可复核。*
