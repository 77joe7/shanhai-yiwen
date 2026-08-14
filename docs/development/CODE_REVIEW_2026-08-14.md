# 《山海异闻录：天地未定》代码健康度 Review 报告

- 日期：2026-08-14
- 范围：`D:\BaiduSyncdisk\01 personal\03 AI\项目\SHJyouxi\codex`
- 基线：分支 `main`，HEAD `99c12f9`（已推送 GitHub）

---

## 一、结论速览（TL;DR）

整体**骨架健康、规范齐备、功能完整可运行**，但有 **3 类明确欠账**：① 内容包 JSON 与严格 TS 契约不匹配（19 个 tsc 错误，全为既有）；② 测试是「读源码正则匹配」而非运行时单测，覆盖浅；③ 存在未接线的死代码与未实现的平台端口。

本轮**立即修复 2 项**（ESLint 忽略 `.wrangler` 缓存、还原 `vite.config.ts` 无意义 EOF 改动），其余按优先级列入建议。

| 维度 | 评分 | 说明 |
|---|---|---|
| 构建/运行 | ✅ 良 | `npm run build` 通过，Cloudflare Worker 可部署运行 |
| 类型安全 | ⚠️ 中 | 19 个既有 tsc 错误，集中在内容 JSON ↔ TS 契约 |
| 测试 | ⚠️ 弱 | 7/7 通过，但为源码模式断言，非运行时 |
| 代码规范 | ✅ 良 | ESLint 修复后 0 错误（此前 164 全是 `.wrangler` 临时产物） |
| 接口完整性 | ⚠️ 中 | 平台适配层缺「账号/云存档」端口；`src/content` 契约未接线 |
| 内容可见性 | ⚠️ 中 | 移动端隐藏了「当前所在/缺陷/危险状态」等多项信息 |

---

## 二、自动化检查结果

### 1. 测试套件 —— 7/7 通过，但覆盖浅
```
# tests 7  # pass 7  # fail 0  # skipped 0
```
- `tests/game-state.test.mjs` 是**读源码做正则断言**（如 `assert.match(source, /function StoryPanel/)`），**不执行运行时逻辑**。
- 覆盖点：StoryPanel 渲染、平台边界、存档隔离、山海志/行囊接口、内容包完整性（365 节点/8 出身）、移动端抽屉。
- **缺口**：无针对 `storyRuntime.applyEffects`、`testPredicate`、多角色存储、`highlightText` 等核心逻辑的**真单元测试**。重构易误报、回归靠人工。

### 2. 类型检查 tsc —— 19 个既有错误
| 文件 | 数量 | 根因 |
|---|---|---|
| `storyRuntime.ts` | 10 | 内容 JSON 的 `when/visibleWhen/speaker/disabledHint/costs/effects` 字段在严格 TS 契约中未声明 |
| `GameShell.tsx` | 6 | `speaker/sourceTag/disabledHint/text` 在 choice/block/item 类型上不存在 |
| `gameData.ts` | 2 | `unique.red_arrow.owner` 为 `null`，与 `Record<string, string|number|boolean>` 索引签名冲突 |
| `worker/index.ts` | 1 | `Fetcher` 类型未声明（缺 Cloudflare 类型） |

- 全部为**改动前既有**，非本次引入。本质：`内容包 JSON` 的宽松结构 vs `contracts.ts` 的严格类型不一致。

### 3. ESLint —— 修复后 0 错误
- 原 164 个错误**全部在 `.wrangler/tmp/deploy-*/index.js`**（wrangler 部署临时产物），非源码问题。
- **已修复**：`eslint.config.mjs` 的 `globalIgnores` 加入 `.wrangler/**`、`.vinext/**`，复跑 0 错误。

### 4. Git 状态
- 干净；曾残留 `vite.config.ts` 一个「文件末尾缺换行」的无意义改动（wrangler 自动配置碰过），**已还原**。

---

## 三、缺失接口（Missing Interfaces）

1. **`src/content/contracts.ts` + `blackRainAdapter.ts` 未接线**（P1）
   - 定义了 `Predicate/Effect/StoryNode/ContentPack` 等形式化契约 + `BlackRainContentAdapter` 参考实现，但**全仓库无任何 import**（仅被 `剧情/.../接入说明.md` 文档引用）。
   - 现状：运行引擎 `app/game/storyRuntime.ts` 与这套契约**并存但未对齐**，属目标架构/参考代码，存在重复维护与类型漂移风险。

