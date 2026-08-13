import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("game UI keeps chapter one explicitly un-authored", () => {
  const source = fs.readFileSync(new URL("../app/game/GameShell.tsx", import.meta.url), "utf8");
  assert.match(source, /第一卷《黑雨》的剧情节点/);
  assert.match(source, /需要：第一卷内容包/);
});

test("platform boundary is ready for a WeChat adapter", () => {
  const source = fs.readFileSync(new URL("../app/game/platform.ts", import.meta.url), "utf8");
  assert.match(source, /interface PlatformAdapter/);
  assert.match(source, /storage:/);
  assert.match(source, /lifecycle:/);
});

test("browser storage is isolated behind the platform adapter", () => {
  const source = fs.readFileSync(new URL("../app/game/storage.ts", import.meta.url), "utf8");
  assert.match(source, /browserPlatform\.storage/);
  assert.doesNotMatch(source, /localStorage/);
});

test("archive panels use category lists and reusable detail cards", () => {
  const gameShell = fs.readFileSync(new URL("../app/game/GameShell.tsx", import.meta.url), "utf8");
  const styles = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(gameShell, /function ArchiveBrowser/);
  assert.match(gameShell, /function DetailCardModal/);
  assert.match(gameShell, /<CodexPanel openDetail=\{openDetail\} \/>/);
  assert.match(styles, /\.archive-browser/);
});
