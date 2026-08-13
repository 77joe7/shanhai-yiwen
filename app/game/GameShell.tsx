"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialState, flaws, hydrateBlackRainState, natures, origins } from "./gameData";
import { blackRainContent, genericItems, itemById } from "./blackRainContent";
import { choiceIntent, chooseStory, currentStoryNode, displayCharacterName, enterCurrentNode, interpolate, visibleBlocks, visibleChoices } from "./storyRuntime";
import { exportSave, importSave, loadGame, readSettings, saveGame, writeSettings } from "./storage";
import { browserPlatform } from "./platform";
import type { CharacterDraft, GameState, OverlayId, PanelId, Settings } from "./types";

const defaultSettings: Settings = { fontScale: 1, lineHeight: 1.85, highContrast: false, reducedMotion: false, textReveal: true, simplifiedTexture: false, ambientVolume: 35, autoSave: true, haptics: true };

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
  { id: "story", label: "卷册", icon: "册" },
  { id: "map", label: "舆图", icon: "图" },
  { id: "codex", label: "山海志", icon: "志" },
  { id: "inventory", label: "行囊", icon: "囊" },
  { id: "people", label: "人物", icon: "人" },
  { id: "more", label: "更多", icon: "··" },
];

function originName(id: string) { return origins.find((x) => x.id === id)?.name ?? id; }
function natureName(id: string) { return natures.find((x) => x.id === id)?.name ?? id; }
function flawName(id: string) { return flaws.find((x) => x.id === id)?.name ?? id; }

