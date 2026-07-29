/**
 * Diálogo de **memória de cálculo** (Sprint 25 — padrão transversal).
 *
 * Pergunta gerencial que responde: **"como este número foi apurado e posso defendê-lo
 * no tribunal de contas?"** Os endpoints `/memoria` de cada módulo existem desde as
 * Sprints 5–12 e nenhuma tela os consumia (auditoria §6). O conteúdo é carregado
 * **sob demanda** (só ao abrir), para não pesar o carregamento da página.
 */
import { useState, type ReactNode } from 'react';
import { colors, font } from '../theme';
import { Async } from './AsyncState';
import { Dialog } from './Dialog';
import { useResource } from '../context/AppContext';

interface MemoriaDialogProps<T> {
  titulo: string;
  /** Rótulo do botão que abre o diálogo. */
  rotulo?: string;
  subtitulo?: ReactNode;
  carregar: () => Promise<T>;
  deps: unknown[];
  children: (data: T) => ReactNode;
}

export function MemoriaDialog<T>({
  titulo,
  rotulo = 'Memória de cálculo',
  subtitulo,
  carregar,
  deps,
  children,
}: MemoriaDialogProps<T>) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} style={gatilho}>
        ƒ {rotulo}
      </button>
      {aberto && (
        <Modal titulo={titulo} subtitulo={subtitulo} onClose={() => setAberto(false)}>
          <Conteudo carregar={carregar} deps={deps}>
            {children}
          </Conteudo>
        </Modal>
      )}
    </>
  );
}

function Conteudo<T>({
  carregar,
  deps,
  children,
}: {
  carregar: () => Promise<T>;
  deps: unknown[];
  children: (data: T) => ReactNode;
}) {
  const res = useResource(carregar, deps);
  return <Async res={res}>{children}</Async>;
}

function Modal({
  titulo,
  subtitulo,
  onClose,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog title={titulo} subtitle={subtitulo} onClose={onClose}>
      {children}
    </Dialog>
  );
}

/** Linha rótulo → valor da memória (fórmula, total, verificação). */
export function LinhaMemoria({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: `1px dashed ${colors.borderSoft}` }}>
      <div style={{ width: 210, fontSize: 11.5, color: colors.muted }}>{rotulo}</div>
      <div style={{ flex: 1, fontSize: 12, color: colors.ink, fontFamily: font.mono, wordBreak: 'break-word' }}>
        {children}
      </div>
    </div>
  );
}

const gatilho = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  borderRadius: 4,
  padding: '3px 9px',
  fontSize: 11,
  color: colors.ink,
  cursor: 'pointer',
  fontFamily: font.mono,
} as const;
