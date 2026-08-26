# 成品目标

targetFinish: polished-vertical-slice
buildStage: whitebox
buildPath: custom

- 目标平台：桌面浏览器与手机浏览器。
- 目标交付物：现有《山海异闻录》单页视觉交互预览中的可试玩遭遇流程。
- 输入：鼠标、键盘与单点触控。
- 本轮范围：只验证交互、流程状态和视觉反馈；不定义属性、伤害、掉落、经验、概率、存档写入或正式结算。

# 必读设计

- `game-adaptations/black-rain-v6/design/GAME_DESIGN.md`
- `game-adaptations/black-rain-v6/design/ART_DIRECTION.md`

# 必须保真

- 玩家从剧情内的异常提示进入遭遇，而不是从独立的“行游选择”页面进入。
- 固定流程：剧情预兆 → 迎战或尝试撤离 → 战斗动作反馈 → 预览胜利/失败或撤离 → 回到剧情并显示余响。
- 遭遇中的返回、底部导航和其他离开路径在未结算前不可绕过；只有胜利、失败或撤离能结束流程。
- 视觉反馈以黑雨、井口、湿墨、灯火和记录余响为锚点；不能把战斗做成数值评分或正式奖励系统。
- 界面语言使用“痕迹、记录、余响、预览结算”，不暗示尚未存在的正式规则已生效。

# 可执行模型

- 最大风险：玩家能否理解“遭遇从剧情发生、必须结算后才回到剧情”的闭环，而不依赖战斗数值。
- 原型形态：叙事场景上的有限状态机。
- 最小状态：`idle`、`prompt`、`battle`、`resolved`；结算结果为 `escaped`、`won` 或 `lost`。
- 动作：打开遭遇、迎战、尝试撤离、攻击、术法、防御、物件、预览胜利、预览失败、返回剧情、重新演示。
- 前置：只有 `prompt` 可选择迎战/撤离；只有 `battle` 可提交战斗动作或预览结算；只有 `resolved` 可显示剧情余响。
- 效果：只更新内存中的流程状态、战报文本和剧情余响，不改写剧情包、物件归属、角色属性或存档。
- 不变量：流程未结算时不得通过返回或导航离开；撤离不生成战利品/奖励；所有结算均明确标注为预览。
- contentRevision: `UI-preview-v1.2`
- rulesRevision: `encounter-whitebox-v1`
- saveSchemaVersion: `NOT_APPLICABLE: 本轮不写入存档`
- seed: `NOT_APPLICABLE: 本轮不使用随机结算`

## 固定验证路径

1. 初态：行游剧情页，看到“井中伏影”遭遇预兆。
2. 输入：打开预兆，选择“迎战”，执行至少一个战斗动作，点击“预览胜利”。
3. 预期：战斗页留在单页可读区域；胜利后返回剧情，显示“遭遇余响”，没有数值或奖励写入。
4. 相邻反例：在遭遇提示选择“尝试撤离”，应直接返回剧情并显示“未生成战利品或奖励”；战斗未结算时点击返回，页面不得离开遭遇。

# 范围

包含：主页压缩为单页；“继续角色 → 角色卡 → 保存点 → 行游”的预览流程（最多十个保存点）；原生可用的舆图与底部导航、正方形行囊格、剧情触发的遭遇流程、转场/待机/按压/结算反馈。

明确排除：伤害、血量、怒气、法术消耗、逃跑概率、敌我属性、经验、装备掉落、随机性、真实存档读取/提交、真实地图数据和服务端校验。

# 运行与验证

toolchain:
  targetPlatform: 桌面浏览器与手机浏览器
  targetRuntime: 本地静态 HTML 预览
  testedRuntime: `http://127.0.0.1:8765/` 的 iPhone 15 模拟视口
  engine: 浏览器原生 HTML/CSS/JavaScript
  engineVersion: NOT_APPLICABLE
  runtimeVersion: NOT_APPLICABLE
  packageManager: none

commands:
  install: NONE
  buildOrExport: NONE
  start: `python -m http.server 8765`（在预览 HTML 目录）
  modelCheck: 浏览器固定路径点击与 DOM 状态检查
  verify: NOT_APPLICABLE

verification:
  owner: design owner
  evidence: 本轮浏览器可回放的固定路径与 DOM 观察；不生成 `qa/verification.json`。

# 当前限制

- 本轮为交互白盒，不构成正式战斗系统或数值设计。
- 移动浏览器真实触控、前后台恢复、性能和微信小游戏迁移尚未在真机验证。
