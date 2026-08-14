# 第一幕《雨至》与第二幕《三影》分支剧情脚本说明

> 配套代码：`app/game/branching/`（types / acts / engine / backup / index）。
> 校验脚本：`scripts/verify-branching.ts`（`node --experimental-strip-types scripts/verify-branching.ts`，已全绿）。
> 本脚本为与受控内容包并列的"分支剧情参考实现"，未覆盖/改写 `剧情/第一卷_黑雨/` 下的既有 JSON。

## 设计约束落实

| 需求 | 落实方式 |
|---|---|
| 每决策节点可选项 ≤3 | 数据中每个节点 `choices` 数组长度 ≤3；`engine.validate()` 静态强制，超限报 error |
| 选项显式编号，便于修改 | 每个选项带 `no`（1..3），渲染与定位均以此为准 |
| 多分支、避免单一结局 | 第一幕三条路线 + 幕终"承诺角色"；第二幕于北滩分**三后果轴**（羿箭 / 迟日 / 含晦），互不汇流 |
| 触发条件明确 | 选项 `visibleWhen` 谓词（flagTrue / flagFalse / anyFlagTrue 等） |
| 两幕连贯 + 交叉影响 | 第一幕 flag 经 `visibleWhen` 改变第二幕入口与可见分支（见末节映射表） |

## 节点总览（18 节点）

第一幕 10 节点：`A1-START → A1-SHED/A1-FERRY/A1-GRANARY → A1-MID → A1-WELL/A1-WATCH/A1-BEACH → A1-END(幕终)`
第二幕 8 节点：`A2-CHRONICLE/A2-FERRY/A2-SOLO → A2-SHORE → A2-ARROW/A2-SHADOWS/A2-SALT → A2-END(幕终) → A2-DONE(卷终)`

---

## 第一幕《雨至》

### A1-START「雨脚」　（起点，无触发条件）
**描述**：黑雨落下，玩家立于杳湾村口，三处灯（记历棚/渡口/粮仓）亮着。
**选项（3）**：
1. `A1-START-c1` 躲进记历棚，找砚伯 → `A1-SHED`｜设 `metYanbo`
2. `A1-START-c2` 沿河去渡口，找宿沙 → `A1-FERRY`｜设 `metSusha`
3. `A1-START-c3` 去粮仓问有没有空屋 → `A1-GRANARY`｜设 `metQingya`

### A1-SHED「砚伯的棚」　（触发：由 A1-START-c1 抵达）
**描述**：砚伯在抄雨谱，提及"老井今早开始哭"。
**选项（3）**：
1. `A1-SHED-c1` 帮他抄录雨谱 → `A1-MID`｜设 `helpChronicle`、`knowWellHistory`
2. `A1-SHED-c2` 追问黑雨的来历 → `A1-MID`｜设 `seekOrigin`
3. `A1-SHED-c3` 只躲雨，不掺和 → `A1-MID`｜设 `aloof`

### A1-FERRY「渡口」　（触发：由 A1-START-c2 抵达）
**描述**：宿沙系缆，桩子被冲松；叮嘱"别碰舱里那卷东西"。
**选项（3）**：
1. `A1-FERRY-c1` 帮他修被冲坏的缆桩 → `A1-MID`｜设 `helpFerry`
2. `A1-FERRY-c2` 问他河对岸有什么 → `A1-MID`｜设 `seekRiver`
3. `A1-FERRY-c3` 趁他转身，偷看舱里那卷东西 → `A1-MID`｜设 `snoop`；`relation.NPC-SUSHA -1`

### A1-GRANARY「粮仓」　（触发：由 A1-START-c3 抵达）
**描述**：青芽盘点存粮，担心雨坏粮。
**选项（3）**：
1. `A1-GRANARY-c1` 帮她清点存粮 → `A1-MID`｜设 `helpGranary`
2. `A1-GRANARY-c2` 提醒她雨会坏粮 → `A1-MID`｜设 `warnGrain`
3. `A1-GRANARY-c3` 趁她低头，顺手拿块饼 → `A1-MID`｜设 `stoleFood`；`relation.NPC-QINGYA -1`

### A1-MID「村中夜议」　（触发：三条路线汇入；无选项门槛）
**描述**：缄婆说"老井在哭"，问谁跟她去看看。
**选项（3）**：
1. `A1-MID-c1` 跟缄婆下井查看 → `A1-WELL`｜设 `wentWell`
2. `A1-MID-c2` 守在井口接应 → `A1-WATCH`｜设 `watchedWell`
3. `A1-MID-c3` 不理井，去北滩探那具浮尸的传闻 → `A1-BEACH`｜设 `seekCorpse`

