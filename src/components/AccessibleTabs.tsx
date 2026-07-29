import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { colors } from '../theme';

export interface AccessibleTab<T extends string> {
  id: T;
  label: ReactNode;
}

interface AccessibleTabsProps<T extends string> {
  tabs: AccessibleTab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idPrefix: string;
  style?: CSSProperties;
}

export const tabPanelId = (prefix: string, value: string) => `${prefix}-panel-${value}`;
export const tabId = (prefix: string, value: string) => `${prefix}-tab-${value}`;

/** Tabs institucionais com roving tabindex e setas/Home/End conforme o padrão WAI-ARIA. */
export function AccessibleTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  style,
}: AccessibleTabsProps<T>) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    const selected = tabs[next].id;
    onChange(selected);
    window.requestAnimationFrame(() => document.getElementById(tabId(idPrefix, selected))?.focus());
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: 'flex',
        gap: 2,
        maxWidth: '100%',
        overflowX: 'auto',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        padding: 2,
        ...style,
      }}
    >
      {tabs.map((tab, index) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => move(event, index)}
            style={{
              flex: '0 0 auto',
              padding: '5px 12px',
              borderRadius: 4,
              border: selected ? `1px solid ${colors.border}` : '1px solid transparent',
              background: selected ? colors.surface : 'transparent',
              color: selected ? colors.primary : colors.muted,
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
