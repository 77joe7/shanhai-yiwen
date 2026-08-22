"use client";

/**
 * living demo 八大展示区（说明书三、十一、十二、十三）。
 *
 * 1. TokenSwatches       色彩/字体/间距/形状/纹理/动效令牌画板 + 搜索 + 复制
 * 2. TypeRuler          六档字阶真实渲染 + 取值
 * 3. SpacingRuler       六档间距 + 形状/层次令牌真实像素
 * 4. ComponentGallery   12 组件逐一陈列全部状态（联动 demo 局部状态）
 * 5. Playground         状态机手动联动 + 行为日志
 * 6. A11yShowcase       44×44 触控 / 语义区域 / WCAG 双模式对比度实测 / 不唯色反例
 * 7. BreakpointSimulator frame 宽度实时重排 + 当前档标注
 * 8. IllustrationShowcase 插画承载（地图/人物/物品）+ 加载/缺失占位 + 风格锚定对照 + 装饰固定范围
 *
 * 所有取值一律来自 `tokens.ts`，对比度一律由 `contrast.ts` 实测算出，**不写死任何数值**。
 * 本文件严格对齐已验收的 T01–T04 真实导出：`./contrast` 的 `evaluateAllContrast`、
 * `./useDemoState` 的 `DemoStore`、`./controls` 的 `DemoControls`、`./../components` 桶导出。
 */

import { useMemo, type ReactNode } from "react";
import { useDesignSystem, DsViewportFrame } from "../DesignSystemRoot";
import {
  ALL_TOKENS,
  SPACE_TOKENS,
  SHAPE_TOKENS,
  TOKEN_GROUP_LABELS,
  TYPE_SCALE,
  BREAKPOINTS,
  resolveTokenValue,
  type TokenGroup,
} from "../tokens";
import {
  evaluateAllContrast,
  formatRatio,
  VERDICT_LABEL,
  type ContrastResult,
} from "./contrast";
import type { DemoStore } from "./useDemoState";
import {
  ActionButton,
  AppTopBar,
  ArchiveEvidenceCard,
  BackToLatestButton,
  BrushDivider,
  CharacterQuestDrawer,
  LocationCard,
  MapMarker,
  NarrativeBlock,
  SquareTag,
  StatusMeter,
  ThreatPanel,
  IllustrationFrame,
  type EvidenceStatus,
  type MarkerStatus,
  type DangerLevel,
  type NarrativeKind,
  type TagTone,
  type MarkerKind,
  type QuestItem,
  type WarningState,
} from "../components";

