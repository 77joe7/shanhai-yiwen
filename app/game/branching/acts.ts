// 《山海异闻录：天地未定》第一卷《黑雨》——
// 第一幕「雨至」与第二幕「三影」分支剧情脚本。
//
// 设计约束（来自需求）：
//  1. 每决策节点可选项严格 ≤3，且用 no 字段显式编号(1..3)便于修改；
//  2. 内置多个分支，避免单一结局导向；玩家选择引发不同剧情发展；
//  3. 触发条件用 visibleWhen 谓词表达，选项后果用 effects 写入 flag/世界变量；
//  4. 两幕逻辑连贯且交叉影响：第一幕三条路线 + 幕终"承诺角色"决定第二幕入口，
//     第一幕积累的 flag 在第二幕分支里被 visibleWhen 读取，改变可见选项与文本。
//
// 注：本文件为"分支剧情参考实现"，与受控内容包(剧情/第一卷_黑雨/...)并列，
// 未覆盖/改写既有 JSON 内容；后续如需并入内容包，可通过 tools/build_black_rain.py 生成。

import type { BranchingContent, BranchNode } from "./types";

const NODES: BranchNode[] = [
  // ============================ 第一幕「雨至」 ============================
  {
    id: "A1-START",
    act: 1,
    title: "雨脚",
    blocks: [
      { type: "narration", text: "黑雨落下，不像是水，更像是一整片天在往下塌。你站在杳湾村口，衣角已经沉得坠手。" },
      { type: "narration", text: "村子里亮着三处灯：记历棚的灯、渡口的灯、粮仓的灯。雨里各有各的声响。" },
      { type: "system", text: "【第一幕·雨至】先决定你落脚的去处——这会影响你在杳湾最初结下的人情。" },
    ],
    choices: [
      { no: 1, id: "A1-START-c1", label: "躲进记历棚，找砚伯", next: "A1-SHED", effects: [{ type: "setFlag", key: "metYanbo", value: true }] },
      { no: 2, id: "A1-START-c2", label: "沿河去渡口，找宿沙", next: "A1-FERRY", effects: [{ type: "setFlag", key: "metSusha", value: true }] },
      { no: 3, id: "A1-START-c3", label: "去粮仓问有没有空屋", next: "A1-GRANARY", effects: [{ type: "setFlag", key: "metQingya", value: true }] },
    ],
  },

  {
    id: "A1-SHED",
    act: 1,
    title: "砚伯的棚",
    blocks: [
      { type: "dialogue", speaker: "砚伯", text: "雨谱不能断。你来得巧，帮我抄两行，还是只想躲一躲？" },
      { type: "dialogue", speaker: "砚伯", text: "这雨不干净。村中老井今早开始'哭'——你若好奇，以后自有去处。" },
    ],
    choices: [
      { no: 1, id: "A1-SHED-c1", label: "帮他抄录雨谱", next: "A1-MID", effects: [{ type: "setFlag", key: "helpChronicle", value: true }, { type: "setFlag", key: "knowWellHistory", value: true }] },
      { no: 2, id: "A1-SHED-c2", label: "追问黑雨的来历", next: "A1-MID", effects: [{ type: "setFlag", key: "seekOrigin", value: true }] },
      { no: 3, id: "A1-SHED-c3", label: "只躲雨，不掺和", next: "A1-MID", effects: [{ type: "setFlag", key: "aloof", value: true }] },
    ],
  },

  {
    id: "A1-FERRY",
    act: 1,
    title: "渡口",
    blocks: [
      { type: "dialogue", speaker: "宿沙", text: "浪比平时高半尺。你若是来避雨的，就帮我压住缆——别碰舱里那卷东西。" },
      { type: "narration", text: "他系缆的桩子被冲得松动，船身一下下磕着石阶。" },
    ],
    choices: [
      { no: 1, id: "A1-FERRY-c1", label: "帮他修被冲坏的缆桩", next: "A1-MID", effects: [{ type: "setFlag", key: "helpFerry", value: true }] },
      { no: 2, id: "A1-FERRY-c2", label: "问他河对岸有什么", next: "A1-MID", effects: [{ type: "setFlag", key: "seekRiver", value: true }] },
      { no: 3, id: "A1-FERRY-c3", label: "趁他转身，偷看舱里那卷东西", next: "A1-MID", effects: [{ type: "setFlag", key: "snoop", value: true }, { type: "changeRelation", npcId: "NPC-SUSHA", delta: -1 }] },
    ],
  },

  {
    id: "A1-GRANARY",
    act: 1,
    title: "粮仓",
    blocks: [
      { type: "dialogue", speaker: "青芽", text: "空屋没有，饼倒还有半筐。这雨要是连下三天，粮就该发芽了。" },
      { type: "narration", text: "她把算筹拨得噼啪响，眼睛却一直瞟着门外那道水线。" },
    ],
    choices: [
      { no: 1, id: "A1-GRANARY-c1", label: "帮她清点存粮", next: "A1-MID", effects: [{ type: "setFlag", key: "helpGranary", value: true }] },
      { no: 2, id: "A1-GRANARY-c2", label: "提醒她雨会坏粮", next: "A1-MID", effects: [{ type: "setFlag", key: "warnGrain", value: true }] },
      { no: 3, id: "A1-GRANARY-c3", label: "趁她低头，顺手拿块饼", next: "A1-MID", effects: [{ type: "setFlag", key: "stoleFood", value: true }, { type: "changeRelation", npcId: "NPC-QINGYA", delta: -1 }] },
    ],
  },

  {
    id: "A1-MID",
    act: 1,
    title: "村中夜议",
    blocks: [
      { type: "dialogue", speaker: "缄婆", text: "老井在哭。不是水响，是有人在水底下说话。你们谁跟我去看看？" },
      { type: "system", text: "【第一幕·分叉】三条路在此收束到同一桩'井哭'异象，但你先前结下的人情会改变你能做的事。" },
    ],
    choices: [
      { no: 1, id: "A1-MID-c1", label: "跟缄婆下井查看", next: "A1-WELL", effects: [{ type: "setFlag", key: "wentWell", value: true }] },
      { no: 2, id: "A1-MID-c2", label: "守在井口接应", next: "A1-WATCH", effects: [{ type: "setFlag", key: "watchedWell", value: true }] },
      { no: 3, id: "A1-MID-c3", label: "不理井，去北滩探那具浮尸的传闻", next: "A1-BEACH", effects: [{ type: "setFlag", key: "seekCorpse", value: true }] },
    ],
  },

  {
    id: "A1-WELL",
    act: 1,
    title: "井底",
    blocks: [
      { type: "narration", text: "井底结着一层昼盐似的浮尘，墙里嵌着半面残镜，镜子照不出你，只照出一片一直在下的雨。" },
      { type: "narration", text: "你不懂这井的来历，只觉得脚下的水声比雨更急——这是没帮砚伯抄过雨谱的人才会有的茫然。", when: [{ type: "flagFalse", key: "knowWellHistory" }] },
    ],
    choices: [
      { no: 1, id: "A1-WELL-c1", label: "取走一撮昼盐浮尘", next: "A1-END", effects: [{ type: "setFlag", key: "hasDaySalt", value: true }, { type: "setFlag", key: "knowHanhui", value: true }, { type: "addItem", itemId: "IT-DAY-SALT", quantity: 1 }] },
      { no: 2, id: "A1-WELL-c2", label: "记下残镜的纹路", next: "A1-END", effects: [{ type: "setFlag", key: "knowMirror", value: true }] },
      { no: 3, id: "A1-WELL-c3", label: "什么也不动，恭敬退出", next: "A1-END", effects: [{ type: "setFlag", key: "revereWell", value: true }] },
    ],
  },

  {
    id: "A1-WATCH",
    act: 1,
    title: "井口",
    blocks: [
      { type: "narration", text: "你守在井口。风灌下去，带回的却不只是水声——是人声，和缄婆的嗓音叠在一起，像在念一个名字。" },
    ],
    choices: [
      { no: 1, id: "A1-WATCH-c1", label: "喊缄婆快上来", next: "A1-END", effects: [{ type: "setFlag", key: "warnedWell", value: true }] },
      { no: 2, id: "A1-WATCH-c2", label: "记下水声与人声叠着的节奏", next: "A1-END", effects: [{ type: "setFlag", key: "knowWaterSong", value: true }] },
      { no: 3, id: "A1-WATCH-c3", label: "独自下到一半去探查", next: "A1-END", effects: [{ type: "setFlag", key: "halfDescent", value: true }] },
    ],
  },

  {
    id: "A1-BEACH",
    act: 1,
    title: "北滩",
    blocks: [
      { type: "narration", text: "北滩搁着一具浮尸，雨打在它肩上，泛起赤金色的光。你一抬头，三道影子在雨幕里分立，像在等谁先动。" },
    ],
    choices: [
      { no: 1, id: "A1-BEACH-c1", label: "近前看尸身肩上的伤", next: "A1-END", effects: [{ type: "setFlag", key: "sawCorpse", value: true }, { type: "setFlag", key: "knowArrowWound", value: true }] },
      { no: 2, id: "A1-BEACH-c2", label: "追那三道影子", next: "A1-END", effects: [{ type: "setFlag", key: "chasedShadow", value: true }] },
      { no: 3, id: "A1-BEACH-c3", label: "回村报信，不靠近", next: "A1-END", effects: [{ type: "setFlag", key: "reportedCorpse", value: true }] },
    ],
  },

  {
    id: "A1-END",
    act: 1,
    title: "雨未停",
    kind: "act-end",
    actEnd: { endingId: "a1-survived", summary: "你没被雨吞掉，也没逃走。你在杳湾给自己挣了一个位置。" },
    blocks: [
      { type: "narration", text: "雨没停。天亮前，你得决定以什么身份留在杳湾——这身份会决定你如何撞上第二幕的那具尸。" },
      { type: "system", text: "【第一幕·幕终】承诺一种身份，将作为第二幕的入口与初始立场。" },
    ],
    choices: [
      { no: 1, id: "A1-END-c1", label: "以记历人之助的身份留下", next: "A2-ENTRY", effects: [{ type: "setFlag", key: "role", value: "chronicler" }] },
      { no: 2, id: "A1-END-c2", label: "随宿沙的船，做个渡工同伴", next: "A2-ENTRY", effects: [{ type: "setFlag", key: "role", value: "ferrymate" }] },
      { no: 3, id: "A1-END-c3", label: "谁也不跟，独自追查黑雨与浮尸", next: "A2-ENTRY", effects: [{ type: "setFlag", key: "role", value: "seeker" }] },
    ],
  },

  // ============================ 第二幕「三影」 ============================
  // 三个入口由第一幕角色决定；均汇入 A2-SHORE(浮尸异象)，其后真正分流为三条后果轴。
  {
    id: "A2-CHRONICLE",
    act: 2,
    title: "记历棚的清晨",
    blocks: [
      { type: "dialogue", speaker: "砚伯", text: "你是记历棚的人了。昨夜的雨、井、尸，都该进谱——可有的事，进了谱就收不回来了。" },
    ],
    choices: [
      { no: 1, id: "A2-CHRONICLE-c1", label: "如实记，连井与尸都记", next: "A2-SHORE", effects: [{ type: "setFlag", key: "chronicledAll", value: true }] },
      { no: 2, id: "A2-CHRONICLE-c2", label: "只记天气，其余装没看见", next: "A2-SHORE", effects: [{ type: "setFlag", key: "chronicledWeather", value: true }] },
      { no: 3, id: "A2-CHRONICLE-c3", label: "借抄谱偷查村中旧档", next: "A2-SHORE", effects: [{ type: "setFlag", key: "snoopedArchive", value: true }, { type: "setFlag", key: "knowMirror", value: true }] },
    ],
  },

  {
    id: "A2-FERRY",
    act: 2,
    title: "渡口的清晨",
    blocks: [
      { type: "dialogue", speaker: "宿沙", text: "跟我去北滩。河面上漂着不该漂的东西——你若还惦记舱里那卷，趁早别看。" },
    ],
    choices: [
      { no: 1, id: "A2-FERRY-c1", label: "帮他撑篙靠岸", next: "A2-SHORE", effects: [{ type: "setFlag", key: "rowedBoat", value: true }] },
      { no: 2, id: "A2-FERRY-c2", label: "留意对岸的动静", next: "A2-SHORE", effects: [{ type: "setFlag", key: "watchedFarBank", value: true }] },
      { no: 3, id: "A2-FERRY-c3", label: "又去瞟舱里那卷东西", next: "A2-SHORE", visibleWhen: [{ type: "flagTrue", key: "snoop" }], effects: [{ type: "setFlag", key: "snoopCargo2", value: true }, { type: "changeRelation", npcId: "NPC-SUSHA", delta: -1 }] },
    ],
  },

  {
    id: "A2-SOLO",
    act: 2,
    title: "独行的清晨",
    blocks: [
      { type: "narration", text: "谁也不靠。你裹紧湿衣，直接往北滩走——昨夜那三道影子，你没忘。" },
    ],
    choices: [
      { no: 1, id: "A2-SOLO-c1", label: "先去井边取走昼盐（你昨晚见过）", next: "A2-SHORE", visibleWhen: [{ type: "flagTrue", key: "knowHanhui" }], effects: [{ type: "setFlag", key: "carriedSalt", value: true }] },
      { no: 2, id: "A2-SOLO-c2", label: "直奔北滩看那具尸", next: "A2-SHORE", effects: [{ type: "setFlag", key: "seeksCorpse2", value: true }] },
      { no: 3, id: "A2-SOLO-c3", label: "绕去粮仓找青芽打听", next: "A2-SHORE", effects: [{ type: "setFlag", key: "askedQingya", value: true }] },
    ],
  },

  {
    id: "A2-SHORE",
    act: 2,
    title: "北滩有尸",
    blocks: [
      { type: "narration", text: "浮尸搁浅在北滩，肩上一道赤金箭痕还在渗光。三道影子退到雨里，像在等你怎么处置这具'三影者'。" },
      { type: "system", text: "【第二幕·真分叉】以下三条路互不汇流，分别导向三种后续发展（羿箭 / 迟日 / 含晦）。你第一幕的积淀会改变每条路上的细节。" },
    ],
    choices: [
      { no: 1, id: "A2-SHORE-c1", label: "验尸：看那道赤金箭痕", next: "A2-ARROW", effects: [{ type: "setFlag", key: "examineArrow", value: true }] },
      { no: 2, id: "A2-SHORE-c2", label: "追那三道影子，问它们要一个名字", next: "A2-SHADOWS", effects: [{ type: "setFlag", key: "chaseShadow2", value: true }] },
      { no: 3, id: "A2-SHORE-c3", label: "听缄婆说井盐与'含晦'", next: "A2-SALT", effects: [{ type: "setFlag", key: "listenSalt", value: true }] },
    ],
  },

  {
    id: "A2-ARROW",
    act: 2,
    title: "赤金箭痕",
    blocks: [
      { type: "dialogue", speaker: "羿", text: "那箭是我的。可我没射人——是有人把我的箭，钉进了一具早该安息的身子。" },
      { type: "narration", text: "若你第一幕追问过黑雨来历，你会注意到箭痕里缠着一丝黑雨的纹路。", when: [{ type: "flagTrue", key: "seekOrigin" }] },
    ],
    choices: [
      { no: 1, id: "A2-ARROW-c1", label: "把箭痕拓下，与羿共保管", next: "A2-END-ARROW", effects: [{ type: "setWorldVar", key: "ending.yi_arrow_marks_shared", value: true }] },
      { no: 2, id: "A2-ARROW-c2", label: "把箭交还羿，让他独自去追", next: "A2-END-ARROW", effects: [{ type: "setFlag", key: "yi_returned", value: true }] },
      { no: 3, id: "A2-ARROW-c3", label: "质问羿为何箭会离手", next: "A2-END-ARROW", effects: [{ type: "setFlag", key: "yi_doubted", value: true }] },
    ],
  },

  {
    id: "A2-SHADOWS",
    act: 2,
    title: "三影分立",
    blocks: [
      { type: "narration", text: "中间那道影子慢慢立起，像要认一个名字。另外两道影子一左一右，把它往回拖。" },
    ],
    choices: [
      { no: 1, id: "A2-SHADOWS-c1", label: "唤它一声'迟日'", next: "A2-END-SHADOWS", effects: [{ type: "setWorldVar", key: "ending.chiri_name_open", value: true }] },
      { no: 2, id: "A2-SHADOWS-c2", label: "按住它，让它沉回影里", next: "A2-END-SHADOWS", effects: [{ type: "setFlag", key: "chiri_submerged", value: true }] },
      { no: 3, id: "A2-SHADOWS-c3", label: "只记下三影的方位，不插手", next: "A2-END-SHADOWS", effects: [{ type: "setFlag", key: "shadowMap", value: true }] },
    ],
  },

  {
    id: "A2-SALT",
    act: 2,
    title: "含晦之盐",
    blocks: [
      { type: "dialogue", speaker: "缄婆", text: "老井连着'含晦'。盐里封着一句话，揭了，就有人要来讨债。" },
      { type: "narration", text: "若你第一幕取过昼盐或记过残镜，你能读出盐纹里那行字的一角。", when: [{ type: "anyFlagTrue", keys: ["hasDaySalt", "knowMirror"] }] },
    ],
    choices: [
      { no: 1, id: "A2-SALT-c1", label: "揭开封盐的话罐", next: "A2-END-SALT", effects: [{ type: "setWorldVar", key: "ending.hanhui_open", value: true }] },
      { no: 2, id: "A2-SALT-c2", label: "把话罐交给北方来的使者", next: "A2-END-SALT", effects: [{ type: "setWorldVar", key: "ending.north_debt_marked", value: true }] },
      { no: 3, id: "A2-SALT-c3", label: "原样封回井里，不动", next: "A2-END-SALT", effects: [{ type: "setFlag", key: "hanhui_sealed", value: true }] },
    ],
  },

  // 三条后果轴各自落到不同的卷终结局（不再汇流成单一"待续"），构成"总分"结构。
  {
    id: "A2-END-ARROW",
    act: 2,
    title: "箭痕未冷",
    kind: "volume-end",
    blocks: [
      { type: "narration", text: "赤金箭痕在雨里仍泛着光。你把这段因果收进了自己的路径——它不会再是'待续'二字能盖过的了。" },
      { type: "system", text: "【羿箭轴·卷终】结局分支由 ending.yi_arrow_marks_shared / yi_returned / yi_doubted 决定；第三幕羿线据此承接。" },
    ],
    choices: [],
  },

  {
    id: "A2-END-SHADOWS",
    act: 2,
    title: "迟日有名",
    kind: "volume-end",
    blocks: [
      { type: "narration", text: "中间那道影子立了又沉。无论你唤没唤出'迟日'，三影都已记住你站过的位置。" },
      { type: "system", text: "【迟日轴·卷终】结局分支由 ending.chiri_name_open / chiri_submerged / shadowMap 决定；第三幕影线据此承接。" },
    ],
    choices: [],
  },

  {
    id: "A2-END-SALT",
    act: 2,
    title: "盐封启闭",
    kind: "volume-end",
    blocks: [
      { type: "narration", text: "井盐的气息退进雨里。那句被封着的话，是揭是掩，都已成了你身上背得动或背不动的东西。" },
      { type: "system", text: "【含晦轴·卷终】结局分支由 ending.hanhui_open / north_debt_marked / hanhui_sealed 决定；第三幕盐线据此承接。" },
    ],
    choices: [],
  },
];

export const branchingContent: BranchingContent = {
  schemaVersion: "branch-1.0",
  contentVersion: "black-rain-act1-2-branch-v1",
  act2EntryByRole: {
    chronicler: "A2-CHRONICLE",
    ferrymate: "A2-FERRY",
    seeker: "A2-SOLO",
  },
  nodes: NODES,
};
