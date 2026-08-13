"use client";

import { useEffect, useRef, useState } from "react";
import { codexEntries, createInitialState, flaws, natures, origins } from "./gameData";
import { exportSave, importSave, loadGame, readSettings, saveGame, writeSettings } from "./storage";
import { browserPlatform } from "./platform";
import type { CharacterDraft, GameState, OverlayId, PanelId, Settings } from "./types";

const defaultSettings: Settings = { fontScale: 1, lineHeight: 1.85, highContrast: false, reducedMotion: false, ambientVolume: 35 };

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
  const [settings, setSettings] = useState(defaultSettings);
  const [notice, setNotice] = useState("系统演示模式 · 第一卷内容待接入");
  const [selectedCodex, setSelectedCodex] = useState(codexEntries[0].id);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSettings(readSettings(defaultSettings));
        const saved = loadGame();
        if (saved) setState(saved.payload);
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

  function downloadSave() {
    browserPlatform.files.exportText(`天地未定_${state.player.name}_${new Date().toISOString().slice(0, 10)}.json`, exportSave(state));
    setNotice("存档已导出到本机");
  }

  async function receiveImport(file?: File) {
    if (!file) return;
    try { const next = importSave(await file.text()); setState(next); setNotice("存档导入成功，原存档已保留"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "存档导入失败"); }
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <button className="brand" aria-label="返回卷册" onClick={() => setPanel("story")}>
          <span className="brand-seal">异</span><span><strong>山海异闻录</strong><small>天地未定</small></span>
        </button>
        <div className="chapter-marker"><span>卷一</span><strong>未写之章</strong><em>内容待接入</em></div>
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
            <span className="eyebrow">SYSTEM PREVIEW · 系统预演</span>
            <h1>{panel === "story" ? "静候一场黑雨" : navItems.find((x) => x.id === panel)?.label}</h1>
            <div className="brush-rule"><i /></div>
          </div>
          <Panel panel={panel} state={state} selectedCodex={selectedCodex} setSelectedCodex={setSelectedCodex} mutate={mutate} openOverlay={setOverlay} />
        </section>
        <SideRail panel={panel} setPanel={setPanel} state={state} />
      </section>

      <nav className="mobile-nav" aria-label="主要功能">
        {navItems.slice(0, 5).map((item) => <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}
      </nav>

      <div className="toast" role="status"><span />{notice}</div>
      {overlay && <Modal type={overlay} close={() => setOverlay(null)} state={state} setState={setState} settings={settings} setSettings={setSettings} downloadSave={downloadSave} importRef={importRef} setNotice={setNotice} />}
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

function Panel({ panel, state, selectedCodex, setSelectedCodex, mutate, openOverlay }: { panel: PanelId; state: GameState; selectedCodex: string; setSelectedCodex: (id: string) => void; mutate: (l: string, f: (s: GameState) => GameState) => void; openOverlay: (o: OverlayId) => void }) {
  if (panel === "story") return <StoryPanel state={state} mutate={mutate} openCreate={() => openOverlay("create")} />;
  if (panel === "map") return <MapPanel mutate={mutate} />;
  if (panel === "codex") return <CodexPanel selected={selectedCodex} setSelected={setSelectedCodex} />;
  if (panel === "inventory") return <InventoryPanel state={state} mutate={mutate} />;
  if (panel === "people") return <PeoplePanel state={state} mutate={mutate} />;
  return <MorePanel state={state} openOverlay={openOverlay} />;
}

function StoryPanel({ state, mutate, openCreate }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void; openCreate: () => void }) {
  return <div className="story-panel">
    <p className="lead">雨还没有落下。</p>
    <p>第一卷《黑雨》的剧情节点、人物对白与正式关卡将由后续内容包接入。这里暂不替故事作主，只展示游戏系统如何承接一段尚未写下的神话。</p>
    <div className="empty-chapter"><span className="giant-one">一</span><div><small>第一章 · 内容席位</small><h3>等待故事抵达</h3><p>StoryNode、选择条件、状态效果与余响接口均已预留。补充内容后无需重做界面和存档结构。</p></div></div>
    <div className="system-callout"><b>可先试玩系统</b><p>建立角色后，可在舆图、山海志、行囊与人物页体验探索消耗、材料认知、装备、关系和世界状态反馈。</p></div>
    <div className="choices">
      {!state.created && <button onClick={openCreate}><span>01</span><div><b>建立你的凡人</b><small>选择出身、天性与缺陷</small></div><i>→</i></button>}
      <button onClick={() => mutate("你在空白卷页边写下了一个记号", (s) => ({ ...s, world: { ...s.world, "volume.one.marked": true } }))}><span>{state.created ? "01" : "02"}</span><div><b>触摸空白卷页</b><small>测试一次可追踪的世界状态变化</small></div><i>→</i></button>
      <button className="locked" disabled><span>锁</span><div><b>踏入黑雨</b><small>需要：第一卷内容包</small></div><i>—</i></button>
    </div>
    {Boolean(state.world["volume.one.marked"]) && <p className="echo">余响：纸面纤维记住了你的指温。等故事到来时，这个记号仍会在。</p>}
  </div>;
}

function MapPanel({ mutate }: { mutate: (l: string, f: (s: GameState) => GameState) => void }) {
  const places = [
    { name: "卷一入口", tag: "已知", x: 49, y: 48 }, { name: "北岸荒径", tag: "传闻", x: 26, y: 30 }, { name: "雾中旧祠", tag: "未明", x: 71, y: 26 }, { name: "赤水渡口", tag: "锁定", x: 68, y: 69 },
  ];
  return <div className="map-panel"><p>地点以道路、时辰、天气和认知相连。当前为系统预演图，不包含第一章正式地名与事件。</p><div className="map-canvas">{places.map((p) => <button key={p.name} style={{ left: `${p.x}%`, top: `${p.y}%` }} disabled={p.tag === "锁定"} onClick={() => mutate(`你前往了${p.name}，时间推进至黄昏`, (s) => ({ ...s, location: p.name, period: "黄昏", resources: { ...s.resources, stamina: Math.max(0, s.resources.stamina - 1) } }))}><i /><b>{p.name}</b><small>{p.tag}</small></button>)}</div><div className="legend"><span><i className="known" />已知地点</span><span><i />传闻地点</span><span><i className="locked-dot" />条件未满足</span></div></div>;
}

function CodexPanel({ selected, setSelected }: { selected: string; setSelected: (s: string) => void }) {
  const entry = codexEntries.find((x) => x.id === selected) ?? codexEntries[0];
  return <div className="codex-panel"><div className="codex-list">{codexEntries.map((item) => <button className={item.id === selected ? "active" : ""} onClick={() => setSelected(item.id)} key={item.id}><small>{item.category}</small><b>{item.title}</b><span>{item.level}</span></button>)}</div><article className="codex-page"><span className="seal-word">志</span><small>{entry.category} · {entry.level}</small><h2>{entry.title}</h2><p>{entry.text}</p><footer>记录来源：{entry.source}</footer><div className="layer-track"><b>初见</b><i className="on" /><b>传闻</b><i className={entry.level !== "初见记" ? "on" : ""} /><b>实证</b><i className={entry.level === "行证录" ? "on" : ""} /><b>洞彻</b></div></article></div>;
}

function InventoryPanel({ state, mutate }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void }) {
  const items = [
    { name: "烧不尽的灰", type: "未知材料", text: "触手温热，雨水冲不散。", action: "试着辨认" },
    { name: "粗陶水囊", type: "旅具", text: "装着一天的净水。", action: "饮用" },
    { name: "旧麻绳", type: "工具", text: "承重尚可，浸水后会变得难解。", action: "检查" },
  ];
  return <div className="inventory-panel"><div className="equipment-strip">{state.equipment.map((x, i) => <div key={x}><small>{["主手", "衣具", "护符"][i]}</small><b>{x}</b></div>)}</div><div className="item-grid">{items.map((item) => <article key={item.name}><span>{item.type}</span><h3>{item.name}</h3><p>{item.text}</p><button onClick={() => mutate(`${item.name}：${item.action}已执行`, (s) => item.name === "粗陶水囊" ? ({ ...s, resources: { ...s.resources, stamina: Math.min(10, s.resources.stamina + 1) } }) : s)}>{item.action}</button></article>)}</div></div>;
}

