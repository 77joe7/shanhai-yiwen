"use client";

/**
 * 设计系统作用域根。
 *
 * 职责：
 * 1. 以 React `style` prop 把 `tokens.ts` 编译出的全部 `--ds-*` 变量输出到 `.shj-ds` 根元素，
 *    使 SSR 首屏 HTML 即带令牌，杜绝「先按 globals.css 浅色变量渲染再闪变暗色」。
 * 2. 提供 `DesignSystemContext`（开关、断点、搜索词、复制能力）。
 * 3. 以 `data-*` 属性驱动高对比 / 减弱动效 / 纹理降级的纯 CSS 切换。
 * 4. 提供断点模拟用的视口 frame 容器（容器查询单位的宿主）。
 *
 * 样式隔离：所有设计系统 DOM 必须位于 `.shj-ds` 子树内；组件样式只引用 `var(--ds-*)`，
 * 不引用 `app/globals.css` 的 `--ink / --paper / --cinnabar / --gold / --moss / --line`。
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  buildTokenStyle,
  resolveBreakpoint,
  resolveTokenValue,
  type BreakpointId,
  type BreakpointSpec,
} from "./tokens";
import { resolveDsPlatform, type DsPlatform } from "./dsPlatform";

/** 纹理模式。 */
export type TextureMode = "full" | "simple";

/** 设计系统的可交互状态。 */
export interface DesignSystemState {
  /** 高对比模式（说明书十二.5）。 */
  highContrast: boolean;
  /** 减弱动效模式（说明书十二.5）。 */
  reducedMotion: boolean;
  /** 纹理：full = 5% 噪点；simple = 关闭噪点。 */
  texture: TextureMode;
  /** 叙事逐字播放开关。 */
  typewriter: boolean;
  /** 语义色附加文字（关闭仅用于演示「唯色」反例）。 */
  semanticText: boolean;
  /** 当前断点预设。 */
  breakpoint: BreakpointId;
  /** 断点模拟 frame 宽度（CSS px，纯 React 状态，不改动真实 window）。 */
  frameWidth: number;
  /** 令牌搜索关键字。 */
  search: string;
}

/** 复制反馈。 */
export interface CopyFeedback {
  varName: string;
  text: string;
  ok: boolean;
}

/** Context 暴露的完整能力。 */
export interface DesignSystemContextValue extends DesignSystemState {
  /** 局部更新状态。 */
  set: (patch: Partial<DesignSystemState>) => void;
  /** 复制令牌（经平台适配层，失败返回 false 由 UI 提示手动复制）。 */
  copyToken: (varName: string, text: string) => Promise<boolean>;
  /** 最近一次复制结果。 */
  copyFeedback: CopyFeedback | null;
  /** 读取令牌在当前状态下的生效值。 */
  tokenValue: (varName: string) => string;
  /** 当前 frame 宽度对应的断点。 */
  activeBreakpoint: BreakpointSpec;
  /** 平台适配层（组件不得绕过它访问浏览器能力）。 */
  platform: DsPlatform;
}

const DEFAULT_STATE: DesignSystemState = {
  highContrast: false,
  reducedMotion: false,
  texture: "full",
  typewriter: true,
  semanticText: true,
  breakpoint: "mobile",
  frameWidth: 390,
  search: "",
};

const DesignSystemContext = createContext<DesignSystemContextValue | null>(null);

/**
 * 读取设计系统上下文。
 *
 * @returns 上下文值。
 * @throws 当组件不在 `DesignSystemRoot` 子树内时抛错，避免静默使用错误令牌。
 */
export function useDesignSystem(): DesignSystemContextValue {
  const value = useContext(DesignSystemContext);
  if (value === null) {
    throw new Error("useDesignSystem 必须在 <DesignSystemRoot> 子树内使用。");
  }
  return value;
}

