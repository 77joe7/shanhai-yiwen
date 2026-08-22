// 设计系统 v1 静态 + 运行时验证（node:test）
//
// 运行：node --test tests/design-system.test.mjs
// （本仓库 Node 22 默认支持 .ts 类型剥离，故可直接导入 .ts 真源做对比度/令牌校验；
//   结构性校验改用 fs 读取 + 正则，避免导入 JSX 组件触发 JSX 转译。）
//
// 覆盖（对齐任务 #3 验证清单）：
//  A. 运行时：全部令牌规范溯源、派生色「派生」标记、色彩令牌完整性、对比度双模式达标/补偿、
//           对照表条目一致、formatRatio 格式化。
//  B. 静态：CSS 无硬编码色值/旧变量名/含高对比选择器；components 恰 13 tsx 且 barrel 导出 13 组件；
//           demo 目录齐备且 DemoApp 具名导出匹配 page.tsx；含 hooks/事件文件首行 "use client"；
//           contrast.ts 无 DOM 访问且导出核心函数；tokens.ts/dsPlatform.ts 模块顶层无裸全局绑定。

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

import {
  evaluateAllContrast,
  CONTRAST_PAIRS,
  formatRatio,
} from "../app/design-system/demo/contrast.ts";
import {
  resolveTokenValue,
  ALL_TOKENS,
  COLOR_TOKENS,
  TOKEN_BY_VAR,
} from "../app/design-system/tokens.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DS = join(ROOT, "app", "design-system");

const readDs = (rel) => readFileSync(join(DS, rel), "utf8");

/** 令牌取值解析器（双模式），供对比度评估使用。 */
const resolver = (varName, highContrast) => resolveTokenValue(varName, { highContrast });

const COMPONENT_NAMES = [
  "AppTopBar", "BrushDivider", "NarrativeBlock", "ArchiveEvidenceCard",
  "SquareTag", "StatusMeter", "ActionButton", "MapMarker", "ThreatPanel",
  "LocationCard", "CharacterQuestDrawer", "BackToLatestButton", "IllustrationFrame",
];

// ---------------------------------------------------------------------------
// A. 运行时校验（直接导入 .ts 真源）
// ---------------------------------------------------------------------------

test("全部令牌均有规范出处 specRef", () => {
  const missing = ALL_TOKENS.filter((t) => !t.specRef || t.specRef.trim().length === 0);
  assert.equal(
    missing.length,
    0,
    `缺失 specRef 的令牌：${missing.map((t) => t.varName).join(", ")}`,
  );
});

test("派生色令牌 specRef 含「派生」标记", () => {
  for (const name of ["--ds-c-resolve", "--ds-c-nature"]) {
    const tk = TOKEN_BY_VAR[name];
    assert.ok(tk, `缺少派生色令牌 ${name}`);
    assert.ok(/派生/.test(tk.specRef || ""), `派生色 ${name} 的 specRef 未标「派生」：${tk.specRef}`);
  }
});

