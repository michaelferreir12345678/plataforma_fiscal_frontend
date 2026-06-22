interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

/** Mini-gráfico de linha para cards de KPI. */
export function Sparkline({ values, color, width = 62, height = 22 }: SparklineProps) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }));
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
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
