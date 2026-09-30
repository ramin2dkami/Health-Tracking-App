import type { FoodEffectLevel } from './insights';

export const LEVEL_BADGE: Record<FoodEffectLevel, { label: string; className: string; fill: string }> = {
  avoid: { label: 'Avoid', className: 'insight-delta--avoid', fill: 'var(--pink-strong)' },
  limit: { label: 'Limit', className: 'insight-delta--down', fill: 'var(--pink)' },
  help: { label: 'May help', className: 'insight-delta--up', fill: 'var(--green)' },
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
