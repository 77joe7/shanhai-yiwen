/**
 * 设计系统的平台适配边界（裁剪自 `app/game/platform.ts` 的 `PlatformAdapter` 思路）。
 *
 * 硬约束：
 * 1. 令牌与组件不得直接调用 `navigator` / `window` / `document` / `localStorage` / 微信 API，
 *    一律经本适配层访问。
 * 2. **SSR 安全**：本模块运行在 Cloudflare Workers 的服务端渲染阶段时，`navigator` /
 *    `window` / `document` 都不存在，因此禁止在模块顶层求值任何浏览器全局；
 *    所有能力探测都在方法内部惰性执行，失败即降级返回 `false`，由 UI 提示手动复制。
 * 3. 微信小游戏迁移只需新增 `WechatDsPlatform` 实现同一接口
 *    （clipboard → `wx.setClipboardData`，safeArea → `SafeAreaPort`），组件零改动。
 */

/** 安全区内边距（CSS px）。 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 设计系统所需的平台能力。 */
export interface DsPlatform {
  clipboard: {
    /**
     * 写入剪贴板。
     *
     * @param text 待写入文本。
     * @returns 是否写入成功；失败时调用方须提示用户手动复制，不得静默失败。
     */
    write(text: string): Promise<boolean>;
  };
  safeArea: {
    /**
     * 读取当前安全区内边距。
     *
     * @returns 四边内边距；无法读取（SSR / 不支持 env()）时全部为 0。
     */
    getInsets(): SafeAreaInsets;
  };
  keyboard: {
    /**
     * 订阅 Esc 键。
     *
     * 浮层（抽屉 / 对话框）需要「焦点在浮层内任意位置时按 Esc 均可关闭」。
     * 若把 `onKeyDown` 直接绑在 `role="dialog"` 的容器上，等于给非交互元素挂键盘监听，
     * 既被 jsx-a11y 正确拦下，也不能覆盖焦点落在浮层外的情况；因此统一收敛到本适配层，
     * 由调用方在浮层打开期间订阅、关闭时退订。
     *
     * @param handler Esc 被按下时的回调。
     * @returns 退订函数；无 DOM 能力时返回一个空操作函数，调用方无需分支处理。
     */
    onEscape(handler: () => void): () => void;
  };
}

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** 无能力环境下的退订占位，避免调用方写 `?.()` 分支。 */
const NOOP_UNSUBSCRIBE = (): void => undefined;

/**
 * 惰性判断是否处于具备 DOM 的浏览器环境。
 *
 * @returns 是否可安全访问 `document`。
 */
function hasDom(): boolean {
  return typeof globalThis !== "undefined"
    && typeof (globalThis as { document?: unknown }).document !== "undefined";
}

/**
 * 惰性取得异步剪贴板 API（不在模块顶层触碰 `navigator`）。
 *
 * @returns 可用的 clipboard 对象，或 `null`。
 */
function getAsyncClipboard(): { writeText(text: string): Promise<void> } | null {
  const nav = (globalThis as { navigator?: { clipboard?: { writeText?: (text: string) => Promise<void> } } }).navigator;
  const writeText = nav?.clipboard?.writeText;
  if (typeof writeText !== "function" || !nav?.clipboard) return null;
  return nav.clipboard as { writeText(text: string): Promise<void> };
}

/**
 * `document.execCommand("copy")` 兜底路径（旧 WebView / 非安全上下文）。
 *
 * @param text 待复制文本。
 * @returns 是否复制成功。
 */
function copyViaSelection(text: string): boolean {
  if (!hasDom()) return false;
  const doc = (globalThis as unknown as { document: Document }).document;
  const legacy = doc as Document & { execCommand?: (command: string) => boolean };
  if (typeof legacy.execCommand !== "function") return false;
  const holder = doc.createElement("textarea");
  holder.value = text;
  holder.setAttribute("readonly", "readonly");
  holder.style.position = "fixed";
  holder.style.opacity = "0";
  holder.style.pointerEvents = "none";
  doc.body.appendChild(holder);
  holder.select();
  let copied = false;
  try {
    copied = legacy.execCommand("copy") === true;
  } catch {
    copied = false;
  }
  doc.body.removeChild(holder);
  return copied;
}

/**
 * 解析 CSS 长度字符串为像素数。
 *
 * @param raw 形如 `"12px"` 的字符串。
 * @returns 像素数；解析失败返回 0。
 */
function toPx(raw: string): number {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 浏览器实现。所有浏览器全局在方法内部惰性访问，SSR 下自动降级。 */
export const browserDsPlatform: DsPlatform = {
  clipboard: {
    async write(text: string): Promise<boolean> {
      const clipboard = getAsyncClipboard();
      if (clipboard) {
        try {
          await clipboard.writeText(text);
          return true;
        } catch {
          // 权限被拒或非安全上下文，落到兜底路径。
        }
      }
      return copyViaSelection(text);
    },
  },
  safeArea: {
    getInsets(): SafeAreaInsets {
      if (!hasDom()) return ZERO_INSETS;
      const scope = globalThis as unknown as {
        document: Document;
        getComputedStyle?: (element: Element) => CSSStyleDeclaration;
      };
      if (typeof scope.getComputedStyle !== "function") return ZERO_INSETS;
      const probe = scope.document.createElement("div");
      probe.style.position = "fixed";
      probe.style.visibility = "hidden";
      probe.style.pointerEvents = "none";
      probe.style.paddingTop = "env(safe-area-inset-top, 0px)";
      probe.style.paddingRight = "env(safe-area-inset-right, 0px)";
      probe.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
      probe.style.paddingLeft = "env(safe-area-inset-left, 0px)";
      scope.document.body.appendChild(probe);
      const computed = scope.getComputedStyle(probe);
      const insets: SafeAreaInsets = {
        top: toPx(computed.paddingTop),
        right: toPx(computed.paddingRight),
        bottom: toPx(computed.paddingBottom),
        left: toPx(computed.paddingLeft),
      };
      scope.document.body.removeChild(probe);
      return insets;
    },
  },
  keyboard: {
    onEscape(handler: () => void): () => void {
      if (!hasDom()) return NOOP_UNSUBSCRIBE;
      const doc = (globalThis as unknown as { document: Document }).document;
      if (typeof doc.addEventListener !== "function") return NOOP_UNSUBSCRIBE;
      const listener = (event: Event): void => {
        // 只认 Escape，其余按键一律放行，不干扰输入法与表单输入。
        if ((event as KeyboardEvent).key === "Escape") handler();
      };
      doc.addEventListener("keydown", listener);
      return () => {
        doc.removeEventListener("keydown", listener);
      };
    },
  },
};

/**
 * SSR / 无 DOM 环境使用的空实现，保证服务端渲染阶段零副作用。
 */
export const noopDsPlatform: DsPlatform = {
  clipboard: {
    async write(): Promise<boolean> {
      return false;
    },
  },
  safeArea: {
    getInsets(): SafeAreaInsets {
      return ZERO_INSETS;
    },
  },
  keyboard: {
    onEscape(): () => void {
      return NOOP_UNSUBSCRIBE;
    },
  },
};

/**
 * 取得当前环境适用的平台适配器。
 *
 * @returns 浏览器环境返回 `browserDsPlatform`，否则返回 `noopDsPlatform`。
 */
export function resolveDsPlatform(): DsPlatform {
  return hasDom() ? browserDsPlatform : noopDsPlatform;
}