function PeoplePanel({ state, mutate }: { state: GameState; mutate: (l: string, f: (s: GameState) => GameState) => void }) {
  return <div className="people-panel"><p>关系不会压缩成一个“好感度”。系统演示暂以信任轴展示，正式角色卡将同时记录敬重、畏惧、债务与各自目标。</p>{Object.entries(state.relation).map(([name, value]) => <article key={name}><div className="npc-mark">{name[0]}</div><div><small>系统占位人物</small><h3>{name}</h3><p>{value > 1 ? "对你的言行已有记忆。" : "仍在观察你。"}</p></div><div className="relation"><span>信任 {value}</span><button onClick={() => mutate(`${name}记住了你守约的一次`, (s) => ({ ...s, relation: { ...s.relation, [name]: value + 1 } }))}>履行小约</button></div></article>)}</div>;
}

function MorePanel({ state, openOverlay }: { state: GameState; openOverlay: (o: OverlayId) => void }) {
  return <div className="more-panel"><button onClick={() => openOverlay("saves")}><b>存档与迁移</b><span>自动存档、手动槽、导入与导出</span></button><button onClick={() => openOverlay("settings")}><b>阅读与无障碍</b><span>字号、行距、对比度与减弱动效</span></button><button onClick={() => openOverlay("help")}><b>系统说明</b><span>设计口径、平台边界与快捷操作</span></button><div className="event-log"><h3>最近记录</h3>{state.log.map((x, i) => <p key={`${x}-${i}`}>{x}</p>)}</div></div>;
}

function Modal({ type, close, state, setState, settings, setSettings, downloadSave, importRef, setNotice }: { type: Exclude<OverlayId, null>; close: () => void; state: GameState; setState: (s: GameState) => void; settings: Settings; setSettings: (s: Settings) => void; downloadSave: () => void; importRef: React.RefObject<HTMLInputElement | null>; setNotice: (s: string) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="modal" role="dialog" aria-modal="true" aria-label="游戏弹窗"><button className="close" onClick={close}>×</button>
    {type === "create" && <CharacterCreator state={state} complete={(draft) => { const next = createInitialState(draft); setState(next); saveGame(next); setNotice(`${draft.name}已在天地间留下名字`); close(); }} />}
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

function HelpPanel() { return <div className="help-panel"><span className="eyebrow">ABOUT · 系统说明</span><h2>这是一册会记得你的书</h2><p>当前版本根据 V1.3 说明书实现浏览器与移动浏览器的界面、状态和交互骨架。第一章剧情特意留空，避免在正式内容到来前补写设定。</p><div><b>现已可用</b><span>角色创建 · 响应式三栏/单栏 · 探索消耗 · 认知图鉴 · 行囊装备 · 多轴关系预留 · 本地存档 · 导入导出 · 阅读设置</span></div><div><b>后续平台化</b><span>领域状态不直接依赖浏览器界面；存档与平台服务经适配层隔离，可在后续对接微信小游戏的文件、触摸、音频与生命周期 API。</span></div><small>快捷键与完整键盘流将在内容节点接入后随可达性测试一并冻结。</small></div>; }