export function GameShell() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [panel, setPanel] = useState<PanelId>("story");
  const [overlay, setOverlay] = useState<OverlayId>(null);
  const [detail, setDetail] = useState<DetailCard | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("第一卷《黑雨》内容包已载入");
  const importRef = useRef<HTMLInputElement>(null);
  const panelScrollPositions = useRef<Partial<Record<PanelId, number>>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSettings(readSettings(defaultSettings));
        const saved = loadGame();
        const prepared = enterCurrentNode(hydrateBlackRainState(saved?.payload ?? createInitialState()));
        setState(prepared.state);
        if (prepared.notes.length) setNotice(prepared.notes.join(" · "));
      } catch { setNotice("检测到无效存档，已安全载入初始状态"); }
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

  function mutate(label: string, recipe: (draft: GameState) => GameState) {
    setState((current) => {
      const next = recipe(current);
      const logged = { ...next, revision: next.revision + 1, log: [label, ...next.log].slice(0, 20) };
      if (settings.autoSave) saveGame(logged);
      return logged;
    });
    setNotice(label);
  }

  function advanceStory(choiceId: string) {
    let nextNotice = "剧情继续推进。";
    setState((current) => {
      const result = chooseStory(hydrateBlackRainState(current), choiceId);
      const node = currentStoryNode(result.state);
      nextNotice = result.notes.length ? result.notes.join(" · ") : `抵达：${node.title}`;
      const logged = { ...result.state, revision: result.state.revision + 1, log: [nextNotice, ...result.state.log].slice(0, 20) };
      if (settings.autoSave) saveGame(logged);
      return logged;
    });
    if (settings.haptics) void browserPlatform.feedback.vibrate("light");
    setNotice(nextNotice);
  }

  function downloadSave() {
    browserPlatform.files.exportText(`天地未定_${state.player.name}_${new Date().toISOString().slice(0, 10)}.json`, exportSave(state));
    setNotice("存档已导出到本机");
  }

  async function receiveImport(file?: File) {
    if (!file) return;
    try { const next = hydrateBlackRainState(importSave(await file.text())); saveGame(next, "imported"); setState(next); setNotice("存档导入成功，原存档已保留"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "存档导入失败"); }
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
    <main className="game-shell mythic-shell">
      <header className="topbar">
        <button className="menu-trigger" aria-label="打开角色档案" onClick={() => setOverlay("character")}>☷</button>
        <button className="brand" aria-label="返回卷册" onClick={() => selectPanel("story")}>
          <span className="brand-seal">异</span><span><strong>山海异闻录</strong><small>天地未定</small></span>
        </button>
        <div className="chapter-marker"><span>卷一</span><strong>黑雨初落</strong><em>内容 v{blackRainContent.manifest.contentVersion}</em></div>
        <div className="top-actions">
          <button onClick={() => setOverlay("help")} aria-label="帮助">?</button>
          <button onClick={() => setOverlay("saves")} aria-label="存档">存</button>
          <button onClick={() => setOverlay("settings")} aria-label="设置">设</button>
        </div>
      </header>

      <section className="mobile-status-strip" aria-label="角色当前状态">
        <Meter label="生息" value={state.resources.life} max={12} tone="red" />
        <Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" />
        <Meter label="定力" value={state.resources.resolve} max={10} tone="blue" />
        <button type="button" onClick={() => setOverlay("character")} aria-label="查看角色档案">{state.player.name.slice(0, 1)}</button>
      </section>

      <section className="desktop-grid">
        <CharacterRail state={state} onCreate={() => setOverlay("create")} onOpenDetails={() => setOverlay("character")} />
        <section className="reader" aria-live="polite">
          <div className="reader-heading">
            <span className="eyebrow">第一卷《黑雨》 · {state.currentNodeId}</span>
            <h1>{!state.created ? "立身入世" : panel === "story" ? currentStoryNode(state).title : navItems.find((x) => x.id === panel)?.label}</h1>
            <div className="brush-rule"><i /></div>
          </div>
          {!state.created ? <StartPanel state={state} openCreate={() => setOverlay("create")} openSettings={() => setOverlay("settings")} openSaves={() => setOverlay("saves")} /> : <Panel panel={panel} state={state} mutate={mutate} advanceStory={advanceStory} typewriter={settings.textReveal} reducedMotion={settings.reducedMotion} selectPanel={selectPanel} openOverlay={setOverlay} openDetail={setDetail} />}
        </section>
        <SideRail panel={panel} setPanel={selectPanel} state={state} />
      </section>

      <form className={`command-dock ${panel === "story" && state.created ? "is-visible" : ""}`} onSubmit={(event) => { event.preventDefault(); submitCommand(); }} aria-label="当前意图栏">
        <label><span aria-hidden="true">&gt;</span><input value={command} onChange={(event) => setCommand(event.target.value)} maxLength={40} placeholder="写下意图，或直接选择下方行动…" aria-label="输入当前意图" /></label>
        <button type="submit">记入</button>
      </form>

      <nav className="mobile-nav" aria-label="主要功能">
        {navItems.filter((item) => item.id !== "people").map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => selectPanel(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}
      </nav>

      <div className="toast" role="status"><span />{notice}</div>
      {overlay && <Modal type={overlay} close={() => setOverlay(null)} state={state} setState={setState} settings={settings} setSettings={setSettings} downloadSave={downloadSave} importRef={importRef} setNotice={setNotice} />}
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
    <div className="location-card"><span>当前所在</span><strong>{state.location}</strong><small>第一日 · {state.period}</small></div>
    <div className="traits"><span>缺陷</span><b>{flawName(state.player.flaw)}</b><small>经历相关危机后，可形成新的应对之道。</small></div>
    <div className="danger-status" aria-label="当前危险状态"><span>状态</span><b>{Object.keys(state.flags ?? {}).some((key) => key.startsWith("status.")) ? "异兆缠身" : "暂无重伤"}</b></div>
  </aside>;
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return <div className="meter"><div><span>{label}</span><b>{value}<small>/{max}</small></b></div><i><em className={tone} style={{ width: `${Math.min(100, value / max * 100)}%` }} /></i></div>;
}

function SideRail({ panel, setPanel, state }: { panel: PanelId; setPanel: (p: PanelId) => void; state: GameState }) {
  return <aside className="side-rail">
    <nav>{navItems.map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}><span>{item.icon}</span>{item.label}<small>{item.id === "codex" ? state.codexUnlocked.length : ""}</small></button>)}</nav>
    <div className="whisper"><span>天地异兆</span><strong>一日</strong><p>天上仍只有一轮太阳。</p></div>
    <div className="reserved"><span>正式版预留</span><p>账号 · 云存档 · 平台能力</p><small>Demo 期间不启用、不占用叙事流程</small></div>
  </aside>;
}

function Panel({ panel, state, mutate, advanceStory, typewriter, reducedMotion, selectPanel, openOverlay, openDetail }: { panel: PanelId; state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; advanceStory: (choiceId: string) => void; typewriter: boolean; reducedMotion: boolean; selectPanel: (panel: PanelId) => void; openOverlay: (o: OverlayId) => void; openDetail: (card: DetailCard) => void }) {
  if (panel === "story") return <StoryPanel state={state} advanceStory={advanceStory} typewriter={typewriter} reducedMotion={reducedMotion} openCreate={() => openOverlay("create")} />;
  if (panel === "map") return <MapPanel state={state} />;
  if (panel === "codex") return <CodexPanel state={state} openDetail={openDetail} />;
  if (panel === "inventory") return <InventoryPanel state={state} openDetail={openDetail} />;
  if (panel === "people") return <PeoplePanel state={state} mutate={mutate} openDetail={openDetail} />;
  return <MorePanel state={state} openOverlay={openOverlay} openPeople={() => selectPanel("people")} />;
}

