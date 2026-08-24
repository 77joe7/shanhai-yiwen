"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createInitialState, flaws, hydrateBlackRainState, natures, origins } from "./gameData";
import { blackRainContent, entityNames, genericItems, itemById } from "./blackRainContent";
import { choiceIntent, chooseStory, currentStoryNode, displayCharacterName, enterCurrentNode, interpolate, visibleBlocks, visibleChoices } from "./storyRuntime";
import { choiceTrace, settledEchoes } from "./storyEchoes";
import { buildTokenStyle, FONT_TOKENS } from "../design-system/tokens";
import { clearCache, exportSave, getActiveId, importSave, listCharacters, loadCharacter, loadCharacterSlot, loadGame, readSettings, saveCharacter, saveCharacterSlot, setActiveId, writeSettings } from "./storage";
import { browserPlatform } from "./platform";
import type { CharacterDraft, CharacterSummary, GameState, OverlayId, PanelId, Settings } from "./types";

const defaultSettings: Settings = { fontScale: 1, lineHeight: 1.85, highContrast: false, reducedMotion: false, textReveal: true, textSpeed: 1, simplifiedTexture: false, ambientVolume: 35, autoSave: true, haptics: true };
const defaultPlayerDraft: CharacterDraft = { name: "无名之人", origin: "hunter", nature: "cautious", flaw: "water" };
const sealFont = FONT_TOKENS.find((token) => token.id === "font-seal")?.value ?? "serif";

type DetailCard = {
  eyebrow: string;
  title: string;
  text: string;
  source: string;
  facts?: { label: string; value: string | number }[];
  sections?: { label: string; text: string; locked?: boolean }[];
  action?: { label: string; run: () => void };
};

const navItems: { id: PanelId; label: string; icon: string }[] = [
  { id: "codex", label: "志异", icon: "志" },
  { id: "fate", label: "命录", icon: "命" },
  { id: "story", label: "行游", icon: "游" },
  { id: "inventory", label: "行囊", icon: "囊" },
  { id: "map", label: "舆图", icon: "图" },
];

function originName(id: string) { return origins.find((x) => x.id === id)?.name ?? id; }
function natureName(id: string) { return natures.find((x) => x.id === id)?.name ?? id; }
function flawName(id: string) { return flaws.find((x) => x.id === id)?.name ?? id; }

/** 转义正则特殊字符，避免实体名中的符号破坏匹配。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 高亮类型 → 样式类名 与 目标功能页。 */
const hlClass: Record<string, string> = { person: "hl-person", item: "hl-item", place: "hl-place", clue: "hl-clue", anomaly: "hl-anomaly" };
const hlPanel: Record<string, PanelId> = { person: "fate", place: "codex", anomaly: "codex", item: "inventory", clue: "inventory" };

/**
 * 将剧情文本中的人物 / 道具·材料 / 地点 / 线索 / 异象包成带颜色类名、可点击跳转的 span 节点。
 * 名称按长度降序排列以避免短名在长名内被误匹配；无命中或空文本时原样返回。
 */
function highlightText(text: string, onNavigate?: (panel: PanelId) => void): React.ReactNode {
  if (!text) return text;
  const uniqueNames = [...new Set([...entityNames.person, ...entityNames.item, ...entityNames.place, ...entityNames.clue, ...entityNames.anomaly])]
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length);
  if (uniqueNames.length === 0) return text;

  const regex = new RegExp(`(${uniqueNames.map(escapeRegExp).join("|")})`);
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (index % 2 === 0) return part;
    const type = entityNames.person.has(part) ? "person" : entityNames.item.has(part) ? "item" : entityNames.place.has(part) ? "place" : entityNames.clue.has(part) ? "clue" : entityNames.anomaly.has(part) ? "anomaly" : null;
    if (!type) return part;
    const target = onNavigate ? hlPanel[type] : undefined;
    return <span key={index} className={hlClass[type]} onClick={target ? () => onNavigate?.(target) : undefined}>{part}</span>;
  });
}

/**
 * 逐字展开时的双缓冲渲染：隐藏的完整文本撑起稳定高度，可见文本逐字覆盖显示，
 * 避免逐字截断导致段落高度随换行变化、下方内容跳动重排。
 */
function typewriterText(visible: React.ReactNode, full: React.ReactNode, typing: boolean): React.ReactNode {
  if (!typing) return full;
  return (
    <span className="tw-stack">
      <span className="tw-visible">{visible}</span>
      <span className="tw-ghost" aria-hidden="true">{full}</span>
    </span>
  );
}

