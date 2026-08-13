"use client";

import { useEffect, useRef, useState } from "react";
import { createInitialState, flaws, hydrateBlackRainState, natures, origins } from "./gameData";
import { blackRainContent, genericItems, itemById } from "./blackRainContent";
import { chooseStory, currentStoryNode, displayCharacterName, enterCurrentNode, interpolate, visibleBlocks, visibleChoices } from "./storyRuntime";
import { exportSave, importSave, loadGame, readSettings, saveGame, writeSettings } from "./storage";
import { browserPlatform } from "./platform";
import type { CharacterDraft, GameState, OverlayId, PanelId, Settings } from "./types";

const defaultSettings: Settings = { fontScale: 1, lineHeight: 1.85, highContrast: false, reducedMotion: false, ambientVolume: 35 };

type DetailCard = {
  eyebrow: string;
  title: string;
  text: string;
  source: string;
  facts?: { label: string; value: string | number }[];
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
  const [notice, setNotice] = useState("第一卷《黑雨》内容包已载入");
  const importRef = useRef<HTMLInputElement>(null);

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
    writeSettings(settings);
  }, [settings]);

  function mutate(label: string, recipe: (draft: GameState) => GameState) {
    setState((current) => {
      const next = recipe(current);
      const logged = { ...next, revision: next.revision + 1, log: [label, ...next.log].slice(0, 20) };
      saveGame(logged);
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
      saveGame(logged);
      return logged;
    });
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

  return (
    <main className="game-shell mythic-shell">
      <header className="topbar">
        <button className="brand" aria-label="返回卷册" onClick={() => setPanel("story")}>
          <span className="brand-seal">异</span><span><strong>山海异闻录</strong><small>天地未定</small></span>
        </button>
        <div className="chapter-marker"><span>卷一</span><strong>黑雨初落</strong><em>内容 v{blackRainContent.manifest.contentVersion}</em></div>
        <div className="top-actions">
          <button onClick={() => setOverlay("help")} aria-label="帮助">?</button>
          <button onClick={() => setOverlay("saves")} aria-label="存档">存</button>
          <button onClick={() => setOverlay("settings")} aria-label="设置">设</button>
        </div>
      </header>

      <section className="desktop-grid">
        <CharacterRail state={state} onCreate={() => setOverlay("create")} />
        <section className="reader" aria-live="polite">
          <div className="reader-heading">
            <span className="eyebrow">第一卷《黑雨》 · {state.currentNodeId}</span>
            <h1>{panel === "story" ? currentStoryNode(state).title : navItems.find((x) => x.id === panel)?.label}</h1>
            <div className="brush-rule"><i /></div>
          </div>
          <Panel panel={panel} state={state} mutate={mutate} advanceStory={advanceStory} openOverlay={setOverlay} openDetail={setDetail} />
        </section>
        <SideRail panel={panel} setPanel={setPanel} state={state} />
      </section>

      <nav className="mobile-nav" aria-label="主要功能">
        {navItems.slice(0, 5).map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}
      </nav>

      <div className="toast" role="status"><span />{notice}</div>
      {overlay && <Modal type={overlay} close={() => setOverlay(null)} state={state} setState={setState} settings={settings} setSettings={setSettings} downloadSave={downloadSave} importRef={importRef} setNotice={setNotice} />}
      {detail && <DetailCardModal card={detail} close={() => setDetail(null)} />}
      <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(e) => receiveImport(e.target.files?.[0])} />
    </main>
  );
}

