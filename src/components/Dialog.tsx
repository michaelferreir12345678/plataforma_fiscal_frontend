import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { colors, typeScale } from '../theme';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Folga entre o gatilho e o painel, e entre o painel e a borda da janela. */
const FOLGA = 8;
const MARGEM_JANELA = 12;

interface Posicao {
  left: number;
  top: number;
}

export interface DialogProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  width?: number | string;
  initialFocusRef?: RefObject<HTMLElement>;
  closeLabel?: string;
  /**
   * `false` cria um painel não modal: sem backdrop bloqueante, sem travar o scroll e sem
   * prender o Tab. Útil para ajuda contextual que deve coexistir com a tela.
   */
  modal?: boolean;
  /**
   * Elemento que abriu o painel. Com ele, o painel nasce **ao lado do gatilho** em vez de
   * no alto da janela.
   *
   * Sem isto, quem clicava "Explique este número" no rodapé de uma tela longa via o painel
   * aparecer no topo — a resposta some do campo de visão e o gestor perde de vista o
   * número que motivou a pergunta. Explicação contextual tem de ficar perto do contexto.
   */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Permite arrastar o painel pelo cabeçalho (só faz sentido com `anchorRef`). */
  arrastavel?: boolean;
  /**
   * Teto de altura da área de conteúdo. O cabeçalho e as ações ficam **fora** dela: numa
   * resposta longa, o botão Fechar continua visível em vez de exigir rolagem até o fim.
   */
  maxAlturaConteudo?: number | string;
}

/** Mantém o painel inteiro dentro da janela, mesmo depois de arrastado ou redimensionado. */
function conter(pos: Posicao, largura: number, altura: number): Posicao {
  const maxLeft = Math.max(MARGEM_JANELA, window.innerWidth - largura - MARGEM_JANELA);
  const maxTop = Math.max(MARGEM_JANELA, window.innerHeight - altura - MARGEM_JANELA);
  return {
    left: Math.min(Math.max(MARGEM_JANELA, pos.left), maxLeft),
    top: Math.min(Math.max(MARGEM_JANELA, pos.top), maxTop),
  };
}

