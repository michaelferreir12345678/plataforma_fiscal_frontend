import type { Ente } from '../types';

/** Grade de entes da carteira/estado (mock — top 20 do CE por pessoal). */
export const entes: Ente[] = [
  { name: 'Fortaleza', pop: '2.703.391', pessoal: 52.82, dcl: 87.1, saude: 16.42, educacao: 28.13, msc: 'OK' },
  { name: 'Sobral', pop: '210.711', pessoal: 54.23, dcl: 28.7, saude: 16.2, educacao: 28.9, msc: 'Pend' },
  { name: 'Iguatu', pop: '103.220', pessoal: 53.05, dcl: 41.6, saude: 16.4, educacao: 27.31, msc: 'OK' },
  { name: 'Limoeiro do Norte', pop: '60.180', pessoal: 51.74, dcl: 31.0, saude: 16.55, educacao: 28.0, msc: 'OK' },
  { name: 'Juazeiro do Norte', pop: '278.264', pessoal: 51.48, dcl: 33.5, saude: 18.62, educacao: 27.5, msc: 'OK' },
  { name: 'Aquiraz', pop: '85.146', pessoal: 51.41, dcl: 38.9, saude: 16.13, educacao: 27.04, msc: 'OK' },
  { name: 'Aracati', pop: '74.470', pessoal: 50.4, dcl: 27.3, saude: 17.2, educacao: 28.3, msc: 'OK' },
  { name: 'Caucaia', pop: '362.223', pessoal: 49.61, dcl: 41.2, saude: 15.91, educacao: 26.4, msc: 'OK' },
  { name: 'Acaraú', pop: '60.218', pessoal: 49.61, dcl: 28.5, saude: 17.04, educacao: 27.1, msc: 'OK' },
  { name: 'Pacatuba', pop: '85.470', pessoal: 49.71, dcl: 33.1, saude: 15.87, educacao: 26.1, msc: 'OK' },
  { name: 'Crato', pop: '135.327', pessoal: 49.04, dcl: 19.2, saude: 17.83, educacao: 27.22, msc: 'OK' },
  { name: 'Maranguape', pop: '125.660', pessoal: 48.91, dcl: 31.5, saude: 15.32, educacao: 25.94, msc: 'OK' },
  { name: 'Russas', pop: '80.207', pessoal: 48.3, dcl: 24.7, saude: 16.3, educacao: 28.1, msc: 'OK' },
  { name: 'Maracanaú', pop: '230.371', pessoal: 47.92, dcl: 56.4, saude: 17.41, educacao: 27.92, msc: 'OK' },
  { name: 'Camocim', pop: '62.034', pessoal: 47.8, dcl: 22.1, saude: 16.1, educacao: 26.8, msc: 'Pend' },
  { name: 'Quixadá', pop: '85.612', pessoal: 47.2, dcl: 25.4, saude: 17.2, educacao: 28.4, msc: 'OK' },
  { name: 'Quixeramobim', pop: '82.453', pessoal: 46.5, dcl: 21.4, saude: 18.1, educacao: 27.5, msc: 'OK' },
  { name: 'Itapipoca', pop: '130.585', pessoal: 46.13, dcl: 22.8, saude: 16.71, educacao: 26.45, msc: 'OK' },
  { name: 'Tianguá', pop: '74.840', pessoal: 45.2, dcl: 19.5, saude: 15.91, educacao: 27.2, msc: 'OK' },
  { name: 'Icó', pop: '64.456', pessoal: 44.1, dcl: 16.7, saude: 16.92, educacao: 27.6, msc: 'OK' },
];

/** Gera o grid de hexágonos do mapa do Ceará (184 entes) de forma determinística. */
export interface Hex {
  id: number;
  x: number;
  y: number;
  points: string;
  fill: string;
  stroke: string;
}

export function buildHexes(): { hexes: Hex[]; fortaleza: Hex } {
  const rowCounts = [4, 6, 8, 10, 12, 14, 16, 18, 18, 18, 16, 14, 12, 10, 8];
  const r = 8;
  const hexW = Math.sqrt(3) * r;
  const vSpacing = 1.5 * r;
  const maxRowWidth = 18 * hexW;

  let seed = 9173;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const hexes: Hex[] = [];
  let idx = 0;
  rowCounts.forEach((count, rowIdx) => {
    const rowWidth = count * hexW;
    const xOffset = (maxRowWidth - rowWidth) / 2;
    for (let i = 0; i < count; i++) {
      const cx = xOffset + i * hexW + hexW / 2 + 6;
      const cy = rowIdx * vSpacing + r + 8;
      let roll = rnd();
      if (rowIdx < 3 && i > count - 5) roll += 0.18;
      if (rowIdx > 11) roll += 0.06;
      let fill: string;
      let stroke: string;
      if (roll < 0.6) {
        fill = '#9CD7B8';
        stroke = '#1F9D6B';
      } else if (roll < 0.8) {
        fill = '#F2D886';
        stroke = '#E8B53A';
      } else if (roll < 0.94) {
        fill = '#EFB287';
        stroke = '#E07A2F';
      } else if (roll < 0.985) {
        fill = '#E89999';
        stroke = '#D14343';
      } else {
        fill = '#C0C7CE';
        stroke = '#5B6B7B';
      }
      const points: string[] = [];
      for (let k = 0; k < 6; k++) {
        const angle = (Math.PI / 3) * k + Math.PI / 6;
        points.push(`${(cx + r * 0.92 * Math.cos(angle)).toFixed(1)},${(cy + r * 0.92 * Math.sin(angle)).toFixed(1)}`);
      }
      hexes.push({ id: idx++, x: cx, y: cy, points: points.join(' '), fill, stroke });
    }
  });

  const fort = hexes.find((h) => h.x > 200 && h.y > 30 && h.y < 60) ?? hexes[10];
  fort.fill = '#EFB287';
  fort.stroke = '#E07A2F';
  return { hexes, fortaleza: fort };
}

export const carteiraResumo = [
  { label: 'Entes monitorados', value: '184', sub: 'municípios + 1 UF', foot: '▲ 100% cobertura RREO', footColor: '#1F9D6B', accent: '#1B3A2E' },
  { label: 'Folga · pessoal', value: '64%', sub: '117 entes', foot: '< 48,6% da RCL', footColor: '#5B6B5F', accent: '#1F9D6B' },
  { label: 'Alerta', value: '21%', sub: '38 entes', foot: '▲ +4 vs. quad. anterior', footColor: '#C49019', accent: '#E8B53A' },
  { label: 'Prudencial', value: '12%', sub: '22 entes', foot: 'vedações LRF ativas', footColor: '#E07A2F', accent: '#E07A2F' },
  { label: 'Acima do teto', value: '3%', sub: '7 entes', foot: 'prazo recondução: 2 quad.', footColor: '#D14343', accent: '#D14343' },
];
