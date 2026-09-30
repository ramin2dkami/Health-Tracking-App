import type { ReactNode } from 'react';

export type BlobShape = 'flower' | 'star' | 'cross' | 'heart' | 'blob' | 'pill';

function polar(sample: (t: number) => number, steps = 120): string {
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = sample(t);
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

function starPath(points: number, inner: number, outer: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const t = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const SHAPES: Record<BlobShape, { d: string; rounded?: boolean }> = {
  flower: { d: polar((t) => 40 + 7 * Math.cos(6 * t)) },
  blob: { d: polar((t) => 41 + 5 * Math.sin(3 * t) + 3 * Math.cos(5 * t + 1)) },
  star: { d: starPath(9, 30, 44), rounded: true },
  cross: { d: 'M36 8h28v28h28v28H64v28H36V64H8V36h28z', rounded: true },
  heart: { d: 'M50 88C20 68 8 52 8 34a20 20 0 0 1 42-10 20 20 0 0 1 42 10c0 18-12 34-42 54z' },
  pill: { d: 'M28 14h44a20 20 0 0 1 20 20v32a20 20 0 0 1-20 20H28A20 20 0 0 1 8 66V34a20 20 0 0 1 20-20z' },
};

export function Blob({
  shape,
  color,
  size = 140,
  rotate = 0,
  children,
  className,
  onClick,
}: {
  shape: BlobShape;
  color: string;
  size?: number;
  rotate?: number;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { d, rounded } = SHAPES[shape];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`blob ${className ?? ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <svg viewBox="0 0 100 100" className="blob__shape" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
        <path
          d={d}
          fill={color}
          stroke={rounded ? color : 'none'}
          strokeWidth={rounded ? 10 : 0}
          strokeLinejoin="round"
        />
      </svg>
      <div className="blob__content">{children}</div>
    </Tag>
  );
}
