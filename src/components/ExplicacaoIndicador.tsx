/**
 * Os dois atalhos que levam a IA a **todas** as telas de indicador (Sprint IA-7).
 *
 * A IA-5 entregou o `ExplicacaoIA` e o ligou em quatro telas. Espalhá-lo por mais onze
 * exigiria repetir, em cada página, o mesmo bloco de ente + rótulo + pergunta + chamada —
 * e onze cópias divergem na primeira mudança. Aqui ficam os dois casos que existem de
 * fato, e as páginas passam a declarar só o que é delas: qual indicador, qual período.
 *
 * **Por que dois e não um.** Nem toda tela tem um indicador materializado em
 * `gold.mart_indicador`:
 *
 * - **`ExplicacaoIndicador`** — a tela mostra um indicador apurado (pessoal, dívida,
 *   resultado, mínimos, investimento, RCL por habitante…). A explicação é a da IA-5:
 *   o que mede, como foi apurado, de onde vêm os dados, base legal e o que mudaria a
 *   faixa, com `source_ref` por número.
 * - **`ExplicacaoTela`** — para números ou agregados sem KPI idêntico no mart (receita e
 *   despesa absolutas, resultado em reais, disponibilidade por fonte, patrimônio,
 *   projeções e comparativos). Apontar o "explique este número" para uma razão/per-capita
 *   só porque ela é parecida explicaria bem a coisa errada. Aqui a IA responde o que a
 *   ferramenta sustenta: procedência, cobertura, qualidade e calendário do dado exibido.
 *
 * Nenhum dos dois abre caminho novo para o banco: os dois chamam endpoints que executam a
 * camada de ferramentas, com escopo, licença, `source_ref` e auditoria (G2/G4/G7).
 */
import { ExplicacaoIA } from './ExplicacaoIA';
import { useApp } from '../context/AppContext';
import { buscarCentralDados, explicarNumero } from '../services/backend';

interface ExplicacaoIndicadorProps {
  /** Código em `gold.mart_indicador` (ex.: `pessoal_executivo`). */
  indicador: string;
  /** Nome do indicador como a tela o exibe — entra no título e na descrição acessível. */
  rotulo: string;
  /** Período canônico do número que está na tela. Ausente ⇒ o mais recente. */
  periodo?: string | null;
  /** Recorte temporal da versão que produziu exatamente o número exibido. */
  asOf?: string | null;
  variante?: 'discreto' | 'destaque';
  /** Rótulo do gatilho, quando a tela precisa nomear o indicador (várias no mesmo lugar). */
  rotuloGatilho?: string;
}

export function ExplicacaoIndicador({
  indicador,
  rotulo,
  periodo,
  asOf,
  variante,
  rotuloGatilho = 'Explique este número',
}: ExplicacaoIndicadorProps) {
  const { ente } = useApp();
  return (
    <ExplicacaoIA
      contextKey={[
        'explicar_numero', ente.cod_ibge, indicador, periodo ?? '', asOf ?? '',
      ].join('\u0000')}
      rotulo={rotuloGatilho}
      titulo={`${rotulo}${periodo ? ` · ${periodo}` : ''}`}
      descricao={`Explique ${rotulo}: o que mede, como foi apurado, de onde vêm os dados, qual a base legal e o que mudaria a faixa`}
      variante={variante}
      carregar={() => explicarNumero({ ente: ente.cod_ibge, indicador, periodo, as_of: asOf })}
    />
  );
}

interface ExplicacaoTelaProps {
  /** Página conhecida pela Central de Dados (ex.: `caixa`, `patrimonio`). */
  pagina: string;
  /** Nome da tela, para o título e a descrição acessível. */
  rotulo: string;
  /** A pergunta que esta superfície declara responder. */
  pergunta: string;
  periodo?: string | null;
  /** Recorte temporal da versão que sustenta a tela. */
  asOf?: string | null;
  variante?: 'discreto' | 'destaque';
  /** Permite nomear honestamente o escopo (por exemplo, dados de uma projeção). */
  rotuloGatilho?: string;
}

export function ExplicacaoTela({
  pagina,
  rotulo,
  pergunta,
  periodo,
  asOf,
  variante,
  rotuloGatilho = 'Entenda esta tela',
}: ExplicacaoTelaProps) {
  const { ente } = useApp();
  return (
    <ExplicacaoIA
      contextKey={[
        'central_dados', ente.cod_ibge, pagina, periodo ?? '', asOf ?? '', pergunta,
      ].join('\u0000')}
      rotulo={rotuloGatilho}
      titulo={`${rotulo}${periodo ? ` · ${periodo}` : ''} — de onde vêm estes dados`}
      descricao={`Entenda a tela ${rotulo}: de onde vem o dado, qual a cobertura da fonte e o que o calendário diz sobre o prazo`}
      variante={variante}
      carregar={() => buscarCentralDados({
        ente: ente.cod_ibge,
        pergunta,
        pagina,
        periodo,
        as_of: asOf,
      })}
    />
  );
}
