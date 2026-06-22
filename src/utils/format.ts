/** Formata número no padrão pt-BR (vírgula decimal). */
export function fmt(n: number, decimals = 1): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Percentual no padrão pt-BR, ex.: 52,82%. */
export function pct(n: number, decimals = 2): string {
  return fmt(n, decimals) + '%';
}

/** Valor em R$ milhões, ex.: "R$ 6.786,4 M". */
export function brl(n: number, decimals = 1): string {
  return `R$ ${fmt(n, decimals)} M`;
}

/** SVG: caminho de arco. 0° = topo, sentido horário. */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const s = rad(startDeg);
  const e = rad(endDeg);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const sweep = endDeg - startDeg;
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweepFlag} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Ponto sobre círculo no ângulo informado (0 = topo, horário). */
export function pointAt(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
