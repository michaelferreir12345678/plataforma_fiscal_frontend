import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
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

export interface DialogProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  width?: number | string;
  initialFocusRef?: RefObject<HTMLElement>;
  closeLabel?: string;
}

/** Diálogo modal com Escape, ciclo de Tab, foco inicial e restauração ao gatilho. */
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  actions,
  width = 760,
  initialFocusRef,
  closeLabel = 'Fechar diálogo',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const generatedId = useId().replace(/:/g, '');
  const titleId = `dialog-title-${generatedId}`;
  const subtitleId = `dialog-subtitle-${generatedId}`;
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusInitial = () => {
      const requested = initialFocusRef?.current;
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (requested ?? first ?? closeRef.current ?? dialogRef.current)?.focus();
    };
    const frame = window.requestAnimationFrame(focusInitial);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
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
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialFocusRef]);

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={closeFromBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 16px',
        background: colors.overlay,
      }}
    >
      <div
        ref={dialogRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        style={{
          width: typeof width === 'number' ? `min(${width}px, 100%)` : width,
          maxWidth: '100%',
          maxHeight: '88vh',
          overflow: 'auto',
          padding: 18,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          background: colors.surface,
          boxShadow: '0 18px 48px rgba(15, 26, 20, 0.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
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
            }}
          >
            Fechar
          </button>
        </div>
        <div role="document">{children}</div>
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
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
