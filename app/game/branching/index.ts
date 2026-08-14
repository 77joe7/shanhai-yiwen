// 分支剧情系统入口：汇聚数据、引擎、备份，并在"剧情数据生成"时自动落一份副本。
// 业务代码经平台适配层访问存储（此处使用 browserPlatform.storage）。
import { browserPlatform } from "../platform";
import { branchingContent } from "./acts";
import { StoryDataBackup, type BackupStorage } from "./backup";
import { validate, type ValidationIssue } from "./engine";

export { branchingContent } from "./acts";
export * from "./types";
export * from "./engine";
export { StoryDataBackup } from "./backup";
export type { BackupStorage, BackupRecord } from "./backup";

/** 用指定存储创建备份管理器（便于注入内存实现做验证/测试）。 */
export function createBackup(store: BackupStorage): StoryDataBackup {
  return new StoryDataBackup(store);
}

/** 生成剧情数据：返回内容，并自动保存一份带时间戳的副本（防止数据丢失）。 */
export function generateStoryData(store: BackupStorage = browserPlatform.storage): {
  content: typeof branchingContent;
  backup: ReturnType<StoryDataBackup["snapshot"]>;
} {
  const backup = new StoryDataBackup(store);
  const record = backup.snapshot(branchingContent, {
    label: "generate",
    contentVersion: branchingContent.contentVersion,
  });
  return { content: branchingContent, backup: record };
}

/** 静态校验（每节点 ≤3 选项、next 可达、角色→入口完整）。 */
export function validateContent(): ValidationIssue[] {
  return validate(branchingContent);
}
