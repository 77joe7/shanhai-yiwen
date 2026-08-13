# 山海异闻录：天地未定

本目录是项目后续设计、文档、数据与工程工作的受控工作区。

## 当前基线

- 版本：`1.3.0`
- 基线文档：`山海异闻录_天地未定_游戏设计说明书暨开发任务书_V1.3_优化修订版.docx`
- 发布预览：`山海异闻录_天地未定_游戏设计说明书暨开发任务书_V1.3_优化修订版.pdf`
- 浏览器原型：响应式桌面/手机界面，第一章内容暂留空白

## 本地预览

需要 Node.js 22.13 或更高版本：

```bash
pnpm install
pnpm run dev
```

打开终端显示的本地地址。生产构建与测试分别使用 `pnpm run build`、`pnpm run test`。

## 管理入口

- 开发前置规则：`AGENTS.md`
- 完整开发规范：`docs/development/DEVELOPMENT_STANDARD.md`
- Web 与移动端规范：`docs/development/WEB_MOBILE_STANDARD.md`
- 微信小游戏迁移准备：`docs/development/WECHAT_MINIGAME_READINESS.md`
- 开发与发布检查表：`docs/development/DEVELOPMENT_CHECKLIST.md`
- 技术决策模板：`docs/development/ADR_TEMPLATE.md`
- 修改记录：`CHANGELOG.md`
- 版本号：`VERSION`
- Git与发布规则：`VERSIONING.md`

后续修改默认在本目录内进行。任何开发工作开始前必须先阅读 `AGENTS.md`；每次实质修改应形成修改日志和独立 Git 提交，发布版本应创建对应标签并推送受控远程。

> 当前仓库尚未配置 Git 远程。本地提交可以提供版本记录，但不能替代异地备份；配置远程并成功推送前，应将远程备份状态视为“未完成”。
