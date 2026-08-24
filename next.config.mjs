/** @type {import('next').NextConfig} */
// GitHub Pages 项目页部署在 /<repo> 子路径下，需 assetPrefix 让静态资源 URL 带对应前缀，否则浏览器会去根域请求 /_next/... 而 404。
// 通过 GITHUB_PAGES 环境变量切换：部署构建时设为 true，本地 dev / EdgeOne 根域托管不设，保持原行为。
// 不用 basePath：vinext 静态导出在 basePath 下不生成 index.html（已验证）。
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  // 静态导出：将整站预渲染为静态 HTML+资源，托管到 EdgeOne Pages（国内直连，无需服务端运行时）。
  output: "export",
  // 静态托管无图片优化服务，关闭 next/image 运行时优化（本项目未使用 next/image，保留以防万一）。
  images: { unoptimized: true },
  // 仅 GitHub Pages 部署时附加资源 URL 前缀；其余托管目标不受影响。
  ...(isGithubPages ? { assetPrefix: "/shanhai-yiwen" } : {}),
};

export default nextConfig;
