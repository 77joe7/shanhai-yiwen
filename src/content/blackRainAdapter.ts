import type {
  Choice,
  CodexContent,
  CommandBus,
  ContentPack,
  GameStateReader,
  ItemContent,
  QuestContent,
  StoryBlock,
  StoryNode
} from "./contracts.js";

export interface RenderedBlock extends StoryBlock {
  text: string;
}

export interface PresentedNode {
  id: string;
  title: string;
  presentation: string;
  blocks: RenderedBlock[];
  choices: Array<Choice & { enabled: boolean }>;
}

export class BlackRainContentAdapter {
  private readonly nodeById: Map<string, StoryNode>;
  private readonly itemById: Map<string, ItemContent>;
  private readonly questById: Map<string, QuestContent>;
  private readonly codexById: Map<string, CodexContent>;

  constructor(
    readonly pack: ContentPack,
    private readonly state: GameStateReader,
    private readonly commands: CommandBus
  ) {
    this.nodeById = new Map(pack.story.map((value) => [value.id, value]));
    this.itemById = new Map(pack.items.map((value) => [value.id, value]));
    this.questById = new Map(pack.quests.map((value) => [value.id, value]));
    this.codexById = new Map(pack.codex.map((value) => [value.id, value]));
  }

  enterNode(id: string): PresentedNode {
    const node = this.require(this.nodeById, id, "StoryNode");
    if (!(node.enterConditions ?? []).every((condition) => this.state.test(condition))) {
      throw new Error(`Enter conditions failed: ${id}`);
    }
    for (const effect of node.onEnterEffects ?? []) this.commands.dispatch(effect, id);
    return this.present(node);
  }

  choose(nodeId: string, choiceId: string): PresentedNode {
    const node = this.require(this.nodeById, nodeId, "StoryNode");
    const choice = node.choices.find((value) => value.id === choiceId);
    if (!choice) throw new Error(`Unknown choice: ${choiceId}`);
    if (!(choice.visibleWhen ?? []).every((condition) => this.state.test(condition))) {
      throw new Error(`Choice is hidden: ${choiceId}`);
    }
    if (!(choice.enabledWhen ?? []).every((condition) => this.state.test(condition))) {
      throw new Error(choice.disabledHint ?? `Choice is disabled: ${choiceId}`);
    }
    for (const cost of choice.costs ?? []) this.commands.dispatch(cost, choiceId);
    for (const effect of choice.effects ?? []) this.commands.dispatch(effect, choiceId);
    for (const effect of node.onExitEffects ?? []) this.commands.dispatch(effect, nodeId);
    return this.enterNode(choice.next);
  }

  getQuest(id: string): QuestContent {
    return this.require(this.questById, id, "Quest");
  }

  getRecognizedItem(id: string): ItemContent & { displayName: string; description: string } {
    const item = this.require(this.itemById, id, "Item");
    const unlocked = item.recognitionStages.filter((stage) =>
      this.state.test({ type: "itemRecognitionAtLeast", itemId: id, stage: stage.stage })
    );
    const stage = unlocked.at(-1) ?? item.recognitionStages[0];
    return { ...item, displayName: stage.displayName, description: stage.text };
  }

  getVisibleCodex(id: string): CodexContent {
    const entry = this.require(this.codexById, id, "CodexEntry");
    return {
      ...entry,
      layers: entry.layers.filter((layer) => layer.unlockRules.every((rule) => this.state.test(rule)))
    };
  }

  /** 导出供审稿、配音或纯阅读模式使用的线性正文；不代替运行时分支。 */
  buildReadableNovel(): string {
    return this.pack.story
      .map((node) => {
        const body = node.blocks
          .filter((block) => block.type !== "system")
          .map((block) => {
            const text = this.state.interpolate(block.text);
            return block.speaker ? `${block.speaker}：${text}` : text;
          })
          .join("\n\n");
        return `## ${node.title}\n\n${body}`;
      })
      .join("\n\n");
  }

  private present(node: StoryNode): PresentedNode {
    const blocks = node.blocks
      .filter((block) => (block.when ?? []).every((condition) => this.state.test(condition)))
      .map((block) => ({ ...block, text: this.state.interpolate(block.text) }));
    const choices = node.choices
      .filter((choice) => (choice.visibleWhen ?? []).every((condition) => this.state.test(condition)))
      .map((choice) => ({
        ...choice,
        enabled: (choice.enabledWhen ?? []).every((condition) => this.state.test(condition))
      }));
    return { id: node.id, title: node.title, presentation: node.presentation, blocks, choices };
  }

  private require<T>(map: Map<string, T>, id: string, type: string): T {
    const value = map.get(id);
    if (!value) throw new Error(`Unknown ${type}: ${id}`);
    return value;
  }
}