function StartPanel({ state, openCreate, openSettings, openSaves }: { state: GameState; openCreate: () => void; openSettings: () => void; openSaves: () => void }) {
  const hasSaveTrace = Boolean(state.lastSavedAt || state.storyHistory?.length || state.visitedNodes?.length);
  return <section className="start-panel" aria-label="开始进入界面">
    <div className="start-hero">
      <span className="eyebrow">NEW GAME · 黑雨将落</span>
      <h2>先立下一个普通人的名字</h2>
      <p>说明书要求主角不是预设的天命之子。新玩家进入前，需要先确定出身、天性与缺陷：它们会改变你能看见的信息、可承担的风险，以及旁人如何回应你。</p>
      <div className="start-actions">
        <button className="ink-button" onClick={openCreate}>设置角色信息</button>
        <button onClick={openSettings}>游戏设置</button>
        <button onClick={openSaves}>{hasSaveTrace ? "读取存档" : "导入存档"}</button>
      </div>
    </div>
    <div className="start-rule-grid" aria-label="核心体验">
      <article><b>观察</b><span>从天气、地形、物痕与人言中发现异常。</span></article>
      <article><b>求证</b><span>用探索、交涉和物件验证传闻，不靠盲目刷数值。</span></article>
      <article><b>准备</b><span>在行囊、路线、同伴和时机之间做取舍。</span></article>
      <article><b>后果</b><span>选择会写入关系、世界状态与山海志。</span></article>
    </div>
  </section>;
}