export function GameShell() {
  const [state, setState] = useState<GameState | null>(null);
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId>("story");
  const [overlay, setOverlay] = useState<OverlayId>(null);
  const [detail, setDetail] = useState<DetailCard | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("第一卷《黑雨》内容包已载入");
  const importRef = useRef<HTMLInputElement>(null);
  const panelScrollPositions = useRef<Partial<Record<PanelId, number>>>({});
  const undoStack = useRef<GameState[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSettings(readSettings(defaultSettings));
        const chars = listCharacters();
        if (chars.length === 0) {
          const legacy = loadGame();
          if (legacy?.payload?.created) {
            const id = crypto.randomUUID?.() ?? `char-${Date.now()}`;
            saveCharacter(id, enterCurrentNode(hydrateBlackRainState(legacy.payload)).state);
            setActiveId(id);
            setActiveIdState(id);
            setCharacters(listCharacters());
            setNotice("已迁移旧版存档为角色进度");
            return;
          }
        }
        setCharacters(chars);
        setActiveIdState(getActiveId());
      } catch {
        setNotice("检测到无效存档，已安全载入初始状态");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--reader-scale", String(settings.fontScale));
    root.style.setProperty("--reader-leading", String(settings.lineHeight));
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.motion = settings.reducedMotion ? "reduced" : "full";
    root.dataset.texture = settings.simplifiedTexture ? "simple" : "full";
    writeSettings(settings);
  }, [settings]);

  function selectPanel(next: PanelId) {
    if (next === panel) return;
    panelScrollPositions.current[panel] = window.scrollY;
    setPanel(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: panelScrollPositions.current[next] ?? 0, behavior: "auto" }));
  }

  function refreshCharacters() {
    setCharacters(listCharacters());
  }

  function mutate(label: string, recipe: (draft: GameState) => GameState) {
    if (!state) return;
    const next = recipe(state);
    const logged = { ...next, revision: next.revision + 1, log: [label, ...next.log].slice(0, 20) };
    setState(logged);
    if (settings.autoSave && activeId) saveCharacter(activeId, logged);
    refreshCharacters();
    setNotice(label);
  }

  function advanceStory(choiceId: string) {
    if (!state) return;
    undoStack.current.push(state);
    if (undoStack.current.length > 2) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
    const result = chooseStory(hydrateBlackRainState(state), choiceId);
    const node = currentStoryNode(result.state);
    const nextNotice = result.notes.length ? result.notes.join(" · ") : `抵达：${node.title}`;
    const logged = { ...result.state, revision: result.state.revision + 1, log: [nextNotice, ...result.state.log].slice(0, 20) };
    setState(logged);
    if (settings.autoSave && activeId) saveCharacter(activeId, logged);
    refreshCharacters();
    if (settings.haptics) void browserPlatform.feedback.vibrate("light");
    setNotice(nextNotice);
  }

  function undoStory() {
    if (!state || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    setUndoCount(undoStack.current.length);
    setState(prev);
    if (settings.autoSave && activeId) saveCharacter(activeId, prev);
    refreshCharacters();
    setNotice("已撤回上一步，回到上一选择点");
  }

  function createNewCharacter(draft: CharacterDraft) {
    const id = crypto.randomUUID?.() ?? `char-${Date.now()}`;
    const entered = enterCurrentNode(createInitialState(draft));
    const st = entered.state;
    saveCharacter(id, st);
    setActiveId(id);
    setActiveIdState(id);
    refreshCharacters();
    setState(st);
    if (entered.notes.length) setNotice(entered.notes.join(" · "));
    else setNotice(`${draft.name}已在天地间留下名字`);
    if (settings.haptics) void browserPlatform.feedback.vibrate("medium");
  }

  function enterCharacter(id: string) {
    const st = loadCharacter(id);
    if (st) {
      const entered = enterCurrentNode(hydrateBlackRainState(st));
      setState(entered.state);
      setActiveId(id);
      setActiveIdState(id);
      setPanel("story");
      panelScrollPositions.current = {};
      if (entered.notes.length) setNotice(entered.notes.join(" · "));
    } else {
      setNotice("该角色存档不存在或已损坏。");
    }
  }

  function backToHome() {
    setState(null);
  }

  function exitToMain() {
    setOverlay(null);
    backToHome();
    setNotice("已回到主页");
  }

  function downloadSave() {
    if (!state) {
      setNotice("尚未进入角色，无法导出");
      return;
    }
    browserPlatform.files.exportText(`天地未定_${state.player.name}_${new Date().toISOString().slice(0, 10)}.json`, exportSave(state));
    setNotice("存档已导出到本机");
  }

  async function receiveImport(file?: File) {
    if (!file) return;
    try {
      const next = hydrateBlackRainState(importSave(await file.text()));
      const id = activeId ?? crypto.randomUUID?.() ?? `char-${Date.now()}`;
      saveCharacter(id, next);
      setActiveId(id);
      setActiveIdState(id);
      refreshCharacters();
      setState(next);
      setNotice("存档导入成功");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "存档导入失败");
    }
  }

  function submitCommand() {
    const intent = command.trim();
    if (!intent) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: settings.reducedMotion ? "auto" : "smooth" });
      setNotice("已回到当前剧情与可用选择");
      return;
    }
    setCommand("");
    setNotice(`意图“${intent}”已记下；请以剧情选择推进故事。`);
  }

  return (
    <main className="game-shell mythic-shell" data-panel={panel} style={{ ...buildTokenStyle({ highContrast: settings.highContrast }), "--shj-f-seal": sealFont } as CSSProperties}>
      <header className="topbar">
        <button className="menu-trigger" aria-label="打开角色档案" onClick={() => setOverlay("character")} disabled={!state}>☷</button>
        <button className="brand" aria-label="返回卷册" onClick={() => state && selectPanel("story")}>
          <span className="brand-seal">异</span><span><strong>山海异闻录</strong><small>天地未定</small></span>
        </button>
        <div className="chapter-marker"><span>卷一</span><strong>黑雨初落</strong><em>内容版本 {blackRainContent.manifest.contentVersion}</em></div>
        <div className="top-actions">
          <button onClick={() => setOverlay("settings")} aria-label="设置">设</button>
        </div>
      </header>

      {state ? (
        <>
          <section className="mobile-status-strip" aria-label="角色当前状态">
            <button type="button" className="status-identity" onClick={() => setOverlay("character")} aria-label="查看角色档案">
              <span className="status-avatar">{state.player.name.slice(0, 1)}</span>
              <span className="status-name">{state.player.name}</span>
            </button>
            <div className="status-meters">
              <Meter label="生息" value={state.resources.life} max={12} tone="red" />
              <Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" />
              <Meter label="定力" value={state.resources.resolve} max={10} tone="blue" />
            </div>
            <StatChips stats={state.stats} />
          </section>

          <section className="desktop-grid">
            <CharacterRail state={state} onCreate={() => setOverlay("create")} onOpenDetails={() => setOverlay("character")} />
            <section className="reader" aria-live="polite">
              {panel === "story" && <div className="reader-heading">
                <span className="eyebrow">第一卷《黑雨》 · {state.currentNodeId}</span>
                <h1>{!state.created ? "立身入世" : currentStoryNode(state).title}{state.created && <StatusBadge state={state} />}</h1>
                <div className="brush-rule"><i /></div>
                {state.created && <button type="button" className="reader-exit" onClick={exitToMain} aria-label="退出到主页">退出</button>}
              </div>}
              {!state.created ? <StartPanel openCreate={() => setOverlay("create")} openSettings={() => setOverlay("settings")} openSaves={() => setOverlay("saves")} /> : <Panel key={activeId} panel={panel} state={state} mutate={mutate} advanceStory={advanceStory} onUndo={undoStory} canUndo={undoCount > 0} typewriter={settings.textReveal} textSpeed={settings.textSpeed} reducedMotion={settings.reducedMotion} selectPanel={selectPanel} openOverlay={setOverlay} openDetail={setDetail} />}
            </section>
            <SideRail panel={panel} setPanel={selectPanel} state={state} />
          </section>

          {state.created && panel === "story" && <StorySafeArea state={state} notice={notice} />}

          <nav className="mobile-nav" aria-label="主要功能">
            {navItems.map((item) => <button key={item.id} className={`${panel === item.id ? "active" : ""}${item.id === "story" ? " is-main" : ""}`} onClick={() => selectPanel(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}
          </nav>
        </>
      ) : (
        <HomePage
          characters={characters}
          activeId={activeId}
          onEnter={enterCharacter}
          onCreate={() => setOverlay("create")}
        />
      )}

      {overlay && <Modal type={overlay} close={() => setOverlay(null)} switchOverlay={setOverlay} state={state} activeId={activeId} setState={setState} settings={settings} setSettings={setSettings} downloadSave={downloadSave} importRef={importRef} setNotice={setNotice} exitToMain={exitToMain} createNewCharacter={createNewCharacter} />}
      {detail && <DetailCardModal card={detail} close={() => setDetail(null)} />}
      <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => receiveImport(e.target.files?.[0])} />
    </main>
  );
}

function CharacterRail({ state, onCreate, onOpenDetails }: { state: GameState; onCreate: () => void; onOpenDetails: () => void }) {
  return <aside className="character-rail">
    <button className="character-profile-trigger" onClick={onOpenDetails} aria-label="打开角色详情">
      <div className="portrait"><div className="portrait-mist" /><span>{state.player.name.slice(0, 1)}</span></div>
      <div className="identity"><small>{state.created ? originName(state.player.origin) : "尚未入世"}</small><h2>{state.player.name}</h2><p>年十八 · {natureName(state.player.nature)} · {state.location}</p></div>
    </button>
    {!state.created && <button className="ink-button full" onClick={onCreate}>立身入世</button>}
    <div className="resource-list">
      <Meter label="生息" value={state.resources.life} max={12} tone="red" />
      <Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" />
      <Meter label="定力" value={state.resources.resolve} max={10} tone="blue" />
    </div>
    <StatChips stats={state.stats} />
    <div className="location-card"><span>当前所在</span><strong>{state.location}</strong><small>第{state.day}日 · {state.period}</small></div>
    <div className="traits"><span>缺陷</span><b>{flawName(state.player.flaw)}</b><small>经历相关危机后，可形成新的应对之道。</small></div>
    <div className="danger-status" aria-label="当前危险状态"><span>状态</span><b>{Object.keys(state.flags ?? {}).some((key) => key.startsWith("status.")) ? "异兆缠身" : "暂无重伤"}</b></div>
  </aside>;
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return <div className="meter"><div><span>{label}</span><b>{value}<small>/{max}</small></b></div><i><em className={tone} style={{ width: `${Math.min(100, value / max * 100)}%` }} /></i></div>;
}

const statOrder = ["体魄", "身法", "灵识", "心志", "机巧", "言契"] as const;
const defaultStats: GameState["stats"] = { 体魄: 3, 身法: 3, 灵识: 3, 心志: 3, 机巧: 2, 言契: 2 };

function StatChips({ stats }: { stats?: GameState["stats"] }) {
  const values = stats ?? defaultStats;
  return <div className="stat-chips" aria-label="六维属性">{statOrder.map((key) => <span className="stat-chip" key={key}><b>{key}</b><i>{values[key]}</i></span>)}</div>;
}

function SideRail({ panel, setPanel, state }: { panel: PanelId; setPanel: (p: PanelId) => void; state: GameState }) {
  return <aside className="side-rail">
    <nav>{navItems.map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}><span>{item.icon}</span>{item.label}<small>{item.id === "codex" ? state.codexUnlocked.length : ""}</small></button>)}</nav>
    <div className="whisper"><span>天地异兆</span><strong>一日</strong><p>天上仍只有一轮太阳。</p></div>
    <div className="reserved"><span>正式版预留</span><p>账号 · 云存档 · 平台能力</p><small>Demo 期间不启用、不占用叙事流程</small></div>
  </aside>;
}

