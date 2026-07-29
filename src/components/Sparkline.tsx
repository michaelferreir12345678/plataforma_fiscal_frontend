interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  label?: string;
}

/** Mini-gráfico de linha para cards de KPI. */
export function Sparkline({ values, color, width = 62, height = 22, label }: SparklineProps) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }));
  const last = pts[pts.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <polyline
        points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        stroke={color}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r={2} fill={color} />
    </svg>
  );
}