2. **PlatformAdapter 缺「账号/云存档」端口**（P1）
   - 现有端口：`storage / lifecycle / feedback / files`。
   - 缺：`auth`（账号登录）、`cloudSave`（云存档同步）、`payment`。游戏内 `SideRail` 仍显示「正式版预留：账号 · 云存档 · 平台能力」。
   - 与已建的 Supabase 项目（`shanhai-yiwen`，Project URL + Publishable key 已就位）**尚未对接**。

3. **`worker/index.ts` 缺 Cloudflare 类型**（P2）
   - `Fetcher` 未声明导致 1 个 tsc 错误；补 `@cloudflare/workers-types` 或声明类型即可。

4. ✅ 六维属性（体魄/身法/灵识/心志/机巧/言契）**已被消费**，非缺口：`storyRuntime.ts` 中 `statKeyByContentStat` + `state.stats[key] >= predicate.value` 已把六维接入判定。

---

## 四、内容被遮盖 / 隐藏

以下均为**移动端（≤720px）`display:none`**，属响应式设计，但部分会「藏掉信息」：

| 被隐藏内容 | 位置 | 影响 |
|---|---|---|
| `.location-card`（当前所在）、`.traits`（缺陷） | 移动端 `.character-rail` | 竖屏看不到「当前所在/缺陷」，只能进角色抽屉看 |
| `.danger-status`（危险状态） | 移动端 `.character-rail` | 竖屏看不到「异兆缠身/暂无重伤」 |
| `.people-panel p`（人物描述）、`.empty-chapter p`、`.system-callout` | 移动端 | 人物详细描述、章节说明被藏 |

**判定**：`.mobile-status-strip`/`.command-dock`/choices 打字隐藏等属**合理**（响应式/需求）；但 **location/traits/danger-status 在移动端被藏**值得改进——建议在移动端状态条或角色抽屉里补出。

**已修复的历史「隐藏」项**（本次会话早前处理）：
- 六维属性此前**从未渲染**（已补 `StatChips` 三处展示）。
- `ARCHITECTURE.md`「第一章剧情为空」过时描述（已同步）。
- `codex.json`「退水河床」条目缺花括号被合并丢失（已修复，33 条）。

---

## 五、代码健康度

1. **类型漂移**：内容 JSON 宽松字段 vs `contracts.ts` 严格类型（19 tsc 错）。修法：在 `contracts.ts`/`storyRuntime` 补全 `speaker/sourceTag/disabledHint/when/visibleWhen/enabledWhen/costs/effects` 等可选字段类型。
2. **测试薄弱**：源码正则断言，无运行时单测；核心逻辑（applyEffects/predicate/存储迁移/高亮）无覆盖。
3. **死代码**：`src/content/`（未接线，二选一：接线或删除）。
4. **文档同步**：`README.md`/`ARCHITECTURE.md` 已基本同步现状（此前过时已修）。

---

## 六、建议修复优先级

| 优先级 | 事项 | 工作量 |
|---|---|---|
| **P0** | （已完成）ESLint `globalIgnores` 加 `.wrangler/**`、`.vinext/**`；还原 `vite.config.ts` EOF | 已做 |
| **P1** | 补全 `storyRuntime`/`contracts` 内容字段类型，消掉 19 个 tsc 错误 | 中 |
| **P1** | 决定 `src/content/` 去留：接线为正式运行时，或删除避免双实现漂移 | 中 |
| **P1** | `PlatformAdapter` 增加 `auth`/`cloudSave` 端口，对接已建的 Supabase 云存档 | 中 |
| **P2** | 移动端补显示「当前所在/缺陷/危险状态」 | 小 |
| **P2** | 为核心逻辑补真单元测试（applyEffects/predicate/多角色存储/highlightText） | 中 |
| **P2** | `worker/index.ts` 补 Cloudflare `Fetcher` 类型 | 小 |

---

## 七、附：本次 Review 已顺手做的改动

1. `eslint.config.mjs`：`globalIgnores` 新增 `.wrangler/**`、`.vinext/**`（消除 164 个假阳性）。
2. `vite.config.ts`：还原 EOF 换行的无意义改动（`git checkout`）。

（以上 2 项未提交，留待你确认后随下批一起提交，或现在即可提交。）