/** 展示区外壳：统一标题 + 说明 + 内容槽。 */
function Section({
  titleId,
  title,
  note,
  children,
}: {
  titleId: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="ds-section" aria-labelledby={titleId}>
      <div className="ds-section-head">
        <h2 className="ds-section-title ds-type-headline" id={titleId}>
          {title}
        </h2>
        {note !== undefined && note.length > 0 ? (
          <p className="ds-section-note ds-type-body-sm">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** 1. 令牌画板：按分组筛选 + 搜索 + 复制。 */
export function TokenSwatches({ demo }: { demo: DemoStore }) {
  const ds = useDesignSystem();
  const group = demo.tokenGroup;
  const query = ds.search.trim().toLowerCase();

  const tokens = useMemo(() => {
    return ALL_TOKENS.filter((token) => {
      if (group !== "all" && token.group !== group) return false;
      if (query.length > 0) {
        const haystack = `${token.label} ${token.varName} ${token.specRef}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [group, query]);

  const groupLabel = group === "all" ? "全部分组" : TOKEN_GROUP_LABELS[group as TokenGroup];

  return (
    <Section
      titleId="ds-tokens-title"
      title="设计令牌画板"
      note={`共 ${ALL_TOKENS.length} 条令牌，当前筛选：${groupLabel}；搜索「${ds.search || "（空）"}」命中 ${tokens.length} 条。所有值均由 tokens.ts 直出，点击「复制」即生成 CSS 变量声明。`}
    >
      <div className="ds-swatch-grid">
        {tokens.map((token) => (
          <div className="ds-swatch" key={token.varName}>
            <div
              className="ds-swatch-chip"
              style={
                token.group === "color" ? { background: `var(${token.varName})` } : undefined
              }
            >
              {token.group !== "color" ? (
                <span className="ds-type-label">{token.value}</span>
              ) : null}
            </div>
            <span className="ds-swatch-name ds-type-label">{token.label}</span>
            <code className="ds-swatch-var">{token.varName}</code>
            <code className="ds-swatch-value">var → {ds.tokenValue(token.varName)}</code>
            <span className="ds-swatch-ref ds-type-body-sm">{token.specRef}</span>
            <div className="ds-swatch-foot">
              <button
                type="button"
                className="ds-copy-btn ds-type-label"
                onClick={() => {
                  void ds.copyToken(
                    token.varName,
                    `${token.varName}: ${ds.tokenValue(token.varName)};`,
                  );
                }}
              >
                复制
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** 2. 字阶尺。 */
export function TypeRuler() {
  const ds = useDesignSystem();
  return (
    <Section
      titleId="ds-type-title"
      title="字阶尺"
      note="六档字阶均由 --ds-f-* 变量驱动；下方为真实渲染效果与取值，不写死任何像素。"
    >
      {TYPE_SCALE.map((entry) => (
        <div className="ds-type-row" key={entry.id}>
          <p className={entry.className}>{entry.label}：山海异闻录，天地未定。</p>
          <div className="ds-type-meta ds-type-label">
            <span>字号 {ds.tokenValue(entry.sizeVar)}</span>
            <span>字重 {ds.tokenValue(entry.weightVar)}</span>
            <span>行高 {ds.tokenValue(entry.lineHeightVar)}</span>
            {entry.letterSpacingVar !== undefined ? (
              <span>字距 {ds.tokenValue(entry.letterSpacingVar)}</span>
            ) : null}
            <span>字体栈 {ds.tokenValue(entry.familyVar)}</span>
          </div>
          <p className="ds-swatch-ref ds-type-body-sm">
            {entry.usage} · {entry.specRef}
          </p>
        </div>
      ))}
    </Section>
  );
}

/** 3. 间距与形状尺。 */
export function SpacingRuler() {
  const ds = useDesignSystem();
  return (
    <Section
      titleId="ds-space-title"
      title="间距与形状尺"
      note="间距六档与形状/层次令牌真实渲染；间距条宽度由对应 --ds-s-* 变量驱动。"
    >
      {SPACE_TOKENS.map((token) => (
        <div className="ds-space-row" key={token.varName}>
          <div className="ds-space-meta ds-type-label">
            <span>{token.label}</span>
            <span>{token.varName}</span>
            <span>{token.value}</span>
          </div>
          <div className="ds-space-visual">
            <span className="ds-space-bar" style={{ width: ds.tokenValue(token.varName) }} />
          </div>
          <p className="ds-swatch-ref ds-type-body-sm">{token.specRef}</p>
        </div>
      ))}
      <BrushDivider icon="category" label="形状与层次" />
      {SHAPE_TOKENS.map((token) => (
        <div className="ds-space-row" key={token.varName}>
          <div className="ds-space-meta ds-type-label">
            <span>{token.label}</span>
            <span>{token.varName}</span>
            <span>{token.value}</span>
          </div>
          <p className="ds-swatch-ref ds-type-body-sm">{token.specRef}</p>
        </div>
      ))}
    </Section>
  );
}

/** 4. 组件陈列：12 组件逐一陈列，状态实时联动 demo 局部状态。 */
export function ComponentGallery({ demo }: { demo: DemoStore }) {
  const ds = useDesignSystem();
  const evidenceStatus: EvidenceStatus = demo.evidenceStatus;
  const markerStatus: MarkerStatus = demo.markerStatus;
  const threatLevel: DangerLevel = demo.threatLevel;
  const narrativeKind: NarrativeKind = demo.narrativeKind;
  const lifeWarning: WarningState =
    demo.life < 25 ? "critical" : demo.life < 50 ? "warning" : "normal";
  const tagTones: TagTone[] = [
    "life",
    "stamina",
    "resolve",
    "nature",
    "gold",
    "cinnabar",
    "neutral",
    /* 稀有度 5 阶 */
    "rarity-common",
    "rarity-uncommon",
    "rarity-rare",
    "rarity-epic",
    "rarity-legendary",
    /* 人物关系 6 阶 */
    "rel-kin",
    "rel-ally",
    "rel-friendly",
    "rel-neutral",
    "rel-wary",
    "rel-hostile",
  ];
  /** 色板展示用的中文标签（避免原值裸显）。 */
  const TONE_LABEL: Partial<Record<TagTone, string>> = {
    life: "生命",
    stamina: "精力",
    resolve: "定力",
    nature: "自然",
    gold: "焦金",
    cinnabar: "朱砂",
    neutral: "中性",
    "rarity-common": "普通",
    "rarity-uncommon": "优良",
    "rarity-rare": "稀有",
    "rarity-epic": "史诗",
    "rarity-legendary": "传说",
    "rel-kin": "血亲",
    "rel-ally": "盟友",
    "rel-friendly": "友善",
    "rel-neutral": "中立",
    "rel-wary": "戒备",
    "rel-hostile": "敌对",
  };
  const markerKinds: MarkerKind[] = ["mountain", "city", "water", "clue", "danger", "shrine"];
  const quests: QuestItem[] = [
    { id: "q1", name: "查清残香来历", summary: "祠庙香灰有异", done: false },
    { id: "q2", name: "安顿季缨", summary: "她受了惊", done: true },
  ];
  const typewriterOn = ds.typewriter && !ds.reducedMotion;

  return (
    <Section
      titleId="ds-components-title"
      title="组件陈列 · 12 组件"
      note="全部组件均按说明书十一章属性/状态契约实现；状态切换实时联动右侧控制台与本区。"
    >
      <div className="ds-gallery">
        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">01 顶部栏 AppTopBar</h3>
            <span className="ds-type-label">十一.1</span>
          </div>
          <div className="ds-gallery-stage">
            <AppTopBar
              title="设计系统 v1"
              variant="back"
              loading={demo.topBarLoading}
              leftAction={{ label: "返回卷宗", icon: "←", onClick: () => demo.pushLog("返回卷宗") }}
              rightAction={{ label: "菜单", icon: "≡", onClick: () => demo.pushLog("打开菜单") }}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            加载态除颜色外显示「载入中」文字与闪动方块；左侧操作缺省保留等宽空位维持标题居中。
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">02 刷痕分隔 BrushDivider</h3>
            <span className="ds-type-label">十一.2</span>
          </div>
          <div className="ds-gallery-stage">
            <BrushDivider icon="diamond" label="摘要" />
            <BrushDivider icon="sun" label="行囊速览" />
            <BrushDivider label="无标记分隔" />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">两端透明、中部淡金的渐变细线，可带菱形/残日标记。</p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">03 叙事块 NarrativeBlock</h3>
            <span className="ds-type-label">十一.3</span>
          </div>
          <div className="ds-gallery-stage">
            <NarrativeBlock
              kind={narrativeKind}
              timeLabel="子时"
              locationLabel="残垣"
              text="雨丝斜织，檐角铜铃轻响。你听见墙后传来极轻的、像有人在低声数着什么的声音。"
              isLatest={true}
              typewriter={typewriterOn}
              key={demo.replayKey}
              onRevealAll={() => demo.pushLog("显示全文")}
            />
            <div className="ds-state-switcher">
              <ActionButton label={`重播（${narrativeKind}）`} onClick={demo.replayNarrative} />
            </div>
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            七类叙事版式；逐字播放约 33 字/秒，且始终提供「显示全文」出口（减弱动效时自动关闭）。
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">04 档案证据卡 ArchiveEvidenceCard</h3>
            <span className="ds-type-label">十一.4</span>
          </div>
          <div className="ds-gallery-stage">
            <ArchiveEvidenceCard
              icon="耳"
              title="无名香灰"
              category="物证"
              description="案头一撮灰，闻之有残香，像庙里供过又被人匆匆收起的那种。"
              knowledgeLevel={2}
              status={evidenceStatus}
              onClick={demo.cycleEvidence}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            点击切换 7 状态；状态差异由「中文+符号+边框」三要素表达，不唯色。当前：{evidenceStatus}
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">05 方括号标签 SquareTag</h3>
            <span className="ds-type-label">十一.5</span>
          </div>
          <div className="ds-gallery-stage">
            <div className="ds-colorreliance">
              {tagTones.map((tone) => (
                <SquareTag key={tone} label={TONE_LABEL[tone] ?? tone} tone={tone} />
              ))}
            </div>
            <SquareTag
              label="可交互"
              tone="gold"
              interactive
              selected={demo.selectedAction === "tag"}
              onClick={() => demo.selectAction("tag")}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">直角方括号；语义色一律附带文字标签，绝不唯色。</p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">06 状态条 StatusMeter</h3>
            <span className="ds-type-label">十一.6</span>
          </div>
          <div className="ds-gallery-stage">
            <StatusMeter
              label="生命"
              value={demo.life}
              max={100}
              tone="life"
              warningState={lifeWarning}
            />
            <StatusMeter label="精力" value={68} max={100} tone="stamina" />
            <StatusMeter label="定力" value={40} max={100} tone="resolve" />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            细方轨道+数值文本；生命跌破阈值追加「告急/危急」文字并加粗槽边框。
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">07 威胁面板 ThreatPanel</h3>
            <span className="ds-type-label">十一.7</span>
          </div>
          <div className="ds-gallery-stage">
            <ThreatPanel
              name="墙后的低语者"
              type="未知存在"
              intentText="它似乎在数着你的呼吸，等你松懈的那一刻。"
              life={48}
              stability={35}
              dangerLevel={threatLevel}
              knownWeakness="以残香诱其现形"
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            点击切换 6 等级；等级由「中文+符号+边框」表达。当前：{threatLevel}
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">08 行动按钮 ActionButton</h3>
            <span className="ds-type-label">十一.8</span>
          </div>
          <div className="ds-gallery-stage">
            <div className="ds-colorreliance">
              <ActionButton
                icon="剑"
                label="拔剑"
                onClick={() => demo.selectAction("拔剑")}
                selected={demo.selectedAction === "拔剑"}
              />
              <ActionButton
                icon="慎"
                label="谨慎靠近"
                dangerLevel="low"
                onClick={() => demo.selectAction("谨慎靠近")}
                selected={demo.selectedAction === "谨慎靠近"}
              />
              <ActionButton
                icon="危"
                label="引爆"
                dangerLevel="high"
                onClick={() => demo.selectAction("引爆")}
                selected={demo.selectedAction === "引爆"}
              />
              <ActionButton icon="锁" label="已锁" enabled={false} reason="需先取得钥匙" />
            </div>
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            直角、图标上文字下；危险须「危/慎」标记+边框加粗；禁用须给出可读原因，不靠灰色暗示。
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">09 地图标记 MapMarker</h3>
            <span className="ds-type-label">十一.9</span>
          </div>
          <div className="ds-gallery-stage">
            <div className="ds-colorreliance">
              {markerKinds.map((kind) => (
                <MapMarker
                  key={kind}
                  kind={kind}
                  name="示例地"
                  status={markerStatus}
                  onClick={demo.cycleMarker}
                />
              ))}
            </div>
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            点击循环 6 状态；状态由「中文+符号+边框」表达。当前：{markerStatus}
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">10 地点卡 LocationCard</h3>
            <span className="ds-type-label">十一.10</span>
          </div>
          <div className="ds-gallery-stage">
            <LocationCard
              name="残破祠庙"
              description="檐角塌了半边，香炉倒扣，地上散着几枚铜钱与一页湿透的符。"
              tags={["可采集", "线索"]}
              weather="细雨"
              time="子时"
              danger="有异动"
              availableActions={[
                { icon: "查", label: "搜查", onClick: () => demo.pushLog("搜查祠庙") },
                { icon: "取", label: "取铜钱", onClick: () => demo.pushLog("取铜钱") },
              ]}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">危险提示以「危险：xxx」文字+朱砂标签双线索表达。</p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">11 角色与任务抽屉 CharacterQuestDrawer</h3>
            <span className="ds-type-label">十一.11</span>
          </div>
          <div className="ds-gallery-stage">
            <button
              type="button"
              ref={demo.drawerTriggerRef}
              className="ds-action ds-transition"
              onClick={demo.openDrawer}
            >
              <span className="ds-action-label ds-type-label">展开角色与任务</span>
            </button>
            <CharacterQuestDrawer
              openState={demo.drawerOpen ? "open" : "closed"}
              onClose={demo.closeDrawer}
              playerSummary={
                <p className="ds-type-body-sm">你是一名走方郎中，背篓里装着半卷残破的《山海图》。</p>
              }
              activeQuests={quests}
              inventoryPreview={<p className="ds-type-body-sm">铜钱×3、残符×1、火折子×1</p>}
              quickLinks={<SquareTag label="图鉴" tone="gold" />}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            左滑进入、遮罩/Esc 关闭；关闭后焦点归还触发按钮（WCAG 2.4.3）。
          </p>
        </div>

        <div className="ds-gallery-card">
          <div className="ds-gallery-head">
            <h3 className="ds-type-headline-mobile">12 回到最新 BackToLatestButton</h3>
            <span className="ds-type-label">十一.12</span>
          </div>
          <div className="ds-gallery-stage">
            <BackToLatestButton
              visibleWhenAwayFromLatest={demo.awayFromLatest}
              unreadCount={demo.unreadCount}
              onClick={demo.backToLatest}
            />
          </div>
          <p className="ds-gallery-doc ds-type-body-sm">
            仅离开卷尾时出现；隐藏保留等高占位不跳动；未读以文字数字呈现，不靠色点。
          </p>
        </div>
      </div>
    </Section>
  );
}

/** 5. 交互联动：状态机手动切换 + 行为日志。 */
export function Playground({ demo }: { demo: DemoStore }) {
  return (
    <Section
      titleId="ds-playground-title"
      title="交互联动 · 状态机"
      note="下方按钮直接驱动 demo 局部状态，可观察上方组件区与控制台的实时联动；行为日志便于核对事件。"
    >
      <div className="ds-state-switcher">
        <ActionButton label={`证物 → ${demo.evidenceStatus}`} onClick={demo.cycleEvidence} />
        <ActionButton label={`标记 → ${demo.markerStatus}`} onClick={demo.cycleMarker} />
        <ActionButton label={`威胁 → ${demo.threatLevel}`} onClick={demo.cycleThreat} />
        <ActionButton
          label={`顶部栏加载：${demo.topBarLoading ? "开" : "关"}`}
          onClick={demo.toggleTopBarLoading}
        />
        <ActionButton
          label={`离开卷尾：${demo.awayFromLatest ? "是" : "否"}`}
          onClick={demo.toggleAwayFromLatest}
        />
        <ActionButton label="新增未读 +1" onClick={demo.addUnread} />
        <ActionButton label="重播叙事" onClick={demo.replayNarrative} />
      </div>
      <div className="ds-gallery-doc ds-type-body-sm">
        <p>行为日志（最近 {demo.log.length} 条）：</p>
        {demo.log.length > 0 ? (
          <ul>
            {demo.log.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        ) : (
          <p>暂无行为。点击上方任意控件即会记录。</p>
        )}
      </div>
    </Section>
  );
}

/** 6. 可访问性验收：触控/语义区域/WCAG 双模式对比度实测/不唯色反例。 */
export function A11yShowcase() {
  const ds = useDesignSystem();
  const contrastResults = useMemo<ContrastResult[]>(
    () => evaluateAllContrast((varName, highContrast) => resolveTokenValue(varName, { highContrast })),
    [],
  );
  const fails = contrastResults.filter(
    (result) => result.verdict === "fail" || result.verdictHighContrast === "fail",
  );

  return (
    <Section
      titleId="ds-a11y-title"
      title="可访问性验收"
      note="WCAG 2.2 AA：正文 4.5:1、大号文字 3:1、非文字线索 3:1。语义色达不到比例时须以文字/结构补偿（判定为「已补偿」而非失败）。"
    >
      <div className="ds-a11y-grid">
        <div className="ds-region-outline">
          <span className="ds-region-tag ds-type-label">语义区域</span>
          <p className="ds-type-body-sm">
            焦点顺序可预测；遮罩/Esc 关闭抽屉后焦点回归触发者（见组件 11）。
          </p>
        </div>
        <div
          className="ds-touch-outline"
          style={{ minHeight: "var(--ds-sh-touch-min)", display: "flex", alignItems: "center", padding: "0 var(--ds-s-gutter)" }}
        >
          <span className="ds-type-label">44×44 触控目标</span>
        </div>
      </div>

      <BrushDivider icon="category" label="对比度双模式实测" />

      <p className="ds-type-body-sm">
        共 {contrastResults.length} 组前景/背景组合，失败（不达标且无补偿）{fails.length} 组。
        切换「高对比模式」后右侧列比例随之提升。
      </p>

      <table className="ds-table">
        <thead>
          <tr>
            <th>组合</th>
            <th>用途</th>
            <th>常规</th>
            <th>高对比</th>
            <th>阈值</th>
            <th>判定（常规 / 高对比）</th>
          </tr>
        </thead>
        <tbody>
          {contrastResults.map((result) => (
            <tr key={result.pair.id}>
              <td>{result.pair.label}</td>
              <td>{result.pair.kind}</td>
              <td
                className={
                  result.verdict === "fail"
                    ? "ds-contrast-fail"
                    : result.verdict === "pass"
                      ? "ds-contrast-pass"
                      : undefined
                }
              >
                {formatRatio(result.ratio)}
              </td>
              <td
                className={
                  result.verdictHighContrast === "fail"
                    ? "ds-contrast-fail"
                    : result.verdictHighContrast === "pass"
                      ? "ds-contrast-pass"
                      : undefined
                }
              >
                {formatRatio(result.ratioHighContrast)}
              </td>
              <td>{result.minRatio}:1</td>
              <td>
                {VERDICT_LABEL[result.verdict]} / {VERDICT_LABEL[result.verdictHighContrast]}
                {result.pair.mitigation !== undefined
                  ? `（补偿：${result.pair.mitigation}）`
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <BrushDivider icon="category" label="语义色「不唯色」反例开关" />
      <p className="ds-type-body-sm">
        顶部「语义色附加文字」开关关掉后，带 <code>ds-cue-text</code> 类的文字线索会被隐藏（见下方），
        用以自证「仅靠颜色」不可接受；打开时所有语义状态都带可读文字。
      </p>
      <div className="ds-colorreliance">
        <SquareTag label="生命" tone="life" />
        <span className="ds-cue-text ds-type-label">← 这是语义文字线索，关掉附加文字后消失</span>
      </div>
    </Section>
  );
}

/** 7. 断点模拟器：frame 宽度实时重排。 */
export function BreakpointSimulator({ demo }: { demo: DemoStore }) {
  const ds = useDesignSystem();
  const bp = ds.activeBreakpoint;
  return (
    <Section
      titleId="ds-breakpoint-title"
      title="断点模拟器"
      note="frame 宽度由控制台「断点预设 / 自由宽度」驱动；内部以容器查询（@container dsframe）重排，不改动真实 window。"
    >
      <p className="ds-type-body-sm">
        当前 {bp.label}档（{bp.min}—{bp.max}px）：{bp.layout}
      </p>
      <DsViewportFrame width={ds.frameWidth} label={`${bp.label}档 · ${ds.frameWidth}px`}>
        <AppTopBar
          title="赤崖"
          variant="default"
          leftAction={{ label: "返回", icon: "←", onClick: () => demo.pushLog("返回") }}
          rightAction={{ label: "菜单", icon: "≡", onClick: () => demo.pushLog("菜单") }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ds-s-stack-sm)",
            padding: "var(--ds-s-stack-sm)",
          }}
        >
          <NarrativeBlock kind="narration" text="山风掠过赤崖，远处有鹰鸣。" isLatest />
          <div style={{ display: "flex", gap: "var(--ds-s-stack-sm)", flexWrap: "wrap" }}>
            <ActionButton icon="查" label="探查" />
            <ActionButton icon="回" label="返回" />
          </div>
        </div>
      </DsViewportFrame>
      <p className="ds-type-body-sm">
        预设：
        {BREAKPOINTS.map((breakpoint) =>
          breakpoint.id === "free"
            ? "自由拖动(360—1600)"
            : `${breakpoint.label}(${breakpoint.min}—${breakpoint.max})`,
        ).join(" · ")}
      </p>
    </Section>
  );
}

/** 8. 插画与装饰承载：地图/人物/物品范例 + 加载/缺失占位 + 风格锚定对照 + 装饰固定范围。 */
export function IllustrationShowcase() {
  return (
    <Section
      titleId="ds-illu-title"
      title="插画与装饰 · 承载规范"
      note="插画（地图/人物/物品）由 IllustrationFrame 统一承载；设计系统固定「承载与风格」，业务方固定「画面内容」。下方范例插画取色与令牌一致，仅为示意。"
    >
      <div className="ds-illu-row">
        <IllustrationFrame
          kind="map"
          alt="赤崖舆图：标注山道、祠庙与一处异动标记"
          caption="舆图 · 4:3"
          src={SAMPLE_MAP}
          aspectRatio="4 / 3"
        />
        <IllustrationFrame
          kind="character"
          alt="走方郎中角色立绘：背负药篓"
          caption="人物立绘 · 3:4"
          src={SAMPLE_CHAR}
          aspectRatio="3 / 4"
        />
        <IllustrationFrame
          kind="item"
          alt="无名香灰物证：一撮残香"
          caption="物品 · 1:1"
          src={SAMPLE_ITEM}
          aspectRatio="1 / 1"
        />
      </div>

      <BrushDivider icon="category" label="加载与缺失占位" />
      <div className="ds-illu-row">
        <IllustrationFrame
          kind="map"
          alt="远景舆图（资源尚未就绪）"
          loading
          caption="加载态 · 骨架 + 文字，不唯色"
        />
        <IllustrationFrame
          kind="item"
          alt="失落的铜符（资源缺失）"
          failed
          caption="缺失态 · 仍显示 alt 文字"
        />
      </div>

      <BrushDivider icon="category" label="风格锚定约束" />
      <ul className="ds-illu-rules">
        <li>取色：插画色板必须源自令牌（朱砂 / 焦金 / 冷月蓝 / 苔绿…），不得出现游离色。</li>
        <li>笔触：湿墨·宣纸感，与刷痕纹理一致；衬底统一 surface，不靠换图闪变。</li>
        <li>可达性：含信息文字的插画须达 WCAG 2.2 AA；必须提供 alt 语义描述（不唯色）。</li>
        <li>资源：路径经资源映射层访问，禁止硬编码（为微信小游戏迁移留平台边界）。</li>
      </ul>
      <p className="ds-illu-bad">✗ 反例：插画出现令牌外游离色（如 #00E5FF），禁止。</p>

      <BrushDivider icon="category" label="装饰元素固定范围" />
      <p className="ds-type-body-sm">
        已固化为令牌 / 组件、业务方不得自创：刷痕纹理（TEXTURE_TOKENS）、刷痕分隔（BrushDivider）、
        描边（outline / outline-variant）、圆角与阴影（SHAPE_TOKENS，禁用厚阴影）、焦点环
        （2px 环 + 3px 偏移，44×44 触控）、受控图标集（线性·湿墨风）。
      </p>
    </Section>
  );
}

/* 范例插画（仅 demo 示意，取色与令牌一致：bg #17130F / surface #39342F #2E2925 #1F1B17 /
 * gold #F5D294 / cinnabar #920703 / on-surface #EAE1DA）。设计系统本身不内置任何美术资源。 */
const SAMPLE_MAP = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#17130F'/><g fill='none' stroke='#F5D294' stroke-opacity='0.25'><path d='M0 75 H400 M0 150 H400 M0 225 H400 M100 0 V300 M200 0 V300 M300 0 V300'/></g><path d='M40 250 L120 150 L200 250 Z' fill='#39342F'/><path d='M180 250 L260 120 L340 250 Z' fill='#2E2925'/><circle cx='260' cy='120' r='8' fill='#920703'/><circle cx='120' cy='150' r='5' fill='#F5D294'/></svg>",
)}`;

const SAMPLE_CHAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><rect width='300' height='400' fill='#17130F'/><g fill='#EAE1DA' fill-opacity='0.85'><circle cx='150' cy='110' r='46'/><path d='M70 400 C70 250 110 180 150 180 C190 180 230 250 230 400 Z'/></g><path d='M150 64 L150 156' stroke='#F5D294' stroke-width='3'/></svg>",
)}`;

const SAMPLE_ITEM = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><rect width='300' height='300' fill='#1F1B17'/><path d='M90 110 Q150 60 210 110 L210 200 Q150 240 90 200 Z' fill='#F5D294' fill-opacity='0.9'/><path d='M150 110 L150 200' stroke='#17130F' stroke-width='3'/><circle cx='150' cy='150' r='10' fill='#920703'/></svg>",
)}`;
