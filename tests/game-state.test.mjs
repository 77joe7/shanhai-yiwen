import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("game UI renders the active Black Rain story runtime", () => {
  const source = fs.readFileSync(new URL("../app/game/GameShell.tsx", import.meta.url), "utf8");
  assert.match(source, /function StoryPanel/);
  assert.match(source, /visibleChoices\(state\)/);
  assert.match(source, /advanceStory\(choice.id\)/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /player-message/);
  assert.match(source, /剧情正在展开/);
  assert.match(source, /显示全文/);
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
  assert.match(gameShell, /<CodexPanel state=\{state\} openDetail=\{openDetail\} \/>/);
  assert.match(styles, /\.archive-browser/);
});

test("the application reads only the active chapter content package", () => {
  const source = fs.readFileSync(new URL("../app/game/blackRainContent.ts", import.meta.url), "utf8");
  assert.match(source, /第一卷_黑雨\/第一章_黑雨\/内容包\/story-nodes\.json/);
  assert.match(source, /encounters\.json/);
  assert.doesNotMatch(source, /备份/);
});

test("the current Black Rain package is internally complete and offers eight origins", () => {
  const contentRoot = new URL("../剧情/第一卷_黑雨/第一章_黑雨/内容包/", import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", contentRoot), "utf8"));
  const story = JSON.parse(fs.readFileSync(new URL("story-nodes.json", contentRoot), "utf8"));
  const origins = JSON.parse(fs.readFileSync(new URL("player-origins.json", contentRoot), "utf8"));
  const shell = fs.readFileSync(new URL("../app/game/GameShell.tsx", import.meta.url), "utf8");
  assert.equal(manifest.entryNodeId, story.nodes[0].id);
  assert.equal(manifest.counts.storyNodes, story.nodes.length);
  assert.equal(manifest.counts.origins, origins.origins.length);
  assert.equal(origins.origins.length, 8);
  assert.match(shell, /const groups = \[origins, natures, flaws\]/);
});