test("色彩令牌不少于 17 条且每条取值可解析为颜色", () => {
  assert.ok(COLOR_TOKENS.length >= 17, `色彩令牌应为 ≥17 条，实为 ${COLOR_TOKENS.length}`);
  for (const c of COLOR_TOKENS) {
    const value = resolveTokenValue(c.varName, { highContrast: false });
    assert.match(value, /^#?[0-9a-fA-F]/, `色彩令牌 ${c.varName} 取值不可解析：${value}`);
  }
});

test("全部对比度组合均达标或有文字/结构补偿（无裸 fail）", () => {
  const results = evaluateAllContrast(resolver);
  const fails = results.filter(
    (r) => r.verdict === "fail" || r.verdictHighContrast === "fail",
  );
  assert.equal(
    fails.length,
    0,
    `存在不达标且无补偿的组合：${fails.map((f) => f.pair.id).join(", ")}`,
  );
});

test("对比度对照表条目数量与 CONTRAST_PAIRS 一致", () => {
  const results = evaluateAllContrast(resolver);
  assert.equal(results.length, CONTRAST_PAIRS.length);
});

test("非文字线索组合均达标或被补偿（杜绝唯色）", () => {
  const results = evaluateAllContrast(resolver);
  for (const r of results) {
    if (r.pair.kind === "non-text") {
      assert.ok(r.verdict !== "fail", `非文字组合 ${r.pair.id} 不达 3:1 且未补偿`);
      assert.ok(r.verdictHighContrast !== "fail", `非文字组合 ${r.pair.id} 高对比下未补偿`);
    }
  }
});

test("formatRatio 格式化正确", () => {
  assert.equal(formatRatio(14.333), "14.33:1");
  assert.equal(formatRatio(null), "—");
});

// ---------------------------------------------------------------------------
// B. 静态校验（fs 读取 + 正则，不导入 JSX）
// ---------------------------------------------------------------------------

test("components 恰 13 个 tsx 且统一 barrel 导出 13 个组件", () => {
  const files = readdirSync(join(DS, "components")).filter((f) => f.endsWith(".tsx"));
  assert.equal(files.length, 13, `components/*.tsx 应为 13 个，实为 ${files.length}：${files.join(", ")}`);
  const expected = COMPONENT_NAMES.map((n) => `${n}.tsx`).sort();
  const actual = files.slice().sort();
  assert.deepEqual(actual, expected, `组件文件集与预期不符：实际 ${actual.join(", ")}`);
  const barrel = readDs("components/index.ts");
  for (const name of COMPONENT_NAMES) {
    assert.ok(new RegExp(`\\b${name}\\b`).test(barrel), `barrel 未导出组件 ${name}`);
  }
  assert.ok(/from "\.\/AppTopBar"|from '\.\/AppTopBar'/.test(barrel), "barrel 未从 ./AppTopBar 等相对路径重导出");
});

test("demo 目录齐备且 DemoApp 具名导出匹配 page.tsx", () => {
  for (const f of ["DemoApp.tsx", "sections.tsx", "controls.tsx", "contrast.ts", "useDemoState.ts"]) {
    assert.ok(existsSync(join(DS, "demo", f)), `demo/${f} 缺失`);
  }
  const demoApp = readDs("demo/DemoApp.tsx");
  assert.ok(/export\s+(function|const)\s+DemoApp\b/.test(demoApp), "DemoApp.tsx 未具名导出 DemoApp");
  const page = readDs("page.tsx");
  assert.ok(
    /import\s*\{\s*DemoApp\s*\}\s*from\s*"\.\/demo\/DemoApp"/.test(page),
    "page.tsx 未从 ./demo/DemoApp 具名导入 DemoApp",
  );
});

test("design-system.css 无硬编码色值、不含旧变量名、含高对比选择器", () => {
  const raw = readDs("design-system.css");
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, ""); // 去块注释，避免注释中的 #hex/rgb 误判
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), "CSS 存在硬编码十六进制色值");
  assert.ok(!/\brgba?\s*\(/.test(css), "CSS 存在硬编码 rgb()/rgba()");
  assert.ok(!/\bhsl\s*\(/.test(css), "CSS 存在硬编码 hsl()");
  for (const legacy of ["--ink", "--paper", "--cinnabar", "--gold", "--moss", "--line"]) {
    assert.ok(!css.includes(legacy), `CSS 仍引用旧变量 ${legacy}`);
  }
  assert.ok(/\[data-contrast="high"\]/.test(css), 'CSS 缺少 [data-contrast="high"] 高对比选择器');
  for (const c of COLOR_TOKENS) {
    assert.ok(c.highContrast, `色彩令牌 ${c.varName} 缺少 highContrast 取值`);
  }
});

test("含 hooks/事件的文件首行均为 \"use client\"", () => {
  const hookRe = /use[A-Z]\w*\s*[<(]|onClick|onKeyDown|onChange|onMouse|onFocus|onBlur|onPointer|addEventListener|onEscape/;
  const walk = (dir) => {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
    }
    return out;
  };
  const skip = new Set(["design-system.css", "tokens.ts", "dsPlatform.ts"]);
  const files = walk(DS).filter((f) => !skip.has(basename(f)));
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (hookRe.test(src)) {
      const first = src.split("\n").find((l) => l.trim().length > 0) || "";
      assert.equal(
        first.trim(),
        '"use client";',
        `文件 ${f} 含 hooks/事件但未以 "use client" 开头`,
      );
    }
  }
});

test("contrast.ts 无 DOM 访问且导出核心函数", () => {
  const src = readDs("demo/contrast.ts");
  assert.ok(!/\b(window|document|navigator)\b/.test(src), "contrast.ts 引用了 window/document/navigator");
  assert.ok(/export\s+(function|const)\s+contrastRatio\b/.test(src), "contrast.ts 未导出 contrastRatio");
  assert.ok(/export\s+(function|const)\s+relativeLuminance\b/.test(src), "contrast.ts 未导出 relativeLuminance");
});

test("tokens.ts / dsPlatform.ts 模块顶层无裸 window/document/navigator 绑定", () => {
  const globalRe = /(?<!typeof\s)(?<![\w.])(window|document|navigator)\b/;
  for (const rel of ["tokens.ts", "dsPlatform.ts"]) {
    const src = readDs(rel).replace(/\/\*[\s\S]*?\*\//g, ""); // 去块注释，避免注释中的 window/document 误判
    let depth = 0;
    let topLevelRef = false;
    for (const raw of src.split("\n")) {
      const line = raw.replace(/\/\/.*$/, ""); // 去行注释
      for (const ch of line) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      if (depth <= 0 && globalRe.test(line)) {
        topLevelRef = true;
        break;
      }
    }
    assert.ok(!topLevelRef, `${rel} 模块顶层存在裸 window/document/navigator 绑定`);
  }
});