function Panel({ panel, state, mutate, advanceStory, onUndo, canUndo, typewriter, textSpeed, reducedMotion, selectPanel, openOverlay, openDetail }: { panel: PanelId; state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; advanceStory: (choiceId: string) => void; onUndo: () => void; canUndo: boolean; typewriter: boolean; textSpeed: number; reducedMotion: boolean; selectPanel: (panel: PanelId) => void; openOverlay: (o: OverlayId) => void; openDetail: (card: DetailCard) => void }) {
  if (panel === "story") return <StoryPanel state={state} advanceStory={advanceStory} onUndo={onUndo} canUndo={canUndo} onNavigate={selectPanel} typewriter={typewriter} textSpeed={textSpeed} reducedMotion={reducedMotion} openCreate={() => openOverlay("create")} openCharacter={() => openOverlay("character")} />;
  if (panel === "map") return <MapPanel state={state} />;
  if (panel === "codex") return <CodexPanel state={state} openDetail={openDetail} />;
  if (panel === "inventory") return <InventoryPanel state={state} openDetail={openDetail} />;
  return <FatePanel state={state} mutate={mutate} openDetail={openDetail} />;
}

function HomePage({ characters, activeId, onEnter, onCreate }: { characters: CharacterSummary[]; activeId: string | null; onEnter: (id: string) => void; onCreate: () => void }) {
  const resumable = characters.find((character) => character.id === activeId) ?? characters[0];
  const primaryLabel = resumable ? `续写：${resumable.name}` : "新建行者";

  return <>
    <section className="start-page" aria-label="山海异闻录游戏主页">
      <div className="start-page-inner">
        <div className="start-page-mark"><i /></div>
        <h1 className="start-page-title">山海異聞錄</h1>
        <p className="start-page-subtitle">天地未定 · THE UNWRITTEN SHANHAI</p>
        <p className="start-page-tagline">赤水有尸，天上少了一轮太阳。<br />杳湾的雨落下以前，每个人都还忙着占满一生的小事。</p>
        <div className="start-page-actions" aria-label="进入游戏">
          <button type="button" className="start-page-enter" onClick={() => resumable ? onEnter(resumable.id) : onCreate()}>{primaryLabel}</button>
          {resumable && <button type="button" className="start-page-secondary" onClick={onCreate}>新建行者</button>}
        </div>
        <p className="start-page-foot">第一卷《黑雨》内容包已载入 · 版本 {blackRainContent.manifest.contentVersion}</p>
      </div>
    </section>
  </>;
}

function StatusBadge({ state }: { state: GameState }) {
  const hasStatus = Object.keys(state.flags ?? {}).some((key) => key.startsWith("status."));
  const hasQuest = (state.activeQuests?.length ?? 0) > 0;
  if (hasStatus) return <span className="status-badge status-badge-danger">异兆缠身</span>;
  if (hasQuest) return <span className="status-badge status-badge-quest">任务中</span>;
  return <span className="status-badge status-badge-safe">暂无重伤</span>;
}

function StartPanel({ openCreate, openSettings, openSaves }: { openCreate: () => void; openSettings: () => void; openSaves: () => void }) {
  return <section className="start-panel" aria-label="开始进入界面">
    <div className="start-hero">
      <span className="eyebrow">新局 · 黑雨将落</span>
      <h2>先立下一个普通人的名字</h2>
      <p>你不是预设的天命之子——先定出身、天性与缺陷，再入这未定的天地。</p>
      <div className="start-actions">
        <button className="ink-button" onClick={openCreate}>设置角色信息</button>
        <button onClick={openSettings}>游戏设置</button>
        <button onClick={openSaves}>导入存档</button>
      </div>
    </div>
    <div className="start-rule-grid" aria-label="核心体验"><span>观察 · 求证 · 准备 · 后果</span></div>
  </section>;
}

/** 拆分系统提示的标题与正文：以首个中文/半角冒号分隔，缺省标题「异兆记录」。 */
function systemTitle(text: string): { title: string; body: string } {
  const m = text.match(/^([^：:]{1,12})[：:]\s*/);
  if (m) return { title: m[1], body: text.slice(m[0].length) };
  return { title: "异兆记录", body: text };
}

