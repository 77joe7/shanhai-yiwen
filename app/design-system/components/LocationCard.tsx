"use client";

/**
 * 组件 10 · LocationCard（说明书十一.10、十三.5（2））
 *
 * 属性：name、description、tags、availableActions、weather、time、danger。
 * 位置：地图左下，避开底部导航与安全区（CSS 已叠 `env(safe-area-inset-bottom)`）。
 *
 * 铁律：危险提示除颜色外必须有文字（此处以「危险：xxx」文字 + 朱砂标签双线索表达）。
 */

import { ActionButton } from "./ActionButton";
import type { ActionButtonProps } from "./ActionButton";
import { SquareTag } from "./SquareTag";

export interface LocationCardProps {
  /** 地点名称。 */
  name: string;
  /** 感官描述。 */
  description?: string;
  /** 标签。 */
  tags?: string[];
  /** 可用行动。 */
  availableActions?: ActionButtonProps[];
  /** 天气。 */
  weather?: string;
  /** 时日。 */
  time?: string;
  /** 危险提示。 */
  danger?: string;
}

/**
 * 地点卡组件。
 *
 * @param props 组件属性。
 * @returns 地点卡元素。
 */
export function LocationCard({
  name,
  description,
  tags = [],
  availableActions = [],
  weather,
  time,
  danger,
}: LocationCardProps) {
  return (
    <section className="ds-location" aria-label={`地点：${name}`}>
      <div className="ds-location-meta ds-type-label">
        {time !== undefined && time.length > 0 ? <SquareTag label={time} /> : null}
        {weather !== undefined && weather.length > 0 ? <SquareTag label={weather} /> : null}
        {danger !== undefined && danger.length > 0 ? (
          <SquareTag label={`危险：${danger}`} tone="cinnabar" icon="危" />
        ) : null}
      </div>

      <h3 className="ds-location-name ds-type-headline-mobile">{name}</h3>

      {description !== undefined && description.length > 0 ? (
        <p className="ds-location-desc ds-type-body-sm">{description}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="ds-location-tags">
          {tags.map((tag) => (
            <SquareTag key={tag} label={tag} tone="nature" />
          ))}
        </div>
      ) : null}

      {availableActions.length > 0 ? (
        <div className="ds-location-actions" aria-label="可用行动">
          {availableActions.map((action) => (
            <ActionButton key={action.label} {...action} />
          ))}
        </div>
      ) : (
        <p className="ds-location-desc ds-type-label">此处暂无可做之事，先四下看看。</p>
      )}
    </section>
  );
}