/** Diálogo com Escape, ciclo de Tab, foco inicial e restauração ao gatilho. */
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  actions,
  width = 760,
  initialFocusRef,
  closeLabel = 'Fechar diálogo',
  modal = true,
  anchorRef,
  arrastavel = false,
  maxAlturaConteudo,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const generatedId = useId().replace(/:/g, '');
  const titleId = `dialog-title-${generatedId}`;
  const subtitleId = `dialog-subtitle-${generatedId}`;
  onCloseRef.current = onClose;

  const ancorado = Boolean(anchorRef);
  const [pos, setPos] = useState<Posicao | null>(null);
  const arrasto = useRef<{ dx: number; dy: number } | null>(null);

  // Posição inicial: colada ao gatilho, contida na janela. `useLayoutEffect` porque medir
  // depois da pintura faria o painel aparecer no lugar errado por um quadro.
  useLayoutEffect(() => {
    if (!ancorado) return;
    const gatilho = anchorRef?.current?.getBoundingClientRect();
    const painel = dialogRef.current?.getBoundingClientRect();
    if (!gatilho || !painel) return;
    const abaixo = gatilho.bottom + FOLGA;
    const cabeAbaixo = abaixo + painel.height + MARGEM_JANELA <= window.innerHeight;
    setPos(
      conter(
        {
          left: gatilho.left,
          // Não cabendo abaixo, sobe para cima do gatilho em vez de vazar pelo rodapé.
          top: cabeAbaixo ? abaixo : gatilho.top - painel.height - FOLGA,
        },
        painel.width,
        painel.height,
      ),
    );
  }, [ancorado, anchorRef]);

  // Redimensionar a janela não pode empurrar o painel para fora dela.
  useEffect(() => {
    if (!ancorado) return;
    const aoRedimensionar = () => {
      const painel = dialogRef.current?.getBoundingClientRect();
      if (!painel) return;
      setPos((atual) => (atual ? conter(atual, painel.width, painel.height) : atual));
    };
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, [ancorado]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    if (modal) document.body.style.overflow = 'hidden';

    const focusInitial = () => {
      const requested = initialFocusRef?.current;
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      // `preventScroll` é o que impede a página de saltar: focar um elemento dentro de um
      // painel recém-aberto rolava a tela até ele, e o gestor perdia a posição de leitura.
      (requested ?? first ?? closeRef.current ?? dialogRef.current)?.focus({
        preventScroll: true,
      });
    };
    const frame = window.requestAnimationFrame(focusInitial);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (!modal || event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (modal) document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [initialFocusRef, modal]);

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (modal && event.target === event.currentTarget) onClose();
  };

  const aoArrastar = useCallback((event: globalThis.PointerEvent) => {
    const inicio = arrasto.current;
    const painel = dialogRef.current?.getBoundingClientRect();
    if (!inicio || !painel) return;
    setPos(
      conter(
        { left: event.clientX - inicio.dx, top: event.clientY - inicio.dy },
        painel.width,
        painel.height,
      ),
    );
  }, []);

  const encerrarArrasto = useCallback(() => {
    arrasto.current = null;
    document.removeEventListener('pointermove', aoArrastar);
    document.removeEventListener('pointerup', encerrarArrasto);
  }, [aoArrastar]);

  const iniciarArrasto = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!arrastavel) return;
    // Só arrasta pelo espaço vazio do cabeçalho: clicar no botão Fechar tem de fechar.
    if ((event.target as HTMLElement).closest('button')) return;
    const painel = dialogRef.current?.getBoundingClientRect();
    if (!painel) return;
    arrasto.current = { dx: event.clientX - painel.left, dy: event.clientY - painel.top };
    document.addEventListener('pointermove', aoArrastar);
    document.addEventListener('pointerup', encerrarArrasto);
  };

  useEffect(() => encerrarArrasto, [encerrarArrasto]);

  const posicaoPainel: CSSProperties = ancorado
    ? {
        position: 'fixed',
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        // Enquanto a posição não foi medida o painel fica invisível, não fora da tela em
        // lugar visível: um salto de um quadro é exatamente o incômodo que se corrige aqui.
        visibility: pos ? 'visible' : 'hidden',
      }
    : {};

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={closeFromBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: ancorado ? 'block' : 'flex',
        alignItems: 'flex-start',
        justifyContent: modal ? 'center' : 'flex-end',
        padding: ancorado ? 0 : '6vh 16px',
        background: modal ? colors.overlay : 'transparent',
        pointerEvents: modal ? 'auto' : 'none',
      }}
    >
      <div
        ref={dialogRef}
        className="dialog-panel"
        role="dialog"
        aria-modal={modal ? 'true' : undefined}
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100%)` : width,
          maxWidth: ancorado ? `calc(100vw - ${MARGEM_JANELA * 2}px)` : '100%',
          maxHeight: '88vh',
          // Com área de conteúdo própria, o painel não rola inteiro: cabeçalho e ações
          // ficam fixos e só o texto rola.
          display: 'flex',
          flexDirection: 'column',
          overflow: maxAlturaConteudo ? 'hidden' : 'auto',
          padding: 18,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          background: colors.surface,
          boxShadow: '0 18px 48px rgba(15, 26, 20, 0.22)',
          pointerEvents: 'auto',
          ...posicaoPainel,
        }}
      >
        <div
          onPointerDown={iniciarArrasto}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 14,
            flexShrink: 0,
            cursor: arrastavel ? 'move' : undefined,
            // Sem isto, arrastar seleciona o título como se fosse texto.
            userSelect: arrastavel ? 'none' : undefined,
            touchAction: arrastavel ? 'none' : undefined,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                color: colors.ink,
                fontSize: 16,
                lineHeight: 1.3,
                fontWeight: 600,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                id={subtitleId}
                style={{
                  marginTop: 4,
                  color: colors.muted,
                  fontSize: typeScale.caption,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              minWidth: 34,
              minHeight: 30,
              padding: '4px 9px',
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              background: colors.surface,
              color: colors.ink,
              fontSize: typeScale.caption,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Fechar
          </button>
        </div>
        <div
          role="document"
          style={
            maxAlturaConteudo
              ? { maxHeight: maxAlturaConteudo, overflowY: 'auto', minHeight: 0, flex: 1 }
              : undefined
          }
        >
          {children}
        </div>
        {actions && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