function StoryPanel({ state, advanceStory, onUndo, canUndo, onNavigate, typewriter, textSpeed, reducedMotion, openCreate, openCharacter }: { state: GameState; advanceStory: (choiceId: string) => void; onUndo: () => void; canUndo: boolean; onNavigate: (panel: PanelId) => void; typewriter: boolean; textSpeed: number; reducedMotion: boolean; openCreate: () => void; openCharacter: () => void }) {
  const node = currentStoryNode(state);
  const blocks = visibleBlocks(state);
  const choices = visibleChoices(state).map((choice) => state.created ? choice : { ...choice, enabled: false, disabledHint: "请先建立角色，再以出身进入故事。" });
  const latestNodeRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const previousNodeId = useRef<string>("");
  const fallbackHistory = blocks.map((block, index) => ({ id: `${node.id}:fallback:${index}`, nodeId: node.id, kind: block.type === "dialogue" ? "npc-dialogue" as const : block.type === "system" ? "system" as const : "narration" as const, text: interpolate(state, block.text), speaker: block.speaker }));
  const savedHistory = state.storyHistory ?? [];
  const history = savedHistory.some((entry) => entry.nodeId === node.id) ? savedHistory : [...savedHistory, ...fallbackHistory];
  const latestStart = history.findIndex((entry) => entry.nodeId === node.id);
  const currentEntries = history.slice(latestStart);
  const [reveal, setReveal] = useState(() => ({ nodeId: node.id, entryIndex: 0, characters: 0 }));
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const skipNextScroll = useRef(false);
  const revealNodeMatches = reveal.nodeId === node.id;
  const revealIndex = revealNodeMatches ? reveal.entryIndex : 0;
  const revealCharacters = revealNodeMatches ? reveal.characters : 0;
  const shouldType = typewriter && !reducedMotion;
  const displayIndex = shouldType ? revealIndex : currentEntries.length;
  const displayCharacters = shouldType ? revealCharacters : 0;
  const currentEntry = currentEntries[revealIndex];
  const isRevealing = shouldType && revealIndex < currentEntries.length;
  const isTypingCurrentEntry = isRevealing && currentEntry ? revealCharacters < currentEntry.text.length : false;
  const isWaitingForClick = isRevealing && currentEntry ? revealCharacters >= currentEntry.text.length : false;

  function scrollToFraction(target: HTMLElement | null, fraction: number, behavior: "auto" | "smooth") {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - window.innerHeight * fraction), behavior });
  }

  // 双击取消特效：一次性显示完所有剩余内容，并保持当前阅读位置（跳过随后触发的自动滚动）。
  function revealAll() {
    if (!isRevealing) return;
    skipNextScroll.current = true;
    setReveal({ nodeId: node.id, entryIndex: currentEntries.length, characters: 0 });
  }

  function advanceStoryText(event?: React.MouseEvent | React.KeyboardEvent) {
    if (!shouldType) return;
    if (event && "key" in event) {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
    }
    const entry = currentEntries[revealIndex];
    if (!entry) return;
    if (revealCharacters < entry.text.length) {
      setReveal((current) => ({ ...current, characters: entry.text.length }));
    } else if (revealIndex < currentEntries.length - 1) {
      setReveal((current) => ({ ...current, entryIndex: current.entryIndex + 1, characters: 0 }));
    } else {
      setReveal((current) => ({ ...current, entryIndex: currentEntries.length, characters: 0 }));
    }
  }

  function handleTranscriptClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.detail > 1) return; // 双击的第二下点击由 onDoubleClick 统一处理为显示全文
    const target = event.target as HTMLElement;
    if (target.closest("button, a, .hl-person, .hl-item, .hl-place, .hl-clue, .hl-anomaly")) return;
    advanceStoryText(event);
  }

  useEffect(() => {
    if (previousNodeId.current === node.id) return;
    previousNodeId.current = node.id;
    setReveal({ nodeId: node.id, entryIndex: 0, characters: 0 });
    window.requestAnimationFrame(() => latestNodeRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" }));
  }, [node.id, reducedMotion]);

  useEffect(() => {
    const target = transcriptEndRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setAwayFromLatest(!entry.isIntersecting), { threshold: 0.2 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [node.id]);

  useEffect(() => {
    if (!isTypingCurrentEntry) return;
    const entry = currentEntries[revealIndex];
    const nextCharacter = revealCharacters + 1;
    const completed = nextCharacter > entry.text.length;
    const finalCharacter = entry.text.at(-1) ?? "";
    const speed = Number.isFinite(textSpeed) ? Math.max(0.5, Math.min(3, textSpeed)) : 1;
    const baseDelay = completed || /[。！？；：]/.test(entry.text[revealCharacters] ?? finalCharacter) ? 280 : 30;
    const delay = Math.max(8, Math.round(baseDelay / speed));
    const timer = window.setTimeout(() => setReveal((current) => completed
      ? { ...current, characters: current.characters }
      : { ...current, characters: nextCharacter }), delay);
    return () => window.clearTimeout(timer);
  }, [currentEntries, isTypingCurrentEntry, revealCharacters, revealIndex, textSpeed]);

  // 逐字展开 / 换节点时自动跟随：有特效时把最新内容底部定位到视口约 2/3 高度处；取消特效（无逐字）时改为把最新内容顶部定位到上部约 1/3 处，避免需手动向上翻阅。玩家主动上翻时不打断。
  // 逐字过程用瞬时滚动（behavior:"auto"），避免每 30ms 一次 smooth 动画叠加造成滚动幅度小、顿挫。
  useEffect(() => {
    if (awayFromLatest) return;
    if (skipNextScroll.current) { skipNextScroll.current = false; return; }
    const target = shouldType ? transcriptEndRef.current : latestNodeRef.current;
    const fraction = shouldType ? 2 / 3 : 1 / 3;
    window.requestAnimationFrame(() => scrollToFraction(target, fraction, "auto"));
  }, [revealCharacters, revealIndex, node.id, awayFromLatest, shouldType]);

  const showChoices = !isRevealing;

  return <article className="story-panel story-runtime">
    <header className="story-kicker"><span>{chapterLabel(node.chapter)}</span><small>{node.presentation === "prologue" ? "卷首" : "剧情节点"}</small></header>
    {!state.created && <div className="story-create"><b>以你的出身进入杳湾</b><button className="ink-button" onClick={openCreate}>建立角色</button></div>}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- 剧情区采用点击/空格推进式文本揭示，键盘支持已由 onKeyDown 提供 */}
    <div className="story-blocks story-transcript" onDoubleClick={revealAll} onClick={handleTranscriptClick} onKeyDown={advanceStoryText} role="region" aria-label="剧情文本，点击或按空格继续" tabIndex={0}>
      {history.map((entry, index) => {
        const currentIndex = index - latestStart;
        const isCurrentEntry = currentIndex === displayIndex;
        if (currentIndex > displayIndex) return null;
        const text = isCurrentEntry ? entry.text.slice(0, displayCharacters) : entry.text;
        return <div className="story-message-wrap" key={entry.id}>
          {index === latestStart && <div className="story-node-marker" ref={latestNodeRef}><span>最新剧情</span></div>}
          {entry.kind === "npc-dialogue" ? (
            <div className="story-message-row npc-row">
              <div className="story-avatar" aria-hidden="true">{displayCharacterName(entry.speaker ?? "").slice(0, 1)}</div>
              <blockquote className={`story-message npc-dialogue ${isCurrentEntry ? "is-typing" : ""}`}>
                <cite>{displayCharacterName(entry.speaker ?? "")}</cite>
                <p>{typewriterText(highlightText(text, onNavigate), highlightText(entry.text, onNavigate), isCurrentEntry && isTypingCurrentEntry)}</p>
              </blockquote>
            </div>
          ) : entry.kind === "system" ? (
            (() => { const st = systemTitle(entry.text); const bodyVisible = isCurrentEntry ? st.body.slice(0, Math.max(0, displayCharacters - (entry.text.length - st.body.length))) : st.body; return <aside className={`story-message story-system ${isCurrentEntry ? "is-typing" : ""}`}><b className="story-system-title"><i className="system-icon" aria-hidden="true">兆</i>{st.title}</b><p className="story-system-body">{typewriterText(highlightText(bodyVisible, onNavigate), highlightText(st.body, onNavigate), isCurrentEntry && isTypingCurrentEntry)}</p></aside>; })()
          ) : entry.kind === "narration" ? (
            <p className={`story-message narration ${isCurrentEntry ? "is-typing" : ""}`}>{typewriterText(highlightText(text, onNavigate), highlightText(entry.text, onNavigate), isCurrentEntry && isTypingCurrentEntry)}</p>
          ) : (
            <article className={`story-message player-message ${entry.kind} ${isCurrentEntry ? "is-typing" : ""}`}><small>你 · {entry.kind === "player-speech" ? "说话" : "行动"}</small><p>{typewriterText(highlightText(text, onNavigate), highlightText(entry.text, onNavigate), isCurrentEntry && isTypingCurrentEntry)}</p></article>
          )}
        </div>;
      })}
      {isWaitingForClick && <div className="story-continue-hint" aria-hidden="true"><span className="continue-dot" /><span>点击屏幕继续</span></div>}
    </div>
    {canUndo && showChoices && <div className="story-undo"><button onClick={onUndo} aria-label="撤回上一步选择">↩ 撤回上一步</button></div>}
    {showChoices ? (
      <>
        {choices.length > 0 && <div className="story-choice-banner" aria-hidden="true"><span>你的选择将改变命运的走向</span></div>}
        <div className="choices story-choices">
          {choices.map((choice, index) => {
            const intent = choiceIntent(choice.label);
            const available = choice.enabled && !isRevealing;
            const variant = choice.sourceTag ? "special-choice" : "";
            const typeLabel = choice.sourceTag ? `来源：${choice.sourceTag}` : intent === "speech" ? "说话" : "行动";
            const traces = choiceTrace((choice as { effects?: { type?: string; key?: unknown }[] }).effects);
            return (
              <button key={choice.id} className={`${intent}-choice ${variant} ${!available ? "locked" : ""}`} style={{ "--i": index } as CSSProperties} disabled={!available} onClick={() => advanceStory(choice.id)}>
                <span className="choice-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="choice-body">
                  <em className="choice-type">{available ? typeLabel : choice.disabledHint ?? "条件尚未满足"}</em>
                  <b className="choice-label">{choice.label}</b>
                  {available && traces.length > 0 && <small className="choice-trace">将留下：{traces.join(" · ")}</small>}
                </span>
                <i>{available ? "→" : "—"}</i>
              </button>
            );
          })}
        </div>
      </>
    ) : (
      <div className="story-choices-pending" aria-hidden="true">……</div>
    )}
    {state.created && <div className="story-transcript-controls"><button type="button" onClick={openCharacter} aria-label="查看人物">查看人物</button><button type="button" onClick={() => latestNodeRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" })} aria-label="回到最新剧情">回到最新</button></div>}
    <div className="story-buffer" aria-hidden="true" />
    <div ref={transcriptEndRef} />
  </article>;
}

// 剧情节点 presentation → 中文场景标签，用作信息栏「所在」的子地点补充（大地点·场景）。
const chapterLabels: Record<string, string> = {
  ACT1_RAIN_ARRIVES: "第一幕 · 雨至",
  ACT2_THREE_SHADOWS: "第二幕 · 三影",
  ACT3_RIVER_REVERSED: "第三幕 · 倒河",
  ACT4_NIGHT_WITHOUT_SUN: "第四幕 · 无日之夜",
  ACT5_TEN_SUN_OMEN: "第五幕 · 赤日之兆",
};
function chapterLabel(chapter: string): string {
  return chapterLabels[chapter] ?? chapter.replace("ACT", "第").replace(/_/g, " ");
}

const sceneLabels: Record<string, string> = {
  prologue: "卷首",
  dungeon: "副本", dungeon_entry: "副本入口", dungeon_hub: "副本腹地", dungeon_room: "副本深处", dungeon_climax: "副本至暗处", dungeon_resolution: "副本出口",
  micro_dungeon_entry: "秘境入口",
  grove_descent: "桑林", grove_resolution: "桑林",
  riverbed_survey: "退水河床",
  saltmarsh_route: "盐沼路",
  night_talk: "雨棚", night_hub: "雨棚", night_resolution: "雨棚",
  seven_days: "黑雨七日", seven_days_hub: "黑雨七日",
  return_table: "归还桌", return_table_hub: "归还桌", return_receipt: "回执处", return_receipts_hub: "回执处",
  letter_scene: "信栈", letter_hub: "信栈",
  council: "议事", children_council: "议事", final_council: "议事", civic_compact: "公约",
  ending: "终局", ending_aftermath: "终局之后", ending_echo: "终局余响", ending_negotiation: "终局", ending_resolution: "终局", ending_revisit: "终局回访", ending_aftermath_hub: "终局之后",
  epilogue_scene: "尾声",
  character_hub: "故人", character_scene: "故人", character_entrance: "故人", character_investigation: "查证", character_resolution: "故人",
  archive_hub: "卷宗", archive_scene: "卷宗",
  material_hub: "材料", material_scene: "材料", material_experiment: "材料试炼", material_test: "材料试炼", material_resolution: "材料",
  memory_hub: "记忆", memory_scene: "记忆",
  exploration: "野外", tracking: "追踪",
  investigation: "查证", investigation_dialogue: "查证",
  rescue: "救援", rescue_scene: "救援", rescue_consequence: "救援",
  hazard: "险地", micro_crisis: "险情", micro_crisis_hub: "险情", micro_encounter: "遭遇",
  faction_hub: "势力", faction_scene: "势力", faction_investigation: "势力查证", faction_resolution: "势力",
  community_hearing: "公听", community_repair: "修葺", community_repair_hub: "修葺", community_mission: "公事", community_choice: "公议",
  public_hearing: "公听", public_warning: "示警",
  confession: "告解",
  testimony_scene: "证词",
  evidence_scene: "取证", evidence_craft: "取证",
  craft_scene: "手艺",
  preparation: "准备", preparation_entry: "准备", preparation_resolution: "准备", preparedness: "准备", preparedness_hub: "准备",
  ordinary_affair: "俗事", ordinary_affairs_hub: "俗事", ordinary_affairs_resolution: "俗事",
  origin_hub: "出身", origin_scene: "出身",
  relationship_revisit: "旧识", relationship_revisit_hub: "旧识",
  revisit_hub: "回访", revisit_resolution: "回访",
  first_lesson: "初课", first_lesson_hub: "初课", first_lesson_resolution: "初课",
  rule_reveal: "规则",
  resource_scene: "筹谋", resource_conflict: "争夺",
  lore_scene: "掌故", lore_dialogue: "掌故",
  monster_dialogue: "异兽", monster_resolution: "异兽",
  mystery_dialogue: "疑团",
  revelation: "揭示", vision: "幻视", ritual: "仪式", puzzle: "谜题", climax: "高潮",
  cross_region: "远行", cross_region_hub: "远行", cross_region_resolution: "远行",
  dialogue_scene: "交谈", ethical_choice: "抉择",
  combat_resolution: "战斗", encounter_resolution: "遭遇",
  act_break: "幕间", aftermath_hub: "灾后",
  codex_hub: "山海志", codex_resolution: "山海志",
  echo_summary: "回响",
  volume_transition: "卷间", volume_transition_hub: "卷间",
};

function StorySafeArea({ state, notice }: { state: GameState; notice: string }) {
  const sublocation = sceneLabels[currentStoryNode(state).presentation] ?? "";
  return <footer className="story-safe-area" aria-label="当前情境与提醒">
    <span className="safe-header">情境 · 安全区</span>
    <span className="safe-label">所在</span>
    <span className="safe-location">{state.location}{sublocation ? `·${sublocation}` : ""}</span>
    <span className="safe-divider">·</span>
    <span className="safe-label">时日</span>
    <span className="safe-time">第{state.day}日 · {state.period}</span>
    {notice && <span className="safe-notice">{notice}</span>}
  </footer>;
}

function MapPanel({ state }: { state: GameState }) {
  const places = [
    { name: "杳湾", tag: "起点", x: 49, y: 48 }, { name: "北滩无名尸", tag: "线索", x: 27, y: 29 }, { name: "东桑林", tag: "异象", x: 72, y: 26 }, { name: "旧盐井", tag: "深处", x: 68, y: 69 },
  ];
  return <div className="map-panel function-page function-page--map"><div className="archive-toolbar map-toolbar"><div><small>行旅舆图</small><h2>舆图</h2></div></div><p>本章的行旅由剧情选择推进。舆图记录已经在故事中显形的地点与线索；当前所在：{state.location}。</p><div className="map-canvas">{places.map((p) => <button key={p.name} className={p.name === state.location ? "is-here" : ""} style={{ left: `${p.x}%`, top: `${p.y}%` }} disabled={p.name !== state.location}><i /><b>{p.name}</b><small>{p.name === state.location ? "此间" : p.tag}</small></button>)}</div><div className="legend"><span><i className="known" />已抵达</span><span><i />剧情线索</span><span><i className="locked-dot" />尚待剧情开启</span></div></div>;
}

function CodexPanel({ state, openDetail }: { state: GameState; openDetail: (card: DetailCard) => void }) {
  const categoryNames: Record<string, string> = { event: "异象", person: "人物", item: "器物", material: "器物", beast: "异兽", place: "地理", document: "文书", tool: "器物" };
  const categoryTone: Record<string, string> = { event: "event", person: "person", item: "artifact", material: "artifact", beast: "beast", place: "place", document: "document", tool: "artifact" };
  const layerNames: Record<string, string> = { first_sight: "初见", rumor: "传闻", evidence: "行证", insight: "推论", echo: "余响" };
  const categoryGroups: Array<{ id: string; label: string; sources: string[] }> = [
    { id: "event", label: "异象", sources: ["event"] },
    { id: "person", label: "人物", sources: ["person"] },
    { id: "place", label: "地理", sources: ["place"] },
    { id: "beast", label: "异兽", sources: ["beast"] },
    { id: "artifact", label: "器物", sources: ["item", "tool", "material"] },
    { id: "document", label: "文书", sources: ["document"] },
  ];
  const categories = categoryGroups.filter((group) => blackRainContent.codex.some((entry) => group.sources.includes(entry.category)));
  const [category, setCategory] = useState(categories[0]?.id ?? "event");
  const activeCategory = categories.find((group) => group.id === category) ?? categories[0];
  const entries = blackRainContent.codex.filter((entry) => activeCategory?.sources.includes(entry.category)).filter((entry) => (state.codexLayers?.[entry.id]?.length ?? 0) > 0);
  return <section className="archive-browser codex-browser function-page function-page--codex" aria-label="山海志"><div className="archive-toolbar"><div><small>见闻辨析</small><h2>山海志</h2></div><span className="inventory-count">{state.codexUnlocked.length} 条已录</span></div><div className="codex-category-tabs" role="tablist" aria-label="山海志分类">{categories.map((group) => <button role="tab" aria-selected={category === group.id} className={category === group.id ? "active" : ""} onClick={() => setCategory(group.id)} key={group.id}>{group.label}<small>{blackRainContent.codex.filter((entry) => group.sources.includes(entry.category) && (state.codexLayers?.[entry.id]?.length ?? 0)).length}</small></button>)}</div><div className="archive-list codex-list-rows">{entries.length === 0 ? <p className="archive-empty">此类见闻尚未被记录。</p> : <>
    {entries.map((entry) => {
      const unlocked = new Set(state.codexLayers?.[entry.id] ?? []);
      const layer = entry.layers.filter((candidate) => unlocked.has(candidate.id)).at(-1) ?? entry.layers[0];
      const contradictions = [...new Set(entry.layers.flatMap((candidate) => unlocked.has(candidate.id) ? candidate.contradictions : []))];
      return <ArchiveRow key={entry.id} tone={categoryTone[entry.category] ?? "artifact"} eyebrow={`${layerNames[layer.id] ?? layer.id} · ${layer.sourceVoice}`} title={entry.title} note={`认知 ${unlocked.size}/${entry.layers.length} 层${contradictions.length ? " · 有异说" : ""}`} onClick={() => openDetail({
        eyebrow: `${categoryNames[entry.category] ?? entry.category} · 多源见闻`, title: entry.title, text: layer.text,
        source: `当前记录来自：${layer.sourceVoice}；可信度：${layer.reliability}${contradictions.length ? `；待辨异说：${contradictions.join(" / ")}` : ""}`,
        facts: [{ label: "认知层级", value: `${unlocked.size}/${entry.layers.length}` }, { label: "归类", value: categoryNames[entry.category] ?? entry.category }],
        sections: entry.layers.map((candidate) => ({ label: `${layerNames[candidate.id] ?? candidate.id} · ${unlocked.has(candidate.id) ? candidate.sourceVoice : "待求证"}`, text: unlocked.has(candidate.id) ? candidate.text : "这一层见闻尚未获得；继续观察、求证或承担后果后，记录可能更新。", locked: !unlocked.has(candidate.id) })),
      })} />;
    })}
  </>}</div></section>;
}

function InventoryPanel({ state, openDetail }: { state: GameState; openDetail: (card: DetailCard) => void }) {
  const categoryNames: Record<string, string> = { equipment: "装备", generic: "行旅", material: "器物", tool: "器物", clue: "线索", unique: "异物" };
  const rarityLabels: Record<string, string> = { common: "凡物", uncommon: "精良", rare: "珍异", quest: "任务", mythic: "神话" };
  const categoryGroups: Array<{ id: string; label: string; sources: string[] }> = [
    { id: "generic", label: "行旅", sources: ["generic"] },
    { id: "artifact", label: "器物", sources: ["material", "tool"] },
    { id: "clue", label: "线索", sources: ["clue"] },
    { id: "unique", label: "异物", sources: ["unique"] },
  ];
  const genericEntries = Object.entries(state.itemQuantities ?? {}).filter(([id, quantity]) => id in genericItems && Number(quantity) > 0).map(([id, quantity]) => ({ id, name: genericItems[id], category: "generic", text: "出身携带的行旅物件。", quantity: Number(quantity) }));
  const categories = categoryGroups.filter((group) => group.sources.includes("generic") ? genericEntries.length > 0 : blackRainContent.items.some((item) => group.sources.includes(item.category)));
  const [view, setView] = useState<"equipment" | "items">("equipment");
  const [category, setCategory] = useState(categories[0]?.id ?? "generic");
  const equipmentSlots = [{ label: "主手", name: state.equipment[0] }, { label: "副手／仪式手", name: undefined }, { label: "衣甲", name: state.equipment[1] }, { label: "足具", name: undefined }, { label: "护符", name: state.equipment[2] }, { label: "工具", name: undefined }, { label: "随身信物", name: undefined }];
  const activeCategory = categories.find((group) => group.id === category) ?? categories[0];
  const entries = activeCategory?.sources.includes("generic") ? genericEntries
    : blackRainContent.items.filter((item) => Number(state.itemQuantities?.[item.id] ?? 0) > 0).filter((item) => activeCategory?.sources.includes(item.category)).map((item) => ({ ...item, quantity: Number(state.itemQuantities?.[item.id] ?? 0) }));
  return <section className="archive-browser inventory-browser function-page function-page--inventory" aria-label="行囊"><div className="archive-toolbar"><div><small>行旅准备</small><h2>行囊</h2></div><span className="inventory-count">{view === "equipment" ? `${equipmentSlots.filter((slot) => slot.name).length}/${equipmentSlots.length} 在身` : `${entries.length} 类物件`}</span></div><div className="inventory-view-tabs" role="tablist" aria-label="行囊内容"><button role="tab" aria-selected={view === "equipment"} className={view === "equipment" ? "active" : ""} onClick={() => setView("equipment")}>在身装备</button><button role="tab" aria-selected={view === "items"} className={view === "items" ? "active" : ""} onClick={() => setView("items")}>随身物</button></div>{view === "equipment" ? <div className="archive-list inventory-list">{equipmentSlots.map((slot) => <ArchiveRow key={slot.label} eyebrow="在身装备位" title={slot.name ?? "未携带"} note={slot.name ? `${slot.label} · 可在剧情中响应条件` : `${slot.label} · 尚未携带`} disabled={!slot.name} onClick={() => openDetail({ eyebrow: `${slot.label} · 在身装备`, title: slot.name!, text: "此物已随身携带。它的效用由剧情中的场景、认知与选择共同决定，而不是单独堆叠数值。", source: "装备位仅记录当前在身物；替换与消耗会随剧情状态更新。", facts: [{ label: "装备位", value: slot.label }, { label: "状态", value: "已携带" }] })} />)}</div> : <><div className="category-tabs compact-tabs inventory-category-tabs" role="tablist" aria-label="随身物分类">{categories.map((group) => <button role="tab" aria-selected={category === group.id} className={category === group.id ? "active" : ""} onClick={() => setCategory(group.id)} key={group.id}>{group.label}</button>)}</div><div className="archive-list inventory-list">
    {entries.map((item) => { const rarity = (item as { rarity?: string }).rarity; const rarityLabel = rarity ? (rarityLabels[rarity] ?? rarity) : ""; return <ArchiveRow key={item.id} eyebrow={`${categoryNames[item.category] ?? item.category}${rarityLabel ? ` · ${rarityLabel}` : ""}`} title={item.name} note={`持有 ${item.quantity} 件`} onClick={() => {
      const content = itemById.get(item.id);
      const recognition = content?.recognitionStages[Math.max(0, Number(state.itemKnowledge?.[item.id] ?? 0) - 1)] ?? content?.recognitionStages[0];
      const knownStage = Math.max(0, Number(state.itemKnowledge?.[item.id] ?? 0));
      const stageNames = ["未辨", "初见", "传闻", "行证", "推论"];
      openDetail({ eyebrow: `${categoryNames[item.category] ?? item.category} · 随身物`, title: recognition?.displayName ?? item.name, text: recognition?.text ?? item.text, source: content ? `来源：${content.origin}` : "来源：角色出身", facts: [{ label: "数量", value: item.quantity }, { label: "认知", value: stageNames[knownStage] ?? "已识别" }, { label: "物性", value: content?.properties?.join(" · ") ?? "行旅物件" }], sections: content ? [{ label: "当前用途", text: recognition?.effects?.length ? "此物已显出可在特定场景中触发的用法；满足条件时，剧情会给出相应选择。" : "尚未显出明确用途；可继续观察、询问或用于相关场景。" }, { label: "叙事关联", text: content.storyHooks.length ? `可能关联：${content.storyHooks.join(" · ")}` : "尚未记录明确的后续关联。" }] : [{ label: "携带缘由", text: "这是角色出身携带的行旅物件；它不以固定数值替代剧情中的判断。" }] });
    }} />; })}{entries.length === 0 && <p className="archive-empty">此类行囊尚未获得。</p>}</div></>}</section>;
}

function PeoplePanel({ state, mutate, openDetail }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; openDetail: (card: DetailCard) => void }) {
  const factionLabels: Record<string, string> = { "FACTION-YAOWAN": "杳湾", "FACTION-NORTH": "北方来使", "FACTION-JIULI": "九黎流民", "FACTION-FUSANG": "扶桑遗脉" };
  const categories = [...new Set(blackRainContent.characters.map((character) => character.factionIds[0] ?? "其他"))];
  const [category, setCategory] = useState(categories[0]);
  const entries = blackRainContent.characters.filter((character) => (character.factionIds[0] ?? "其他") === category);
  return <ArchiveBrowser label="人物分类" categories={categories} categoryLabels={factionLabels} selectedCategory={category} setSelectedCategory={setCategory} emptyText="此类人物尚未在卷中显形。">
    {entries.map((character) => { const value = Number(state.relation[character.id] ?? 0); return <ArchiveRow key={character.id} eyebrow={character.state} title={character.name} note={character.identity} meter={{ value }} onClick={() => openDetail({ eyebrow: "人物 · 关系档案", title: character.name, text: character.desire, source: `言谈：${character.speechGuide}`, facts: [{ label: "当前关系", value: value }, { label: "关系轴", value: character.relationshipAxes.join(" · ") }, { label: "行踪", value: character.location }], action: { label: "留下守约的印象", run: () => mutate(`${character.name}记住了你守约的一次`, (draft) => ({ ...draft, relation: { ...draft.relation, [character.id]: value + 1 } })) } })} />; })}
  </ArchiveBrowser>;
}

function ArchiveBrowser({ label, categories, categoryLabels = {}, selectedCategory, setSelectedCategory, emptyText, children }: { label: string; categories: string[]; categoryLabels?: Record<string, string>; selectedCategory: string; setSelectedCategory: (value: string) => void; emptyText: string; children: React.ReactNode }) {
  const childCount = Array.isArray(children) ? children.length : 1;
  return <section className="archive-browser function-page function-page--people" aria-label={label}>
    <div className="archive-toolbar"><div><small>卷内检索</small><h2>{label}</h2></div><select aria-label={label} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>{categories.map((category) => <option value={category} key={category}>{categoryLabels[category] ?? category}</option>)}</select></div>
    <div className="category-tabs" role="tablist" aria-label={label}>{categories.map((category) => <button role="tab" aria-selected={selectedCategory === category} className={selectedCategory === category ? "active" : ""} onClick={() => setSelectedCategory(category)} key={category}>{categoryLabels[category] ?? category}</button>)}</div>
    <div className="archive-list">{childCount ? children : <p className="archive-empty">{emptyText}</p>}</div>
  </section>;
}

function ArchiveRow({ eyebrow, title, note, onClick, disabled = false, tone, meter }: { eyebrow: string; title: string; note: string; onClick: () => void; disabled?: boolean; tone?: string; meter?: { value: number; max?: number } }) {
  return <button className="archive-row" onClick={onClick} disabled={disabled}>{tone && <i className={`row-tone row-tone-${tone}`} aria-hidden="true" />}<span>{eyebrow}</span><b>{title}</b><small>{note}</small>{meter && <span className={`row-meter ${meter.value >= 0 ? "pos" : "neg"}`} aria-label={`关系 ${meter.value}`}><i><em style={{ width: `${Math.min(100, Math.abs(meter.value) / (meter.max ?? 10) * 100)}%` }} /></i><b>{meter.value > 0 ? `+${meter.value}` : meter.value}</b></span>}<i>{disabled ? "空位" : "查看"}</i></button>;
}

function FatePanel({ state, mutate, openDetail }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; openDetail: (card: DetailCard) => void }) {
  const [tab, setTab] = useState<"people" | "quests" | "echoes">("people");
  return <div className="fate-panel function-page function-page--fate">
    <div className="archive-toolbar fate-toolbar"><div><small>命运记录</small><h2>命录</h2></div></div>
    <div className="fate-tabs" role="tablist" aria-label="命录">
      <button role="tab" aria-selected={tab === "people"} className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}>故交</button>
      <button role="tab" aria-selected={tab === "quests"} className={tab === "quests" ? "active" : ""} onClick={() => setTab("quests")}>命轨</button>
      <button role="tab" aria-selected={tab === "echoes"} className={tab === "echoes" ? "active" : ""} onClick={() => setTab("echoes")}>余响</button>
    </div>
    {tab === "people" ? <PeoplePanel state={state} mutate={mutate} openDetail={openDetail} /> : tab === "quests" ? <QuestLog state={state} /> : <EchoLedger state={state} />}
  </div>;
}

