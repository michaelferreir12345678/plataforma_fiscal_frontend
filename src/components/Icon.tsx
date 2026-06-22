import type { CSSProperties, ReactNode } from 'react';

interface IconProps {
  size?: number;
  stroke?: string;
  sw?: number;
  fill?: string;
  viewBox?: string;
  children: ReactNode;
  style?: CSSProperties;
}

/** Wrapper SVG enxuto — passe os <path>/<circle> como children. */
export function Icon({
  size = 14,
  stroke = 'currentColor',
  sw = 1.5,
  fill = 'none',
  viewBox = '0 0 16 16',
  children,
  style,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  );
}
