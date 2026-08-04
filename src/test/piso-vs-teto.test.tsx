/**
 * Piso e teto não podem compartilhar o mesmo medidor.
 *
 * Num teto, subir é ruim; num piso, subir é bom. O cockpit tratava tudo como teto: um
 * município que aplica 27% em saúde — onde o piso constitucional é 15% — recebia mostrador
 * **vermelho** com a leitura "Acima do teto", enquanto a legenda 40px abaixo dizia,
 * correta, "12 p.p. acima do mínimo". O card se contradizia, e a leitura em destaque era
 * a falsa.
 *
 * O backend sempre soube a diferença (`dim_limite_legal.sentido`: 7 tetos, 3 pisos). Era
 * a interface que descartava a informação. Estes testes existem para que ela não volte a
 * descartar.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadialMeter } from '../components/RadialMeter';
import { classifyCeiling, classifyFloor } from '../theme';

describe('classificação por sentido do limite', () => {
  it('cumprir o mínimo com folga é o melhor estado, não o pior', () => {
    // Saúde a 27% com piso de 15%: o município aplica quase o dobro do exigido.
    expect(classifyFloor(27, 15)).toBe('folga');
    // A mesma entrada lida como teto produz o oposto — era este o defeito.
    expect(classifyCeiling(27, 13.5, 14.25, 15)).toBe('maximo');
  });

  it('ficar abaixo do piso é a violação', () => {
    expect(classifyFloor(14.9, 15)).toBe('maximo');
  });

  it('as margens acima do piso são graduadas', () => {
    expect(classifyFloor(15.4, 15)).toBe('prudencial'); // no limite do mínimo
    expect(classifyFloor(16, 15)).toBe('atencao'); // pouco acima
    expect(classifyFloor(17, 15)).toBe('folga');
  });

  it('o teto continua com a semântica de sempre', () => {
    expect(classifyCeiling(55, 48.6, 51.3, 54)).toBe('maximo');
    expect(classifyCeiling(40, 48.6, 51.3, 54)).toBe('folga');
  });
});

describe('leitura do medidor', () => {
  it('piso cumprido lê "Cumpre o mínimo", nunca "Acima do teto"', () => {
    render(
      <RadialMeter atualPct={27} sentido="piso" alerta={15} prud={15.75} max={16.5} gaugeMax={30} />,
    );
    expect(screen.getByText('Cumpre o mínimo')).toBeInTheDocument();
    expect(screen.queryByText('Acima do teto')).not.toBeInTheDocument();
  });

  it('piso descumprido lê "Abaixo do mínimo"', () => {
    render(
      <RadialMeter atualPct={12} sentido="piso" alerta={15} prud={15.75} max={16.5} gaugeMax={30} />,
    );
    expect(screen.getByText('Abaixo do mínimo')).toBeInTheDocument();
  });

  it('sem `sentido`, o comportamento antigo é preservado (teto)', () => {
    // Compatibilidade: os 7 indicadores de teto não passam a prop.
    render(<RadialMeter atualPct={55} alerta={48.6} prud={51.3} max={54} gaugeMax={64.8} />);
    expect(screen.getByText('Acima do teto')).toBeInTheDocument();
  });
});
