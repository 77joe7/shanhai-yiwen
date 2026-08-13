"""Apply Chinese quotation marks to every runtime dialogue block in a story file."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STORY_PATHS = [
    ROOT / "剧情" / "第一卷_黑雨" / "第一章_黑雨" / "内容包" / "story-nodes.json",
    ROOT / "剧情" / "第一卷_黑雨" / "第一章_黑雨" / "内容包" / "story-nodes-expansion.json",
]


def quote(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("“") and stripped.endswith("”"):
        return text
    return f"“{stripped}”"


def main() -> None:
    updated = 0
    for path in STORY_PATHS:
        document = json.loads(path.read_text(encoding="utf-8"))
        for node in document["nodes"]:
            for block in node.get("blocks", []):
                if block.get("type") == "dialogue":
                    before = block["text"]
                    after = quote(before)
                    if before != after:
                        block["text"] = after
                        updated += 1
        path.write_text(
            json.dumps(document, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    print(f"Quoted {updated} dialogue blocks across {len(STORY_PATHS)} story documents")


if __name__ == "__main__":
    main()
