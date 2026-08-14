#!/usr/bin/env python3
"""Validate the Black Rain content pack and generate its readable manuscript."""

from __future__ import annotations

import json
import re
import sys
from collections import deque
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
CHAPTER_DIR = ROOT / "剧情" / "第一卷_黑雨" / "第一章_黑雨"
PACK_DIR = CHAPTER_DIR / "内容包"
MANUSCRIPT = CHAPTER_DIR / "正文" / "黑雨_完整游戏小说.md"
EXPANSION_DOCUMENT = "story-nodes-expansion.json"


def load(name: str) -> dict[str, Any]:
    with (PACK_DIR / name).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ids(records: Iterable[dict[str, Any]]) -> set[str]:
    values = [record["id"] for record in records]
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise ValueError(f"Duplicate IDs: {duplicates}")
    return set(values)


def walk(value: Any) -> Iterable[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield key, child
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def validate() -> dict[str, Any]:
    manifest = load("manifest.json")
    story_doc = load("story-nodes.json")
    expansion_doc = load(EXPANSION_DOCUMENT)
    story_doc["nodes"] = [*story_doc["nodes"], *expansion_doc["nodes"]]
    characters_doc = load("characters.json")
    origins_doc = load("player-origins.json")
    items_doc = load("items.json")
    quests_doc = load("quests.json")
    encounters_doc = load("encounters.json")
    codex_doc = load("codex.json")
    world_doc = load("world-state.json")

    nodes = story_doc["nodes"]
    characters = characters_doc["characters"]
    origins = origins_doc["origins"]
    items = items_doc["items"]
    quests = quests_doc["quests"]
    encounters = encounters_doc["encounters"]
    codex = codex_doc["entries"]

    node_ids = ids(nodes)
    npc_ids = ids(characters)
    item_ids = ids(items)
    quest_ids = ids(quests)
    encounter_ids = ids(encounters)
    codex_ids = ids(codex)
    ids(origins)

    errors: list[str] = []
    choice_ids: set[str] = set()
    # V1.4 §2.3② branchClass 选项分级上限（缺省 sediment）
    branch_limits = {"sediment": 3, "reflow": 4, "fork": 6}
    for node in nodes:
        if not node.get("blocks"):
            errors.append(f"{node['id']} has no blocks")
        bclass = node.get("branchClass", "sediment")
        limit = branch_limits.get(bclass, 3)
        if len(node.get("choices", [])) > limit:
            errors.append(f"{node['id']} branchClass={bclass} choices {len(node.get('choices', []))} exceeds limit {limit}")
        if bclass == "fork" and not all(c.get("irreversible") for c in node.get("choices", [])):
            errors.append(f"{node['id']} branchClass=fork requires all choices irreversible")
        for choice in node.get("choices", []):
            if choice["id"] in choice_ids:
                errors.append(f"Duplicate choice ID: {choice['id']}")
            choice_ids.add(choice["id"])
            if choice["next"] not in node_ids:
                errors.append(f"{choice['id']} -> missing node {choice['next']}")
        for block in node.get("blocks", []):
            speaker = block.get("speaker")
            if speaker and speaker not in npc_ids:
                errors.append(f"{node['id']} references missing speaker {speaker}")
            if block.get("type") == "dialogue":
                text = block.get("text", "").strip()
                if not (text.startswith("“") and text.endswith("”")):
                    errors.append(f"{node['id']} has dialogue without Chinese quotation marks")

    all_docs: list[Any] = [story_doc, characters_doc, origins_doc, items_doc, quests_doc, encounters_doc, codex_doc]
    singular_refs = {
        "npcId": (npc_ids, "NPC"),
        "speaker": (npc_ids, "NPC"),
        "itemId": (item_ids, "item"),
        "questId": (quest_ids, "quest"),
        "encounterId": (encounter_ids, "encounter"),
        "codexId": (codex_ids, "codex"),
        "nodeId": (node_ids, "node"),
    }
    plural_refs = {
        "npcIds": (npc_ids, "NPC"),
        "relatedNpcIds": (npc_ids, "NPC"),
        "itemIds": (item_ids, "item"),
        "relatedItemIds": (item_ids, "item"),
        "nodeIds": (node_ids, "node"),
        "relatedCodexIds": (codex_ids, "codex"),
    }
    allowed_external_prefixes = ("IT-GENERIC-",)
    for document in all_docs:
        for key, value in walk(document):
            if key in singular_refs and isinstance(value, str):
                target_ids, label = singular_refs[key]
                if value not in target_ids and not value.startswith(allowed_external_prefixes):
                    errors.append(f"Missing {label} reference {value} via {key}")
            if key in plural_refs and isinstance(value, list):
                target_ids, label = plural_refs[key]
                for reference in value:
                    if isinstance(reference, str) and reference not in target_ids and not reference.startswith(allowed_external_prefixes):
                        errors.append(f"Missing {label} reference {reference} via {key}")

    reachable: set[str] = set()
    queue: deque[str] = deque([manifest["entryNodeId"]])
    by_id = {node["id"]: node for node in nodes}
    while queue:
        current = queue.popleft()
        if current in reachable:
            continue
        reachable.add(current)
        queue.extend(choice["next"] for choice in by_id[current].get("choices", []))
    unreachable = sorted(node_ids - reachable)
    if unreachable:
        errors.append(f"Unreachable story nodes: {unreachable}")

    expected_counts = {
        "storyNodes": len(nodes),
        "characters": len(characters),
        "origins": len(origins),
        "items": len(items),
        "quests": len(quests),
        "encounters": len(encounters),
        "codexEntries": len(codex),
        "mainEndings": sum("ending_" in tag for node in nodes for tag in node.get("tags", [])),
    }
    for key, actual in expected_counts.items():
        if manifest["counts"].get(key) != actual:
            errors.append(f"Manifest count {key}={manifest['counts'].get(key)}, actual={actual}")

    if not all(key in world_doc["defaults"] for key in ("sky.suns.count", "unique.red_arrow.owner", "hanhui.fate")):
        errors.append("Missing required cross-volume world defaults")

    if errors:
        raise ValueError("\n".join(sorted(set(errors))))

    return {
        "manifest": manifest,
        "nodes": nodes,
        "characters": characters,
        "counts": expected_counts,
        "reachableNodes": len(reachable),
    }


def render_manuscript(data: dict[str, Any]) -> str:
    names = {character["id"]: character["name"] for character in data["characters"]}
    act_names = {
        "ACT1_RAIN_ARRIVES": "第一幕　雨至",
        "ACT2_THREE_SHADOWS": "第二幕　三影",
        "ACT3_RIVER_REVERSED": "第三幕　倒河",
        "ACT4_NIGHT_WITHOUT_SUN": "第四幕　无日之夜",
        "ACT5_TEN_SUN_OMEN": "第五幕　赤日之兆",
    }
    lines = [
        "# 山海异闻录：天地未定",
        "",
        "## 第一卷　黑雨",
        "",
        "> 赤水有尸，天上少了一轮太阳",
        "",
        "本稿是可阅读的全节点小说母稿。正文中的 `{{player.originScene}}` 由角色出身接口在运行时替换；带条件的余响段落在实际游戏中按世界状态显示。分支选项、数值效果和精确接口以同目录 JSON 为准。",
        "",
    ]
    act_order = {act: index for index, act in enumerate(act_names)}
    nodes = sorted(data["nodes"], key=lambda node: act_order.get(node["chapter"], len(act_order)))
    current_act = None
    for node in nodes:
        if node["chapter"] != current_act:
            current_act = node["chapter"]
            lines.extend(["---", "", f"## {act_names[current_act]}", ""])
        lines.extend([f"### {node['title']}", ""])
        for block in node["blocks"]:
            condition = json.dumps(block.get("when", []), ensure_ascii=False, separators=(",", ":"))
            if block["type"] == "conditional":
                lines.extend([f"> **条件余响 `{condition}`**", ">", f"> {block['text']}", ""])
            elif block.get("when"):
                lines.extend([f"> **条件台词 `{condition}`**", ">"])
                if block["type"] == "dialogue":
                    lines.extend([f"> **{names.get(block.get('speaker'), block.get('speaker'))}：** {block['text']}", ""])
                else:
                    lines.extend([f"> {block['text']}", ""])
            elif block["type"] == "system":
                lines.extend([f"> **系统：** {block['text']}", ""])
            elif block["type"] == "dialogue":
                lines.extend([f"**{names.get(block.get('speaker'), block.get('speaker'))}：** {block['text']}", ""])
            else:
                lines.extend([block["text"], ""])
        if node.get("choices"):
            lines.append("可选行动：")
            lines.append("")
            for choice in node["choices"]:
                suffix = "（不可逆）" if choice.get("irreversible") else ""
                lines.append(f"- `{choice['id']}`　{choice['label']}{suffix}")
            lines.append("")
    lines.extend([
        "---",
        "",
        "## 文风与版权说明",
        "",
        "文本使用魔幻现实、东方史诗、青春群像、悬疑成长等高层文学特征，重点是具体感官、历史循环、人物代价和多义神话；没有复制或仿写任何具体作家的独特措辞与可辨识段落。",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    try:
        data = validate()
        manuscript = render_manuscript(data)
        MANUSCRIPT.write_text(manuscript, encoding="utf-8", newline="\n")
        chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", manuscript))
        print(json.dumps({**data["counts"], "reachableNodes": data["reachableNodes"], "manuscriptChineseChars": chinese_chars, "output": str(MANUSCRIPT)}, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"BUILD FAILED\n{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