function CharacterRail({ state, onCreate }: { state: GameState; onCreate: () => void }) {
  return <aside className="character-rail">
    <div className="portrait"><div className="portrait-mist" /><span>{state.player.name.slice(0, 1)}</span></div>
    <div className="identity"><small>{state.created ? originName(state.player.origin) : "尚未入世"}</small><h2>{state.player.name}</h2><p>年十八 · {natureName(state.player.nature)}</p></div>
    {!state.created && <button className="ink-button full" onClick={onCreate}>立身入世</button>}
    <div className="resource-list">
      <Meter label="生息" value={state.resources.life} max={12} tone="red" />
      <Meter label="精力" value={state.resources.stamina} max={10} tone="ochre" />
      <Meter label="定力" value={state.resources.resolve} max={10} tone="blue" />
    </div>
    <div className="location-card"><span>当前所在</span><strong>{state.location}</strong><small>第一日 · {state.period}</small></div>
    <div className="traits"><span>缺陷</span><b>{flawName(state.player.flaw)}</b><small>经历相关危机后，可形成新的应对之道。</small></div>
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

function Panel({ panel, state, mutate, advanceStory, openOverlay, openDetail }: { panel: PanelId; state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; advanceStory: (choiceId: string) => void; openOverlay: (o: OverlayId) => void; openDetail: (card: DetailCard) => void }) {
  if (panel === "story") return <StoryPanel state={state} advanceStory={advanceStory} openCreate={() => openOverlay("create")} />;
  if (panel === "map") return <MapPanel state={state} />;
  if (panel === "codex") return <CodexPanel state={state} openDetail={openDetail} />;
  if (panel === "inventory") return <InventoryPanel state={state} openDetail={openDetail} />;
  if (panel === "people") return <PeoplePanel state={state} mutate={mutate} openDetail={openDetail} />;
  return <MorePanel state={state} openOverlay={openOverlay} />;
}

function StoryPanel({ state, advanceStory, openCreate }: { state: GameState; advanceStory: (choiceId: string) => void; openCreate: () => void }) {
  const node = currentStoryNode(state);
  const blocks = visibleBlocks(state);
  const choices = visibleChoices(state).map((choice) => state.created ? choice : { ...choice, enabled: false, disabledHint: "请先建立角色，再以出身进入故事。" });
  return <article className="story-panel story-runtime">
    <header className="story-kicker"><span>{node.chapter.replace("ACT", "第")}</span><small>{node.presentation === "prologue" ? "卷首" : "剧情节点"}</small></header>
    {!state.created && <div className="story-create"><b>以你的出身进入杳湾</b><button className="ink-button" onClick={openCreate}>建立角色</button></div>}
    <div className="story-blocks">{blocks.map((block, index) => block.type === "dialogue" ? <blockquote key={`${node.id}-${index}`}><cite>{displayCharacterName(block.speaker ?? "")}</cite><p>{interpolate(state, block.text)}</p></blockquote> : block.type === "system" ? <aside key={`${node.id}-${index}`} className="story-system">{interpolate(state, block.text)}</aside> : <p key={`${node.id}-${index}`} className={block.type === "conditional" ? "story-echo" : ""}>{interpolate(state, block.text)}</p>)}</div>
    <div className="choices story-choices">{choices.map((choice, index) => <button key={choice.id} className={!choice.enabled ? "locked" : ""} disabled={!choice.enabled} onClick={() => advanceStory(choice.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{choice.label}</b><small>{choice.sourceTag ? `线索：${choice.sourceTag}` : choice.enabled ? "推进故事" : choice.disabledHint ?? "条件尚未满足"}</small></div><i>{choice.enabled ? "→" : "—"}</i></button>)}</div>
  </article>;
}

function MapPanel({ state }: { state: GameState }) {
  const places = [
    { name: "杳湾", tag: "起点", x: 49, y: 48 }, { name: "北滩无名尸", tag: "线索", x: 27, y: 29 }, { name: "东桑林", tag: "异象", x: 72, y: 26 }, { name: "旧盐井", tag: "深处", x: 68, y: 69 },
  ];
  return <div className="map-panel"><p>本章的行旅由剧情选择推进。舆图记录已经在故事中显形的地点与线索；当前所在：{state.location}。</p><div className="map-canvas">{places.map((p) => <button key={p.name} style={{ left: `${p.x}%`, top: `${p.y}%` }} disabled={p.name !== state.location}><i /><b>{p.name}</b><small>{p.name === state.location ? "当前" : p.tag}</small></button>)}</div><div className="legend"><span><i className="known" />已抵达</span><span><i />剧情线索</span><span><i className="locked-dot" />尚待剧情开启</span></div></div>;
}

function CodexPanel({ state, openDetail }: { state: GameState; openDetail: (card: DetailCard) => void }) {
  const categoryNames: Record<string, string> = { event: "异象", person: "人物", item: "器物", material: "材料", beast: "异兽", place: "地理" };
  const categories = [...new Set(blackRainContent.codex.map((entry) => entry.category))];
  const [category, setCategory] = useState(categories[0]);
  const entries = blackRainContent.codex.filter((entry) => entry.category === category).filter((entry) => (state.codexLayers?.[entry.id]?.length ?? 0) > 0);
  return <ArchiveBrowser label="山海志分类" categories={categories} categoryLabels={categoryNames} selectedCategory={category} setSelectedCategory={setCategory} emptyText="此类见闻尚未被记录。">
    {entries.map((entry) => {
      const unlocked = new Set(state.codexLayers?.[entry.id] ?? []);
      const layer = entry.layers.filter((candidate) => unlocked.has(candidate.id)).at(-1) ?? entry.layers[0];
      return <ArchiveRow key={entry.id} eyebrow={layer.sourceVoice} title={entry.title} note={`已获 ${unlocked.size}/${entry.layers.length} 层见闻`} onClick={() => openDetail({ eyebrow: `${categoryNames[entry.category] ?? entry.category} · ${layer.sourceVoice}`, title: entry.title, text: layer.text, source: `可信度：${layer.reliability}${layer.contradictions.length ? `；矛盾：${layer.contradictions.join(" / ")}` : ""}`, facts: [{ label: "已解锁层级", value: `${unlocked.size}/${entry.layers.length}` }, { label: "归类", value: categoryNames[entry.category] ?? entry.category }] })} />;
    })}
  </ArchiveBrowser>;
}

function InventoryPanel({ state, openDetail }: { state: GameState; openDetail: (card: DetailCard) => void }) {
  const categoryNames: Record<string, string> = { equipment: "装备", generic: "行旅", material: "材料", tool: "工具", clue: "线索", unique: "异物" };
  const genericEntries = Object.entries(state.itemQuantities ?? {}).filter(([id, quantity]) => id in genericItems && Number(quantity) > 0).map(([id, quantity]) => ({ id, name: genericItems[id], category: "generic", text: "出身携带的行旅物件。", quantity: Number(quantity) }));
  const categories = ["equipment", ...(genericEntries.length ? ["generic"] : []), ...new Set(blackRainContent.items.map((item) => item.category))];
  const [category, setCategory] = useState(categories[0]);
  const equipmentSlots = ["主手", "衣具", "护符"];
  const entries = category === "equipment"
    ? state.equipment.map((name, index) => ({ id: `equipment-${index}`, name, category: equipmentSlots[index], text: "已装备在身的行旅器物，可在剧情节点中响应条件。", quantity: 1 }))
    : category === "generic" ? genericEntries
    : blackRainContent.items.filter((item) => Number(state.itemQuantities?.[item.id] ?? 0) > 0).filter((item) => item.category === category).map((item) => ({ ...item, quantity: Number(state.itemQuantities?.[item.id] ?? 0) }));
  return <ArchiveBrowser label="行囊分类" categories={categories} categoryLabels={categoryNames} selectedCategory={category} setSelectedCategory={setCategory} emptyText="此类行囊尚未获得。">
    {entries.map((item) => <ArchiveRow key={item.id} eyebrow={category === "equipment" ? item.category : categoryNames[item.category] ?? item.category} title={item.name} note={`持有 ${item.quantity} 件`} onClick={() => {
      const content = itemById.get(item.id);
      const recognition = content?.recognitionStages[Math.max(0, Number(state.itemKnowledge?.[item.id] ?? 0) - 1)] ?? content?.recognitionStages[0];
      openDetail({ eyebrow: `${category === "equipment" ? item.category : categoryNames[item.category] ?? item.category} · 行囊`, title: recognition?.displayName ?? item.name, text: recognition?.text ?? item.text, source: content ? `来源：${content.origin}` : category === "generic" ? "来源：角色出身" : "当前已装备。", facts: [{ label: "数量", value: item.quantity }, { label: "物性", value: content?.properties?.join(" · ") ?? "装备" }, { label: "稀有度", value: content?.rarity ?? "常见" }] });
    }} />)}
  </ArchiveBrowser>;
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

function ArchiveRow({ eyebrow, title, note, onClick }: { eyebrow: string; title: string; note: string; onClick: () => void }) {
  return <button className="archive-row" onClick={onClick}><span>{eyebrow}</span><b>{title}</b><small>{note}</small><i>查看</i></button>;
}

function MorePanel({ state, openOverlay }: { state: GameState; openOverlay: (o: OverlayId) => void }) {
  const activeQuests = blackRainContent.quests.filter((quest) => state.activeQuests?.includes(quest.id));
  return <div className="more-panel">{activeQuests.length > 0 && <section className="quest-summary"><small>进行中的任务</small>{activeQuests.map((quest) => <article key={quest.id}><b>{quest.name}</b><p>{quest.summary}</p></article>)}</section>}<button onClick={() => openOverlay("saves")}><b>存档与迁移</b><span>自动存档、手动槽、导入与导出</span></button><button onClick={() => openOverlay("settings")}><b>阅读与无障碍</b><span>字号、行距、对比度与减弱动效</span></button><button onClick={() => openOverlay("help")}><b>系统说明</b><span>剧情内容、平台边界与快捷操作</span></button><div className="event-log"><h3>最近记录</h3>{state.log.map((x, i) => <p key={`${x}-${i}`}>{x}</p>)}</div></div>;
}

function DetailCardModal({ card, close }: { card: DetailCard; close: () => void }) {
  return <div className="modal-backdrop detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal detail-card" role="dialog" aria-modal="true" aria-labelledby="detail-card-title"><button className="close" onClick={close} aria-label="关闭详情">×</button><small className="detail-eyebrow">{card.eyebrow}</small><h2 id="detail-card-title">{card.title}</h2><p>{card.text}</p>{card.facts && <dl className="detail-facts">{card.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}<footer>{card.source}</footer>{card.action && <button className="ink-button detail-action" onClick={() => { card.action?.run(); close(); }}>{card.action.label}</button>}</section></div>;
}

function Modal({ type, close, state, setState, settings, setSettings, downloadSave, importRef, setNotice }: { type: Exclude<OverlayId, null>; close: () => void; state: GameState; setState: (s: GameState) => void; settings: Settings; setSettings: (s: Settings) => void; downloadSave: () => void; importRef: React.RefObject<HTMLInputElement | null>; setNotice: (s: string) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true" aria-label="游戏弹窗"><button className="close" onClick={close}>×</button>
    {type === "create" && <CharacterCreator state={state} complete={(draft) => { const entered = enterCurrentNode(createInitialState(draft)); setState(entered.state); saveGame(entered.state); setNotice(entered.notes.join(" · ") || `${draft.name}已在天地间留下名字`); close(); }} />}
    {type === "settings" && <SettingsPanel value={settings} setValue={setSettings} />}
    {type === "saves" && <SavePanel state={state} setState={setState} download={downloadSave} importNow={() => importRef.current?.click()} setNotice={setNotice} />}
    {type === "help" && <HelpPanel />}
  </section></div>;
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
  return <div className="settings-panel"><span className="eyebrow">ACCESSIBILITY · 阅读</span><h2>阅读与感官设置</h2><label>正文字号 <b>{Math.round(value.fontScale * 100)}%</b><input type="range" min="0.9" max="1.3" step="0.05" value={value.fontScale} onChange={(e) => setValue({ ...value, fontScale: Number(e.target.value) })} /></label><label>正文行距 <b>{value.lineHeight.toFixed(1)}</b><input type="range" min="1.5" max="2.2" step="0.1" value={value.lineHeight} onChange={(e) => setValue({ ...value, lineHeight: Number(e.target.value) })} /></label><label>环境音量 <b>{value.ambientVolume}%</b><input type="range" min="0" max="100" value={value.ambientVolume} onChange={(e) => setValue({ ...value, ambientVolume: Number(e.target.value) })} /></label><button className={`toggle ${value.highContrast ? "on" : ""}`} onClick={() => setValue({ ...value, highContrast: !value.highContrast })}><span>高对比阅读</span><i /></button><button className={`toggle ${value.reducedMotion ? "on" : ""}`} onClick={() => setValue({ ...value, reducedMotion: !value.reducedMotion })}><span>减弱界面动效</span><i /></button></div>;
}

function SavePanel({ state, setState, download, importNow, setNotice }: { state: GameState; setState: (s: GameState) => void; download: () => void; importNow: () => void; setNotice: (s: string) => void }) {
  const slots = ["manual-1", "manual-2", "manual-3"];
  return <div className="save-panel"><span className="eyebrow">LOCAL FIRST · 本地存档</span><h2>命数留痕</h2><div className="auto-save"><div><small>自动存档</small><b>{state.player.name} · {state.location}</b><span>{state.lastSavedAt ? new Date(state.lastSavedAt).toLocaleString("zh-CN") : "尚未写入"}</span></div><button onClick={() => { const e = saveGame(state); setState(e.payload); setNotice("自动存档已更新"); }}>覆写</button></div>{slots.map((slot, i) => <div className="save-slot" key={slot}><span>{i + 1}</span><div><b>手动命数槽 {i + 1}</b><small>可写入当前状态或读取已有记录</small></div><button onClick={() => { const e = saveGame(state, slot); setState(e.payload); setNotice(`命数槽 ${i + 1} 已写入`); }}>存</button><button onClick={() => { try { const e = loadGame(slot); if (e) { setState(e.payload); setNotice(`命数槽 ${i + 1} 已读取`); } else setNotice("此命数槽尚为空"); } catch { setNotice("存档损坏，未覆盖当前进度"); } }}>读</button></div>)}<div className="save-actions"><button onClick={download}>导出 JSON</button><button onClick={importNow}>导入 JSON</button></div><p>存档保存在当前浏览器设备。本版本不接入账号、云同步或第三方服务。</p></div>;
}

function HelpPanel() { return <div className="help-panel"><span className="eyebrow">ABOUT · 系统说明</span><h2>这是一册会记得你的书</h2><p>当前版本已加载第一卷《黑雨》v{blackRainContent.manifest.contentVersion}：剧情按节点呈现，选择会写入本地存档并解锁对应的任务、物品、关系与山海志见闻。</p><div><b>当前内容来源</b><span>仅读取“剧情/第一卷_黑雨/第一章_黑雨”的内容包与正文；备份目录不会参与游戏加载。</span></div><div><b>后续平台化</b><span>领域状态不直接依赖浏览器界面；存档与平台服务经适配层隔离，可在后续对接微信小游戏的文件、触摸、音频与生命周期 API。</span></div><small>剧情内容更新后，以内容包的 manifest 版本和当前节点 ID 为准重新载入。</small></div>; }