export interface DesignSystemRootProps {
  /** 作用域内容（living demo 由 page.tsx 作为 children 传入，避免根与 demo 循环导入）。 */
  children?: ReactNode;
  /** 初始状态覆盖（用于测试或嵌入场景）。 */
  initialState?: Partial<DesignSystemState>;
}

/**
 * 设计系统根组件。
 *
 * @param props 组件属性。
 * @returns 带令牌与模式属性的作用域根元素。
 */
export function DesignSystemRoot({ children, initialState }: DesignSystemRootProps) {
  const [state, setState] = useState<DesignSystemState>(() => ({ ...DEFAULT_STATE, ...initialState }));
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);

  /*
   * 惰性解析平台能力：SSR 阶段拿到 noop 实现，浏览器端拿到真实能力，
   * 两端都不在模块顶层触碰 navigator/document。
   *
   * 用 `useState` 的惰性初始器（保证只执行一次）而不是 `useRef` + 渲染期赋值：
   * 渲染期读写 ref 属于副作用，会被 react-hooks/refs 规则正确地拦下。
   * platform 本身不参与渲染输出，故服务端与客户端解析出不同实现也不会造成水合不一致。
   */
  const [platform] = useState<DsPlatform>(() => resolveDsPlatform());

  const set = useCallback((patch: Partial<DesignSystemState>) => {
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const copyToken = useCallback(
    async (varName: string, text: string): Promise<boolean> => {
      const ok = await platform.clipboard.write(text);
      setCopyFeedback({ varName, text, ok });
      return ok;
    },
    [platform],
  );

  const tokenValue = useCallback(
    (varName: string) => resolveTokenValue(varName, { highContrast: state.highContrast }),
    [state.highContrast],
  );

  const styleVars: CSSProperties = useMemo(
    () => buildTokenStyle({ highContrast: state.highContrast }),
    [state.highContrast],
  );

  const activeBreakpoint = useMemo(() => resolveBreakpoint(state.frameWidth), [state.frameWidth]);

  const contextValue = useMemo<DesignSystemContextValue>(
    () => ({
      ...state,
      set,
      copyToken,
      copyFeedback,
      tokenValue,
      activeBreakpoint,
      platform,
    }),
    [state, set, copyToken, copyFeedback, tokenValue, activeBreakpoint, platform],
  );

  return (
    <DesignSystemContext.Provider value={contextValue}>
      <div
        className="shj-ds"
        data-contrast={state.highContrast ? "high" : "normal"}
        data-motion={state.reducedMotion ? "reduced" : "full"}
        data-texture={state.highContrast ? "simple" : state.texture}
        data-semantic-text={state.semanticText ? "on" : "off"}
        style={styleVars}
      >
        <div className="ds-noise" aria-hidden="true" />
        <div className="ds-scope-body">{children}</div>
      </div>
    </DesignSystemContext.Provider>
  );
}

export interface DsViewportFrameProps {
  /** frame 宽度（CSS px）。 */
  width: number;
  /** 无障碍标签。 */
  label: string;
  /** frame 内容。 */
  children?: ReactNode;
  /** 宽高比（如 "750 / 1334"）。不设则自动高度。 */
  aspectRatio?: string;
}

/**
 * 断点模拟视口 frame。
 *
 * 用容器宽度模拟设备宽度（`container-type: inline-size`），使内部的容器查询与
 * `cqi` 字号真实响应；**不改动真实 `window`**，符合平台抽象约束。
 * 可选 `aspectRatio` 约束高度（如手机 750×1334）。
 *
 * @param props 组件属性。
 * @returns frame 容器元素。
 */
export function DsViewportFrame({ width, label, children, aspectRatio }: DsViewportFrameProps) {
  return (
    <div className="ds-frame-outer">
      <div
        className="ds-frame"
        style={{
          width: `${width}px`,
          ...(aspectRatio ? { aspectRatio } : {}),
        }}
        role="group"
        aria-label={label}
        data-frame-width={width}
      >
        {children}
      </div>
    </div>
  );
}