### A1-WELL「井底」　（触发：A1-MID-c1）
**描述**：井底结昼盐浮尘，墙嵌半面残镜。`flagFalse(knowWellHistory)` 时追加"你不懂井来历"的茫然描写。
**选项（3）**：
1. `A1-WELL-c1` 取走一撮昼盐浮尘 → `A1-END`｜设 `hasDaySalt`、`knowHanhui`；得物 `IT-DAY-SALT`
2. `A1-WELL-c2` 记下残镜的纹路 → `A1-END`｜设 `knowMirror`
3. `A1-WELL-c3` 什么也不动，恭敬退出 → `A1-END`｜设 `revereWell`

### A1-WATCH「井口」　（触发：A1-MID-c2）
**描述**：守井口，风带回人声与缄婆嗓音叠着。
**选项（3）**：
1. `A1-WATCH-c1` 喊缄婆快上来 → `A1-END`｜设 `warnedWell`
2. `A1-WATCH-c2` 记下水声与人声叠着的节奏 → `A1-END`｜设 `knowWaterSong`
3. `A1-WATCH-c3` 独自下到一半去探查 → `A1-END`｜设 `halfDescent`

### A1-BEACH「北滩」　（触发：A1-MID-c3）
**描述**：北滩浮尸，肩泛赤金光；三道影子分立。
**选项（3）**：
1. `A1-BEACH-c1` 近前看尸身肩上的伤 → `A1-END`｜设 `sawCorpse`、`knowArrowWound`
2. `A1-BEACH-c2` 追那三道影子 → `A1-END`｜设 `chasedShadow`
3. `A1-BEACH-c3` 回村报信，不靠近 → `A1-END`｜设 `reportedCorpse`

### A1-END「雨未停」　（幕终，kind=act-end，ending=`a1-survived`）
**描述**：雨未停，决定以什么身份留在杳湾——此身份即第二幕入口。
**选项（3）**（每个选项设 `role` 并经 `A2-ENTRY` 哨兵分流到第二幕对应入口）：
1. `A1-END-c1` 以记历人之助的身份留下 → 角色 `chronicler` → 入口 `A2-CHRONICLE`
2. `A1-END-c2` 随宿沙的船，做个渡工同伴 → 角色 `ferrymate` → 入口 `A2-FERRY`
3. `A1-END-c3` 谁也不跟，独自追查黑雨与浮尸 → 角色 `seeker` → 入口 `A2-SOLO`

---

## 第二幕《三影》

### A2-CHRONICLE「记历棚的清晨」　（入口，触发：role=chronicler）
**描述**：砚伯让你把昨夜的雨、井、尸都记进谱。
**选项（3）**：
1. `A2-CHRONICLE-c1` 如实记，连井与尸都记 → `A2-SHORE`｜设 `chronicledAll`
2. `A2-CHRONICLE-c2` 只记天气，其余装没看见 → `A2-SHORE`｜设 `chronicledWeather`
3. `A2-CHRONICLE-c3` 借抄谱偷查村中旧档 → `A2-SHORE`｜设 `snoopedArchive`、`knowMirror`

### A2-FERRY「渡口的清晨」　（入口，触发：role=ferrymate）
**描述**：宿沙让你跟他出船看北滩漂来的东西。
**选项（3）**：
1. `A2-FERRY-c1` 帮他撑篙靠岸 → `A2-SHORE`｜设 `rowedBoat`
2. `A2-FERRY-c2` 留意对岸的动静 → `A2-SHORE`｜设 `watchedFarBank`
3. `A2-FERRY-c3` 又去瞟舱里那卷东西 → `A2-SHORE`｜**触发条件 `flagTrue(snoop)`**（第一幕偷看货才出现）；设 `snoopCargo2`；`relation.NPC-SUSHA -1`

### A2-SOLO「独行的清晨」　（入口，触发：role=seeker）
**描述**：谁也不靠，裹衣直奔北滩。
**选项（3）**：
1. `A2-SOLO-c1` 先去井边取走昼盐（你昨晚见过）→ `A2-SHORE`｜**触发条件 `flagTrue(knowHanhui)`**（第一幕取过昼盐才出现）；设 `carriedSalt`
2. `A2-SOLO-c2` 直奔北滩看那具尸 → `A2-SHORE`｜设 `seeksCorpse2`
3. `A2-SOLO-c3` 绕去粮仓找青芽打听 → `A2-SHORE`｜设 `askedQingya`

### A2-SHORE「北滩有尸」　（三入口汇入；第二幕真分叉起点）
**描述**：浮尸搁浅，赤金箭痕渗光；三道影子退到雨里。
**选项（3）**（此三路互不汇流，分别导向三种后续发展）：
1. `A2-SHORE-c1` 验尸：看那道赤金箭痕 → `A2-ARROW`｜设 `examineArrow`
2. `A2-SHORE-c2` 追那三道影子，问它们要一个名字 → `A2-SHADOWS`｜设 `chaseShadow2`
3. `A2-SHORE-c3` 听缄婆说井盐与"含晦" → `A2-SALT`｜设 `listenSalt`

