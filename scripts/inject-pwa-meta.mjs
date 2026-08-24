import fs from "node:fs";
import path from "node:path";

// GitHub Pages 项目页带 /<repo> 子路径前缀，favicon 等绝对路径需同步加前缀，否则 404。
const githubPagesBase = process.env.GITHUB_PAGES === "true" ? "/shanhai-yiwen" : "";

const indexPath = path.resolve("dist/client/index.html");
if (!fs.existsSync(indexPath)) {
  console.error("[inject-pwa-meta] dist/client/index.html 不存在，请先运行 vite build");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf8");

// 1. viewport meta：追加 viewport-fit=cover（如尚未存在）
html = html.replace(/<meta name="viewport" content="([^"]*)"\s*\/?>/, (match, content) => {
  if (/viewport-fit=/.test(content)) return match;
  return `<meta name="viewport" content="${content}, viewport-fit=cover"/>`;
});

// 2. 补齐 iOS PWA standalone meta（若已存在则不重复）
const metaInjects = [
  ["apple-mobile-web-app-capable", "yes"],
  ["mobile-web-app-capable", "yes"],
  ["apple-mobile-web-app-status-bar-style", "black-translucent"],
  ["theme-color", "#17130f"],
  ["apple-touch-icon", `${githubPagesBase}/favicon.svg`],
];
for (const [name, value] of metaInjects) {
  const tag = `<meta name="${name}" content="${value}"/>`;
  const tagNoSlash = `<meta name="${name}" content="${value}">`;
  if (html.includes(`name="${name}"`)) {
    // 统一替换已有 theme-color 为 #17130f；其他若存在也强制覆盖
    html = html.replace(new RegExp(`<meta name="${name}" content="[^"]*"\/?>`), tag);
  } else {
    html = html.replace("</head>", `${tag}</head>`);
  }
}

fs.writeFileSync(indexPath, html);
console.log("[inject-pwa-meta] PWA meta 已注入 dist/client/index.html");