function EchoLedger({ state }: { state: GameState }) {
  const echoes = settledEchoes(state);
  return <section className="echo-ledger" aria-label="已写入的余响"><header><small>杳湾记事</small><h3>已写入的余响</h3><p>只记录已经发生、且会在后续被再次读取的事。</p></header>{echoes.length === 0 ? <p className="quest-empty">眼下还没有写入可回收的世界记录。继续观察、求证或承担一项代价。</p> : <div className="echo-list">{echoes.map((echo) => <article key={echo.key}><i aria-hidden="true">◆</i><div><b>{echo.purpose}</b><small>{echo.destination === "next-volume" ? "已写入 · 将带入下一卷" : "已写入 · 将在本卷后续回响"}</small></div></article>)}</div>}</section>;
}

function QuestLog({ state }: { state: GameState }) {
  const [questTab, setQuestTab] = useState<"active" | "completed">("active");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const activeQuests = blackRainContent.quests.filter((quest) => state.activeQuests?.includes(quest.id));
  const completedQuests = blackRainContent.quests.filter((quest) => state.completedQuests?.includes(quest.id));
  const shownQuests = questTab === "active" ? activeQuests : completedQuests;
  const hasTasks = activeQuests.length > 0 || completedQuests.length > 0;
  function toggleQuest(id: string) {
    setCollapsed((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  return <div className="quest-log">
    {hasTasks ? <section className="quest-summary"><div className="quest-tabs" role="tablist" aria-label="事件分类"><button className={questTab === "active" ? "active" : ""} onClick={() => setQuestTab("active")} role="tab" aria-selected={questTab === "active"}>任务{activeQuests.length > 0 ? ` · ${activeQuests.length}` : ""}</button><button className={questTab === "completed" ? "active" : ""} onClick={() => setQuestTab("completed")} role="tab" aria-selected={questTab === "completed"}>已完成事件{completedQuests.length > 0 ? ` · ${completedQuests.length}` : ""}</button></div>{shownQuests.length === 0 ? <p className="quest-empty">{questTab === "active" ? "当前没有进行中的任务。" : "尚未完成任何事件。"}</p> : shownQuests.map((quest) => <article key={quest.id} className={collapsed.has(quest.id) ? "collapsed" : ""}><button className="quest-title" onClick={() => toggleQuest(quest.id)} aria-expanded={!collapsed.has(quest.id)}><b>{quest.name}</b><i aria-hidden="true">{collapsed.has(quest.id) ? "＋" : "－"}</i></button>{!collapsed.has(quest.id) && <><p>{quest.summary}</p><small>{questTab === "active" ? "当前问题仍在杳湾延续。" : "此事已了结。"}</small></>}</article>)}</section> : <p className="quest-empty">尚没有进行中或已了结的事件。</p>}
    <div className="event-log"><h3>最近记录</h3>{state.log.map((x, i) => <p key={`${x}-${i}`}>{x}</p>)}</div>
  </div>;
}

function DetailCardModal({ card, close }: { card: DetailCard; close: () => void }) {
  return <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal detail-card function-detail" role="dialog" aria-modal="true" aria-labelledby="detail-card-title"><button className="close" onClick={close} aria-label="关闭详情">×</button><small className="detail-eyebrow">{card.eyebrow}</small><h2 id="detail-card-title">{card.title}</h2><p>{highlightText(card.text)}</p>{card.facts && <dl className="detail-facts">{card.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}{card.sections && <div className="detail-sections">{card.sections.map((section) => <section className={section.locked ? "locked" : ""} key={section.label}><small>{section.label}</small><p>{highlightText(section.text)}</p></section>)}</div>}<footer>{card.source}</footer>{card.action && <button className="ink-button detail-action" onClick={() => { card.action?.run(); close(); }}>{card.action.label}</button>}</section></div>;
}

function Modal({ type, close, switchOverlay, state, activeId, setState, settings, setSettings, downloadSave, importRef, setNotice, exitToMain, createNewCharacter }: { type: Exclude<OverlayId, null>; close: () => void; switchOverlay: (o: OverlayId) => void; state: GameState | null; activeId: string | null; setState: (s: GameState | null) => void; settings: Settings; setSettings: (s: Settings) => void; downloadSave: () => void; importRef: React.RefObject<HTMLInputElement | null>; setNotice: (s: string) => void; exitToMain: () => void; createNewCharacter: (d: CharacterDraft) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true" aria-label="游戏弹窗"><button className="close" onClick={close}>×</button>
    {type === "character" && state && <CharacterDrawer state={state} />}
    {type === "create" && <CharacterCreator initial={state?.player ?? defaultPlayerDraft} complete={(draft) => { createNewCharacter(draft); close(); }} />}
    {type === "settings" && <SettingsPanel value={settings} setValue={setSettings} onClose={close} onExit={exitToMain} onSwitch={switchOverlay} />}
    {type === "saves" && <SavePanel state={state} activeId={activeId} setState={setState} download={downloadSave} importNow={() => importRef.current?.click()} setNotice={setNotice} />}
    {type === "help" && <HelpPanel />}
  </section></div>;
}

function CharacterDrawer({ state }: { state: GameState }) {
  return <div className="character-drawer"><span className="eyebrow">CHARACTER · 行者</span><h2>{state.player.name}</h2><p>{originName(state.player.origin)} · 年十八 · {state.location} · 第{state.day}日{state.period}</p><div className="character-drawer-resources"><Meter label="生息" value={state.resources.life} max={12} tone="red" /><Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" /><Meter label="定力" value={state.resources.resolve} max={10} tone="blue" /></div><StatChips stats={state.stats} /><dl><div><dt>天性</dt><dd>{natureName(state.player.nature)}</dd></div><div><dt>缺陷</dt><dd>{flawName(state.player.flaw)}</dd></div><div><dt>当前状态</dt><dd>{Object.keys(state.flags ?? {}).some((key) => key.startsWith("status.")) ? "异兆缠身" : "暂无重伤"}</dd></div></dl><p className="drawer-note">选择会改变你看到的信息、承担的代价与他人对你的回应。</p></div>;
}

function CharacterCreator({ initial, complete }: { initial: CharacterDraft; complete: (d: CharacterDraft) => void }) {
  const [draft, setDraft] = useState<CharacterDraft>(initial);
  const [step, setStep] = useState(0);
  const groups = [origins, natures, flaws] as const;
  const titles = ["你从哪里来？", "你如何面对未知？", "什么一直困扰着你？"];
  const keys = ["origin", "nature", "flaw"] as const;
  return <div className="creator"><span className="eyebrow">CHARACTER · 立身</span><h2>{titles[step]}</h2><p>差异会带来新的信息、选择与代价，而不只是数字增减。</p><div className="creator-options">{groups[step].map((x) => <button key={x.id} className={draft[keys[step]] === x.id ? "active" : ""} onClick={() => setDraft({ ...draft, [keys[step]]: x.id })}><b>{x.name}</b><span>{x.note}</span>{"bonus" in x && <small>{x.bonus}</small>}</button>)}</div>{step === 2 && <label className="name-field"><span>你的名字</span><input maxLength={8} value={draft.name === "无名之人" ? "" : draft.name} placeholder="无名之人" onChange={(e) => setDraft({ ...draft, name: e.target.value || "无名之人" })} /></label>}<div className="creator-footer"><button disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><div>{[0, 1, 2].map((n) => <i className={n === step ? "active" : ""} key={n} />)}</div>{step < 2 ? <button className="ink-button" onClick={() => setStep(step + 1)}>下一步</button> : <button className="ink-button" onClick={() => complete(draft)}>立身入世</button>}</div></div>;
}

function SettingsPanel({ value, setValue, onClose, onExit, onSwitch }: { value: Settings; setValue: (s: Settings) => void; onClose: () => void; onExit: () => void; onSwitch: (o: OverlayId) => void }) {
  const initial = useRef(value);
  const [confirming, setConfirming] = useState(false);
  const [cacheStatus, setCacheStatus] = useState("");
  const [needsReload, setNeedsReload] = useState(false);

  function handleCancel() {
    setValue(initial.current);
    setConfirming(false);
    onClose();
  }

  function handleClearCache() {
    if (!confirming) {
      setConfirming(true);
      setCacheStatus("");
      return;
    }
    const result = clearCache();
    setConfirming(false);
    setCacheStatus(`已清理 ${result.storageKeysRemoved} 项临时缓存，存档、进度与账号信息不受影响。`);
    setNeedsReload(result.httpCacheCleared);
  }

  return <div className="settings-panel game-settings"><span className="eyebrow">设置 · 游戏 · 内容 v{blackRainContent.manifest.contentVersion}</span><h2>游戏设置</h2><section className="settings-section"><h3>流程</h3><button className={`toggle ${value.autoSave ? "on" : ""}`} onClick={() => setValue({ ...value, autoSave: !value.autoSave })}><span>自动保存进度</span><i /></button><button className={`toggle ${value.haptics ? "on" : ""}`} onClick={() => setValue({ ...value, haptics: !value.haptics })}><span>触感反馈</span><i /></button></section><section className="settings-section"><h3>阅读</h3><label>正文字号 <b>{Math.round(value.fontScale * 100)}%</b><input type="range" min="0.9" max="1.3" step="0.05" value={value.fontScale} onChange={(e) => setValue({ ...value, fontScale: Number(e.target.value) })} /></label><label>正文行距 <b>{value.lineHeight.toFixed(1)}</b><input type="range" min="1.5" max="2.2" step="0.1" value={value.lineHeight} onChange={(e) => setValue({ ...value, lineHeight: Number(e.target.value) })} /></label><button className={`toggle ${value.textReveal ? "on" : ""}`} onClick={() => setValue({ ...value, textReveal: !value.textReveal })}><span>文字渐显</span><i /></button><label>文字出现速度 <b>{value.textSpeed.toFixed(2)}x</b><input type="range" min="0.5" max="3" step="0.25" value={value.textSpeed} onChange={(e) => setValue({ ...value, textSpeed: Number(e.target.value) })} /></label><button className={`toggle ${value.highContrast ? "on" : ""}`} onClick={() => setValue({ ...value, highContrast: !value.highContrast })}><span>高对比阅读</span><i /></button></section><section className="settings-section"><h3>声音与表现</h3><label>环境音量 <b>{value.ambientVolume}%</b><input type="range" min="0" max="100" value={value.ambientVolume} onChange={(e) => setValue({ ...value, ambientVolume: Number(e.target.value) })} /></label><button className={`toggle ${value.simplifiedTexture ? "on" : ""}`} onClick={() => setValue({ ...value, simplifiedTexture: !value.simplifiedTexture })}><span>简化背景纹理</span><i /></button><button className={`toggle ${value.reducedMotion ? "on" : ""}`} onClick={() => setValue({ ...value, reducedMotion: !value.reducedMotion })}><span>减弱界面动效</span><i /></button></section>
    <section className="settings-section settings-nav"><h3>存档与说明</h3><button className="settings-nav-button" onClick={() => onSwitch("saves")}><span>存档与迁移</span><i>›</i></button><button className="settings-nav-button" onClick={() => onSwitch("help")}><span>系统说明</span><i>›</i></button></section>
    <section className="settings-section settings-cache">
      <h3>缓存</h3>
      <p className="settings-cache-note">仅清理临时缓存（资源缓存与界面状态标记），<b>不会删除</b>你的存档、进度或账号设备信息。</p>
      <button className={`cache-clear-button ${confirming ? "confirming" : ""}`} onClick={handleClearCache} aria-label="清理临时缓存">{confirming ? "再次点击确认清理缓存" : "清理缓存"}</button>
      {cacheStatus && <p className="cache-status" role="status">{cacheStatus}</p>}
      {needsReload && <button className="cache-reload-button" onClick={() => window.location.reload()} aria-label="重新载入以应用最新资源">资源已更新 · 重新载入</button>}
    </section>
    <p>当前为本地浏览器 Demo：账号、云存档、广告与支付只保留接口边界，尚不启用。</p>
    <div className="settings-actions" role="group" aria-label="设置操作">
      <button className="settings-action secondary" onClick={handleCancel}>取消</button>
      <button className="settings-action primary" onClick={onClose}>保存</button>
      <button className="settings-action home" onClick={onExit}>返回主页</button>
    </div></div>;
}

function SavePanel({ state, activeId, setState, download, importNow, setNotice }: { state: GameState | null; activeId: string | null; setState: (s: GameState | null) => void; download: () => void; importNow: () => void; setNotice: (s: string) => void }) {
  const slots = ["manual-1", "manual-2", "manual-3", "manual-4", "manual-5"];
  const latestChoice = state?.storyHistory?.filter((entry) => entry.kind.startsWith("player-")).at(-1)?.text ?? "尚未作出关键选择";
  const hasCharacter = Boolean(state && activeId);
  return <div className="save-panel"><span className="eyebrow">本地优先 · 本地存档</span><h2>命数留痕</h2>
    {hasCharacter && state && activeId ? <>
      <div className="auto-save"><div><small>自动存档 · 当前内容版本 {state.contentVersion}</small><b>{state.player.name} · {state.location} · 年十八</b><span>{state.lastSavedAt ? new Date(state.lastSavedAt).toLocaleString("zh-CN") : "尚未写入"} · 最近：{latestChoice}</span></div><button onClick={() => { saveCharacter(activeId, state); setState({ ...state, lastSavedAt: new Date().toISOString() }); setNotice("当前进度已写入"); }}>写入当前进度</button></div>
      {slots.map((slot, i) => <div className="save-slot" key={slot}><span>{i + 1}</span><div><b>命数槽 {i + 1}</b><small>可写入当前章节，或读取该槽已有记录</small></div><button onClick={() => { saveCharacterSlot(activeId, i + 1, state); setNotice(`命数槽 ${i + 1} 已写入`); }}>写入</button><button onClick={() => { try { const loaded = loadCharacterSlot(activeId, i + 1); if (loaded) { setState(loaded); setNotice(`命数槽 ${i + 1} 已读取`); } else setNotice("此命数槽尚为空"); } catch { setNotice("存档损坏，未覆盖当前进度"); } }}>读取</button></div>)}
    </> : <p className="save-empty">尚未进入角色。你可导入一份存档，或先在主页创建角色。</p>}
    <div className="save-actions"><button onClick={download} disabled={!hasCharacter}>导出 JSON</button><button onClick={importNow}>导入 JSON</button></div><p>进度保存在此设备；本版本不接入账号或云同步。导入失败不会覆盖当前存档。</p></div>;
}

function HelpPanel() { return <div className="help-panel"><span className="eyebrow">关于 · 系统说明</span><h2>这是一册会记得你的书</h2><p>当前版本已加载第一卷《黑雨》v{blackRainContent.manifest.contentVersion}：剧情按节点呈现，选择会写入本地存档并解锁对应的任务、物品、关系与山海志见闻。</p><div><b>当前内容来源</b><span>仅读取“剧情/第一卷_黑雨/第一章_黑雨”的内容包与正文；备份目录不会参与游戏加载。</span></div><div><b>后续平台化</b><span>领域状态不直接依赖浏览器界面；存档与平台服务经适配层隔离，可在后续对接微信小游戏的文件、触摸、音频与生命周期 API。</span></div><small>剧情内容更新后，以内容包的 manifest 版本和当前节点 ID 为准重新载入。</small></div>; }
