import type { Metadata } from "next";
import { GameShell } from "./game/GameShell";

export const metadata: Metadata = {
  title: "山海异闻录：天地未定",
  description: "一款以知识、选择与长期后果驱动的东方神话叙事 RPG。",
};

export default function Home() {
  return <GameShell />;
}
