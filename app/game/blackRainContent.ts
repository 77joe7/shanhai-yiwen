import charactersDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/characters.json";
import codexDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/codex.json";
import encountersDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/encounters.json";
import itemsDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/items.json";
import manifest from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/manifest.json";
import originsDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/player-origins.json";
import questsDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/quests.json";
import storyDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/story-nodes.json";
import worldStateDocument from "../../剧情/第一卷_黑雨/第一章_黑雨/内容包/world-state.json";

export const blackRainContent = {
  manifest,
  story: storyDocument.nodes,
  characters: charactersDocument.characters,
  codex: codexDocument.entries,
  encounters: encountersDocument.encounters,
  items: itemsDocument.items,
  origins: originsDocument.origins,
  quests: questsDocument.quests,
  worldDefaults: worldStateDocument.defaults,
} as const;

export const statLabels: Record<string, string> = {
  body: "体魄",
  agility: "身法",
  spirit: "灵识",
  will: "心志",
  craft: "机巧",
  contract: "言契",
};

export const genericItems: Record<string, string> = {
  "IT-GENERIC-HUNTING-KNIFE": "受潮骨柄短刃",
  "IT-GENERIC-HEMP-ROPE": "旧麻绳",
  "IT-GENERIC-WHITE-SALT": "一撮白盐",
  "IT-GENERIC-COPPER-SCALE": "旧铜秤片",
  "IT-GENERIC-BONE-AWL": "骨锥",
  "IT-GENERIC-KNOT-CORD": "祭祀结绳",
  "IT-GENERIC-SEAL-FRAGMENT": "残印",
  "IT-GENERIC-BLANK-TOKEN": "空白名牌",
};

export const originById = new Map(blackRainContent.origins.map((origin) => [origin.id, origin]));
export const itemById = new Map(blackRainContent.items.map((item) => [item.id, item]));
export const characterById = new Map(blackRainContent.characters.map((character) => [character.id, character]));