function StoryPanel({ state, advanceStory, typewriter, reducedMotion, openCreate }: { state: GameState; advanceStory: (choiceId: string) => void; typewriter: boolean; reducedMotion: boolean; openCreate: () => void }) {
  const node = currentStoryNode(state);
  const blocks = visibleBlocks(state);
  const choices = visibleChoices(state).map((choice) => state.created ? choice : { ...choice, enabled: false, disabledHint: "请先建立角色，再以出身进入故事。" });
  const latestNodeRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const previousNodeId = useRef(node.id);
  const fallbackHistory = blocks.map((block, index) => ({ id: `${node.id}:fallback:${index}`, nodeId: node.id, kind: block.type === "dialogue" ? "npc-dialogue" as const : block.type === "system" ? "system" as const : "narration" as const, text: interpolate(state, block.text), speaker: block.speaker }));
  const savedHistory = state.storyHistory ?? [];
  const history = savedHistory.some((entry) => entry.nodeId === node.id) ? savedHistory : [...savedHistory, ...fallbackHistory];
  const latestStart = history.findIndex((entry) => entry.nodeId === node.id);
  const currentEntries = history.slice(latestStart);
  const [reveal, setReveal] = useState(() => ({ nodeId: node.id, entryIndex: currentEntries.length, characters: 0 }));
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const revealNodeMatches = reveal.nodeId === node.id;
  const revealIndex = revealNodeMatches ? reveal.entryIndex : 0;
  const revealCharacters = revealNodeMatches ? reveal.characters : 0;
  const shouldType = typewriter && !reducedMotion;
  const displayIndex = shouldType ? revealIndex : currentEntries.length;
  const displayCharacters = shouldType ? revealCharacters : 0;
  const isTyping = shouldType && revealIndex < currentEntries.length;

  function scrollToLatest(position: "start" | "end" = "end") {
    const target = position === "start" ? latestNodeRef.current : transcriptEndRef.current;
    window.requestAnimationFrame(() => target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: position === "start" ? "center" : "end" }));
  }

  function revealAll() { setReveal({ nodeId: node.id, entryIndex: currentEntries.length, characters: 0 }); }

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
    if (!isTyping) return;
    const entry = currentEntries[revealIndex];
    const nextCharacter = revealCharacters + 1;
    const completed = nextCharacter > entry.text.length;
    const finalCharacter = entry.text.at(-1) ?? "";
    const delay = completed ? 280 : /[。！？；：]/.test(entry.text[revealCharacters] ?? finalCharacter) ? 280 : 30;
    const timer = window.setTimeout(() => setReveal((current) => completed
      ? { ...current, entryIndex: current.entryIndex + 1, characters: 0 }
      : { ...current, characters: nextCharacter }), delay);
    return () => window.clearTimeout(timer);
  }, [currentEntries, isTyping, reducedMotion, revealCharacters, revealIndex]);

  return <article className="story-panel story-runtime">
    <header className="story-kicker"><span>{node.chapter.replace("ACT", "第")}</span><small>{node.presentation === "prologue" ? "卷首" : "剧情节点"}</small></header>
    {!state.created && <div className="story-create"><b>以你的出身进入杳湾</b><button className="ink-button" onClick={openCreate}>建立角色</button></div>}
    <div className="story-blocks story-transcript">{history.map((entry, index) => {
      const currentIndex = index - latestStart;
      const isCurrentEntry = currentIndex === displayIndex;
      if (currentIndex > displayIndex) return null;
      const text = isCurrentEntry ? entry.text.slice(0, displayCharacters) : entry.text;
      return <div className="story-message-wrap" key={entry.id}>{index === latestStart && <div className="story-node-marker" ref={latestNodeRef}><span>最新剧情</span></div>}{entry.kind === "npc-dialogue" ? <blockquote className={`story-message npc-dialogue ${isCurrentEntry ? "is-typing" : ""}`}><cite>{displayCharacterName(entry.speaker ?? "") } · 对话</cite><p>{text}</p></blockquote> : entry.kind === "system" ? <aside className={`story-message story-system ${isCurrentEntry ? "is-typing" : ""}`}>异兆记录 · {text}</aside> : entry.kind === "narration" ? <p className={`story-message narration ${isCurrentEntry ? "is-typing" : ""}`}>{text}</p> : <article className={`story-message player-message ${entry.kind} ${isCurrentEntry ? "is-typing" : ""}`}><small>你 · {entry.kind === "player-speech" ? "说话" : "行动"}</small><p>{text}</p></article>}</div>;
    })}</div>
    <div className="story-reading-controls" aria-live="polite"><span>{isTyping ? "剧情正在展开" : "本段已展开"}</span>{isTyping && <button onClick={revealAll} aria-label="显示当前剧情全文">显示全文</button>}{awayFromLatest && <button onClick={() => scrollToLatest()} aria-label="回到最新剧情与当前操作">回到最新</button>}</div>
    <div className="choices story-choices">{choices.map((choice, index) => { const intent = choiceIntent(choice.label); const available = choice.enabled && !isTyping; const variant = choice.sourceTag ? "special-choice" : ""; return <button key={choice.id} className={`${intent}-choice ${variant} ${!available ? "locked" : ""}`} disabled={!available} onClick={() => advanceStory(choice.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{choice.label}</b><small>{choice.sourceTag ? `来源：${choice.sourceTag}` : available ? `待决定 · ${intent === "speech" ? "说话" : "行动"}` : isTyping ? "剧情展开中" : choice.disabledHint ?? "条件尚未满足"}</small></div><i>{available ? "→" : "—"}</i></button>; })}</div>
    <div ref={transcriptEndRef} />
  </article>;
}

function MapPanel({ state }: { state: GameState }) {
  const places = [
    { name: "杳湾", tag: "起点", x: 49, y: 48 }, { name: "北滩无名尸", tag: "线索", x: 27, y: 29 }, { name: "东桑林", tag: "异象", x: 72, y: 26 }, { name: "旧盐井", tag: "深处", x: 68, y: 69 },
  ];
  return <div className="map-panel"><p>本章的行旅由剧情选择推进。舆图记录已经在故事中显形的地点与线索；当前所在：{state.location}。</p><div className="map-canvas">{places.map((p) => <button key={p.name} style={{ left: `${p.x}%`, top: `${p.y}%` }} disabled={p.name !== state.location}><i /><b>{p.name}</b><small>{p.name === state.location ? "当前" : p.tag}</small></button>)}</div><div className="legend"><span><i className="known" />已抵达</span><span><i />剧情线索</span><span><i className="locked-dot" />尚待剧情开启</span></div></div>;
}

function CodexPanel({ state, openDetail }: { state: GameState; openDetail: (card: DetailCard) => void }) {
  const categoryNames: Record<string, string> = { event: "异象", person: "人物", item: "器物", material: "器物", beast: "异兽", place: "地理", document: "文书", tool: "器物" };
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
  return <section className="archive-browser codex-browser" aria-label="山海志"><div className="archive-toolbar"><div><small>见闻辨析</small><h2>山海志</h2></div><span className="inventory-count">{state.codexUnlocked.length} 条已录</span></div><div className="codex-category-tabs" role="tablist" aria-label="山海志分类">{categories.map((group) => <button role="tab" aria-selected={category === group.id} className={category === group.id ? "active" : ""} onClick={() => setCategory(group.id)} key={group.id}>{group.label}<small>{blackRainContent.codex.filter((entry) => group.sources.includes(entry.category) && (state.codexLayers?.[entry.id]?.length ?? 0) > 0).length}</small></button>)}</div><div className="archive-list codex-list-rows">{entries.length === 0 ? <p className="archive-empty">此类见闻尚未被记录。</p> : <>
    {entries.map((entry) => {
      const unlocked = new Set(state.codexLayers?.[entry.id] ?? []);
      const layer = entry.layers.filter((candidate) => unlocked.has(candidate.id)).at(-1) ?? entry.layers[0];
      const contradictions = [...new Set(entry.layers.flatMap((candidate) => unlocked.has(candidate.id) ? candidate.contradictions : []))];
      return <ArchiveRow key={entry.id} eyebrow={`${layerNames[layer.id] ?? layer.id} · ${layer.sourceVoice}`} title={entry.title} note={`认知 ${unlocked.size}/${entry.layers.length} 层${contradictions.length ? " · 有异说" : ""}`} onClick={() => openDetail({
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
  return <section className="archive-browser inventory-browser" aria-label="行囊"><div className="archive-toolbar"><div><small>行旅准备</small><h2>行囊</h2></div><span className="inventory-count">{view === "equipment" ? `${equipmentSlots.filter((slot) => slot.name).length}/${equipmentSlots.length} 在身` : `${entries.length} 类物件`}</span></div><div className="inventory-view-tabs" role="tablist" aria-label="行囊内容"><button role="tab" aria-selected={view === "equipment"} className={view === "equipment" ? "active" : ""} onClick={() => setView("equipment")}>在身装备</button><button role="tab" aria-selected={view === "items"} className={view === "items" ? "active" : ""} onClick={() => setView("items")}>随身物</button></div>{view === "equipment" ? <div className="archive-list inventory-list">{equipmentSlots.map((slot) => <ArchiveRow key={slot.label} eyebrow="在身装备位" title={slot.name ?? "未携带"} note={slot.name ? `${slot.label} · 可在剧情中响应条件` : `${slot.label} · 尚未携带`} disabled={!slot.name} onClick={() => openDetail({ eyebrow: `${slot.label} · 在身装备`, title: slot.name!, text: "此物已随身携带。它的效用由剧情中的场景、认知与选择共同决定，而不是单独堆叠数值。", source: "装备位仅记录当前在身物；替换与消耗会随剧情状态更新。", facts: [{ label: "装备位", value: slot.label }, { label: "状态", value: "已携带" }] })} />)}</div> : <><div className="category-tabs compact-tabs inventory-category-tabs" role="tablist" aria-label="随身物分类">{categories.map((group) => <button role="tab" aria-selected={category === group.id} className={category === group.id ? "active" : ""} onClick={() => setCategory(group.id)} key={group.id}>{group.label}</button>)}</div><div className="archive-list inventory-list">
    {entries.map((item) => <ArchiveRow key={item.id} eyebrow={categoryNames[item.category] ?? item.category} title={item.name} note={`持有 ${item.quantity} 件`} onClick={() => {
      const content = itemById.get(item.id);
      const recognition = content?.recognitionStages[Math.max(0, Number(state.itemKnowledge?.[item.id] ?? 0) - 1)] ?? content?.recognitionStages[0];
      const knownStage = Math.max(0, Number(state.itemKnowledge?.[item.id] ?? 0));
      const stageNames = ["未辨", "初见", "传闻", "行证", "推论"];
      openDetail({ eyebrow: `${categoryNames[item.category] ?? item.category} · 随身物`, title: recognition?.displayName ?? item.name, text: recognition?.text ?? item.text, source: content ? `来源：${content.origin}` : "来源：角色出身", facts: [{ label: "数量", value: item.quantity }, { label: "认知", value: stageNames[knownStage] ?? "已识别" }, { label: "物性", value: content?.properties?.join(" · ") ?? "行旅物件" }], sections: content ? [{ label: "当前用途", text: recognition?.effects?.length ? "此物已显出可在特定场景中触发的用法；满足条件时，剧情会给出相应选择。" : "尚未显出明确用途；可继续观察、询问或用于相关场景。" }, { label: "叙事关联", text: content.storyHooks.length ? `可能关联：${content.storyHooks.join(" · ")}` : "尚未记录明确的后续关联。" }] : [{ label: "携带缘由", text: "这是角色出身携带的行旅物件；它不以固定数值替代剧情中的判断。" }] });
    }} />)}{entries.length === 0 && <p className="archive-empty">此类行囊尚未获得。</p>}</div></>}</section>;
}

function PeoplePanel({ state, mutate, openDetail }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; openDetail: (card: DetailCard) => void }) {
  const factionLabels: Record<string, string> = { "FACTION-YAOWAN": "杳湾", "FACTION-NORTH": "北方来使", "FACTION-JIULI": "九黎流民", "FACTION-FUSANG": "扶桑遗脉" };
  const categories = [...new Set(blackRainContent.characters.map((character) => character.factionIds[0] ?? "其他"))];
  const [category, setCategory] = useState(categories[0]);
  const entries = blackRainContent.characters.filter((character) => (character.factionIds[0] ?? "其他") === category);
  return <ArchiveBrowser label="人物分类" categories={categories} categoryLabels={factionLabels} selectedCategory={category} setSelectedCategory={setCategory} emptyText="此类人物尚未在卷中显形。">
    {entries.map((character) => { const value = Number(state.relation[character.id] ?? 0); return <ArchiveRow key={character.id} eyebrow={character.state} title={character.name} note={character.identity} onClick={() => openDetail({ eyebrow: "人物 · 关系档案", title: character.name, text: character.desire, source: `言谈：${character.speechGuide}`, facts: [{ label: "当前关系", value: value }, { label: "关系轴", value: character.relationshipAxes.join(" · ") }, { label: "行踪", value: character.location }], action: { label: "留下守约的印象", run: () => mutate(`${character.name}记住了你守约的一次`, (draft) => ({ ...draft, relation: { ...draft.relation, [character.id]: value + 1 } })) } })} />; })}
  </ArchiveBrowser>;
}

function ArchiveBrowser({ label, categories, categoryLabels = {}, selectedCategory, setSelectedCategory, emptyText, children }: { label: string; categories: string[]; categoryLabels?: Record<string, string>; selectedCategory: string; setSelectedCategory: (value: string) => void; emptyText: string; children: React.ReactNode }) {
  const childCount = Array.isArray(children) ? children.length : 1;
  return <section className="archive-browser" aria-label={label}>
    <div className="archive-toolbar"><div><small>卷内检索</small><h2>{label}</h2></div><select aria-label={label} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>{categories.map((category) => <option value={category} key={category}>{categoryLabels[category] ?? category}</option>)}</select></div>
    <div className="category-tabs" role="tablist" aria-label={label}>{categories.map((category) => <button role="tab" aria-selected={selectedCategory === category} className={selectedCategory === category ? "active" : ""} onClick={() => setSelectedCategory(category)} key={category}>{categoryLabels[category] ?? category}</button>)}</div>
    <div className="archive-list">{childCount ? children : <p className="archive-empty">{emptyText}</p>}</div>
  </section>;
}

function ArchiveRow({ eyebrow, title, note, onClick, disabled = false }: { eyebrow: string; title: string; note: string; onClick: () => void; disabled?: boolean }) {
  return <button className="archive-row" onClick={onClick} disabled={disabled}><span>{eyebrow}</span><b>{title}</b><small>{note}</small><i>{disabled ? "空位" : "查看"}</i></button>;
}

function MorePanel({ state, openOverlay, openPeople }: { state: GameState; openOverlay: (o: OverlayId) => void; openPeople: () => void }) {
  const activeQuests = blackRainContent.quests.filter((quest) => state.activeQuests?.includes(quest.id));
  return <div className="more-panel">{activeQuests.length > 0 && <section className="quest-summary"><small>进行中的事件</small>{activeQuests.map((quest) => <article key={quest.id}><b>{quest.name}</b><p>{quest.summary}</p><small>当前问题仍在杳湾延续。</small></article>)}</section>}<button onClick={openPeople}><b>人物与关系</b><span>目标、秘密、关系来源与近况</span></button><button onClick={() => openOverlay("saves")}><b>存档与迁移</b><span>自动存档、命数槽、导入与导出</span></button><button onClick={() => openOverlay("settings")}><b>阅读与无障碍</b><span>字号、行距、动效与背景纹理</span></button><button onClick={() => openOverlay("help")}><b>系统说明</b><span>剧情内容、平台边界与快捷操作</span></button><div className="event-log"><h3>最近记录</h3>{state.log.map((x, i) => <p key={`${x}-${i}`}>{x}</p>)}</div></div>;
}

function DetailCardModal({ card, close }: { card: DetailCard; close: () => void }) {
  return <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal detail-card" role="dialog" aria-modal="true" aria-labelledby="detail-card-title"><button className="close" onClick={close} aria-label="关闭详情">×</button><small className="detail-eyebrow">{card.eyebrow}</small><h2 id="detail-card-title">{card.title}</h2><p>{card.text}</p>{card.facts && <dl className="detail-facts">{card.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}{card.sections && <div className="detail-sections">{card.sections.map((section) => <section className={section.locked ? "locked" : ""} key={section.label}><small>{section.label}</small><p>{section.text}</p></section>)}</div>}<footer>{card.source}</footer>{card.action && <button className="ink-button detail-action" onClick={() => { card.action?.run(); close(); }}>{card.action.label}</button>}</section></div>;
}

function Modal({ type, close, state, setState, settings, setSettings, downloadSave, importRef, setNotice }: { type: Exclude<OverlayId, null>; close: () => void; state: GameState; setState: (s: GameState) => void; settings: Settings; setSettings: (s: Settings) => void; downloadSave: () => void; importRef: React.RefObject<HTMLInputElement | null>; setNotice: (s: string) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true" aria-label="游戏弹窗"><button className="close" onClick={close}>×</button>
    {type === "character" && <CharacterDrawer state={state} />}
    {type === "create" && <CharacterCreator state={state} complete={(draft) => { const entered = enterCurrentNode(createInitialState(draft)); setState(entered.state); if (settings.autoSave) saveGame(entered.state); if (settings.haptics) void browserPlatform.feedback.vibrate("medium"); setNotice(entered.notes.join(" · ") || `${draft.name}已在天地间留下名字`); close(); }} />}
    {type === "settings" && <SettingsPanel value={settings} setValue={setSettings} />}
    {type === "saves" && <SavePanel state={state} setState={setState} download={downloadSave} importNow={() => importRef.current?.click()} setNotice={setNotice} />}
    {type === "help" && <HelpPanel />}
  </section></div>;
}

function CharacterDrawer({ state }: { state: GameState }) {
  return <div className="character-drawer"><span className="eyebrow">CHARACTER · 行者</span><h2>{state.player.name}</h2><p>{originName(state.player.origin)} · 年十八 · {state.location} · 第一日{state.period}</p><div className="character-drawer-resources"><Meter label="生息" value={state.resources.life} max={12} tone="red" /><Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" /><Meter label="定力" value={state.resources.resolve} max={10} tone="blue" /></div><dl><div><dt>天性</dt><dd>{natureName(state.player.nature)}</dd></div><div><dt>缺陷</dt><dd>{flawName(state.player.flaw)}</dd></div><div><dt>当前状态</dt><dd>{Object.keys(state.flags ?? {}).some((key) => key.startsWith("status.")) ? "异兆缠身" : "暂无重伤"}</dd></div></dl><p className="drawer-note">选择会改变你看到的信息、承担的代价与他人对你的回应。</p></div>;
}

function CharacterCreator({ state, complete }: { state: GameState; complete: (d: CharacterDraft) => void }) {
  const [draft, setDraft] = useState<CharacterDraft>(state.player);
  const [step, setStep] = useState(0);
  const groups = [origins, natures, flaws] as const;
  const titles = ["你从哪里来？", "你如何面对未知？", "什么一直困扰着你？"];
  const keys = ["origin", "nature", "flaw"] as const;
  return <div className="creator"><span className="eyebrow">CHARACTER · 立身</span><h2>{titles[step]}</h2><p>差异会带来新的信息、选择与代价，而不只是数字增减。</p><div className="creator-options">{groups[step].map((x) => <button key={x.id} className={draft[keys[step]] === x.id ? "active" : ""} onClick={() => setDraft({ ...draft, [keys[step]]: x.id })}><b>{x.name}</b><span>{x.note}</span>{"bonus" in x && <small>{x.bonus}</small>}</button>)}</div>{step === 2 && <label className="name-field"><span>你的名字</span><input maxLength={8} value={draft.name === "无名之人" ? "" : draft.name} placeholder="无名之人" onChange={(e) => setDraft({ ...draft, name: e.target.value || "无名之人" })} /></label>}<div className="creator-footer"><button disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><div>{[0, 1, 2].map((n) => <i className={n === step ? "active" : ""} key={n} />)}</div>{step < 2 ? <button className="ink-button" onClick={() => setStep(step + 1)}>下一步</button> : <button className="ink-button" onClick={() => complete(draft)}>立身入世</button>}</div></div>;
}

function SettingsPanel({ value, setValue }: { value: Settings; setValue: (s: Settings) => void }) {
  return <div className="settings-panel game-settings"><span className="eyebrow">SETTINGS · 游戏</span><h2>游戏设置</h2><section className="settings-section"><h3>流程</h3><button className={`toggle ${value.autoSave ? "on" : ""}`} onClick={() => setValue({ ...value, autoSave: !value.autoSave })}><span>自动保存进度</span><i /></button><button className={`toggle ${value.haptics ? "on" : ""}`} onClick={() => setValue({ ...value, haptics: !value.haptics })}><span>触感反馈</span><i /></button></section><section className="settings-section"><h3>阅读</h3><label>正文字号 <b>{Math.round(value.fontScale * 100)}%</b><input type="range" min="0.9" max="1.3" step="0.05" value={value.fontScale} onChange={(e) => setValue({ ...value, fontScale: Number(e.target.value) })} /></label><label>正文行距 <b>{value.lineHeight.toFixed(1)}</b><input type="range" min="1.5" max="2.2" step="0.1" value={value.lineHeight} onChange={(e) => setValue({ ...value, lineHeight: Number(e.target.value) })} /></label><button className={`toggle ${value.textReveal ? "on" : ""}`} onClick={() => setValue({ ...value, textReveal: !value.textReveal })}><span>文字渐显</span><i /></button><button className={`toggle ${value.highContrast ? "on" : ""}`} onClick={() => setValue({ ...value, highContrast: !value.highContrast })}><span>高对比阅读</span><i /></button></section><section className="settings-section"><h3>声音与表现</h3><label>环境音量 <b>{value.ambientVolume}%</b><input type="range" min="0" max="100" value={value.ambientVolume} onChange={(e) => setValue({ ...value, ambientVolume: Number(e.target.value) })} /></label><button className={`toggle ${value.simplifiedTexture ? "on" : ""}`} onClick={() => setValue({ ...value, simplifiedTexture: !value.simplifiedTexture })}><span>简化背景纹理</span><i /></button><button className={`toggle ${value.reducedMotion ? "on" : ""}`} onClick={() => setValue({ ...value, reducedMotion: !value.reducedMotion })}><span>减弱界面动效</span><i /></button></section><p>当前为本地浏览器 Demo：账号、云存档、广告与支付只保留接口边界，尚不启用。</p></div>;
}

function SavePanel({ state, setState, download, importNow, setNotice }: { state: GameState; setState: (s: GameState) => void; download: () => void; importNow: () => void; setNotice: (s: string) => void }) {
  const slots = ["manual-1", "manual-2", "manual-3", "manual-4", "manual-5"];
  const latestChoice = state.storyHistory?.filter((entry) => entry.kind.startsWith("player-")).at(-1)?.text ?? "尚未作出关键选择";
  return <div className="save-panel"><span className="eyebrow">LOCAL FIRST · 本地存档</span><h2>命数留痕</h2><div className="auto-save"><div><small>自动存档 · 当前内容 v{state.contentVersion}</small><b>{state.player.name} · {state.location} · 年十八</b><span>{state.lastSavedAt ? new Date(state.lastSavedAt).toLocaleString("zh-CN") : "尚未写入"} · 最近：{latestChoice}</span></div><button onClick={() => { const e = saveGame(state); setState(e.payload); setNotice("自动存档已更新"); }}>写入当前进度</button></div>{slots.map((slot, i) => <div className="save-slot" key={slot}><span>{i + 1}</span><div><b>命数槽 {i + 1}</b><small>可写入当前章节，或读取该槽已有记录</small></div><button onClick={() => { const e = saveGame(state, slot); setState(e.payload); setNotice(`命数槽 ${i + 1} 已写入`); }}>写入</button><button onClick={() => { try { const e = loadGame(slot); if (e) { setState(e.payload); setNotice(`命数槽 ${i + 1} 已读取`); } else setNotice("此命数槽尚为空"); } catch { setNotice("存档损坏，未覆盖当前进度"); } }}>读取</button></div>)}<div className="save-actions"><button onClick={download}>导出 JSON</button><button onClick={importNow}>导入 JSON</button></div><p>进度保存在此设备；本版本不接入账号或云同步。导入失败不会覆盖当前存档。</p></div>;
}

function HelpPanel() { return <div className="help-panel"><span className="eyebrow">ABOUT · 系统说明</span><h2>这是一册会记得你的书</h2><p>当前版本已加载第一卷《黑雨》v{blackRainContent.manifest.contentVersion}：剧情按节点呈现，选择会写入本地存档并解锁对应的任务、物品、关系与山海志见闻。</p><div><b>当前内容来源</b><span>仅读取“剧情/第一卷_黑雨/第一章_黑雨”的内容包与正文；备份目录不会参与游戏加载。</span></div><div><b>后续平台化</b><span>领域状态不直接依赖浏览器界面；存档与平台服务经适配层隔离，可在后续对接微信小游戏的文件、触摸、音频与生命周期 API。</span></div><small>剧情内容更新后，以内容包的 manifest 版本和当前节点 ID 为准重新载入。</small></div>; }