### A2-ARROW「赤金箭痕」　（触发：A2-SHORE-c1）
**描述**：羿现身，称箭是他的，却没射人。`flagTrue(seekOrigin)`（第一幕追问过黑雨）时追加"箭痕缠着黑雨纹路"的细节。
**选项（3）**（后果轴①）：
1. `A2-ARROW-c1` 把箭痕拓下，与羿共保管 → `A2-END`｜设 `ending.yi_arrow_marks_shared`
2. `A2-ARROW-c2` 把箭交还羿，让他独自去追 → `A2-END`｜设 `yi_returned`
3. `A2-ARROW-c3` 质问羿为何箭会离手 → `A2-END`｜设 `yi_doubted`

### A2-SHADOWS「三影分立」　（触发：A2-SHORE-c2）
**描述**：中间那道影子慢慢立起，像要认一个名字。
**选项（3）**（后果轴②）：
1. `A2-SHADOWS-c1` 唤它一声"迟日" → `A2-END`｜设 `ending.chiri_name_open`
2. `A2-SHADOWS-c2` 按住它，让它沉回影里 → `A2-END`｜设 `chiri_submerged`
3. `A2-SHADOWS-c3` 只记下三影的方位，不插手 → `A2-END`｜设 `shadowMap`

### A2-SALT「含晦之盐」　（触发：A2-SHORE-c3）
**描述**：缄婆说老井连着"含晦"，盐里封着一句话。`anyFlagTrue(hasDaySalt, knowMirror)` 时追加"你能读出盐纹里那行字的一角"。
**选项（3）**（后果轴③）：
1. `A2-SALT-c1` 揭开封盐的话罐 → `A2-END`｜设 `ending.hanhui_open`
2. `A2-SALT-c2` 把话罐交给北方来的使者 → `A2-END`｜设 `ending.north_debt_marked`
3. `A2-SALT-c3` 原样封回井里，不动 → `A2-END`｜设 `hanhui_sealed`

### A2-END「三影之后」　（幕终，kind=act-end，ending=`a2-concluded`）
**描述**：雨没停，但杳湾记住了你选的路；记录触发的后果轴（`world.ending.*`）供第三幕消费。
**选项（1）**：`A2-END-c1` → `A2-DONE`

### A2-DONE「待续」　（kind=volume-end，置 `completed=true`）
**描述**：第一、二幕分支剧情到此；后续幕由续作内容承接。无选项。

---

## 第一幕 → 第二幕 交叉影响映射

| 第一幕积累 | 类型 | 第二幕被读取处 | 交叉影响表现 |
|---|---|---|---|
| `role = chronicler / ferrymate / seeker` | flag(字符串) | `A1-END` 经 `A2-ENTRY` 分流 | 决定第二幕三个入口与开场立场 |
| `snoop`（第一幕偷看宿沙的货） | flag | `A2-FERRY-c3.visibleWhen` | 仅渡工线出现"又去瞟舱里那卷"专属选项，并再扣宿沙好感 |
| `knowHanhui`（第一幕取昼盐/记残镜） | flag | `A2-SOLO-c1.visibleWhen`、`A2-SALT` 条件文本 | 仅独行线出现"先去井边取昼盐"选项；含晦线揭示盐纹一角 |
| `seekOrigin`（第一幕追问黑雨来历） | flag | `A2-ARROW` 条件文本 | 羿箭线追加"箭痕缠黑雨纹路"细节 |
| `knowWellHistory`（第一幕抄雨谱） | flag | `A1-WELL` 条件文本 | 不懂井来历时追加茫然描写（差异在文本，不增选项数） |
| `helpChronicle` / `helpFerry` / `helpGranary` 等 | flag | 后续对话与第三幕（预留） | 人际积淀，作为第三幕输入 |

> 说明：所有 `visibleWhen` 均为**附加**门槛——同一节点始终保留 ≤3 个选项，触发条件只决定"这 3 个里哪些出现"，绝不突破数量上限。`engine.validate()` 在构建期校验每节点可见选项最坏情况 ≤3。

## 自动备份与恢复（防数据丢失）

- `StoryDataBackup`（backup.ts）经注入的 storage 适配层（浏览器=`platform.storage`，不直连 localStorage/同步盘）工作。
- 调用 `generateStoryData()`（index.ts）生成剧情数据时，**自动**写一份带时间戳副本：`shanhai.branch.backup.<id>`（JSON），并在 `shanhai.branch.backup.manifest` 登记（保留最近 20 份，超出自动清理）。
- 提供：`list()` 列出副本、`restore(id)` 校验 checksum 后恢复、`remove(id)` 删除。
- 校验脚本已验证：生成即落副本、列表非空、恢复副本与原数据一致（节点数 + contentVersion）。
