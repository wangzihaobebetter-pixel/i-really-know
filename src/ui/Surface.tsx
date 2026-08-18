import React from 'react';

export function Sheet({ elevation = 0, padding = 'var(--space-6)', as: As = 'div', className = '', style, children, ...rest }: {
  elevation?: 0 | 1; padding?: string; as?: React.ElementType; className?: string;
  style?: React.CSSProperties; children: React.ReactNode; [k: string]: unknown;
}) {
  return (
    <As className={`sheet${elevation === 1 ? ' sheet-e1' : ''} ${className}`} style={{ padding, ...style }} {...rest}>
      {children}
    </As>
  );
}

export function Callout({ tone = 'neutral', title, action, children }: {
  tone?: 'neutral' | 'action' | 'shaky' | 'borrowed';
  title?: string; action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className={`callout callout-${tone}`}>
      <div className="grow">
        {title && <div className="t-heading" style={{ marginBottom: 'var(--space-2)' }}>{title}</div>}
        {children && <div className="t-small ink-2">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <p className="t-title" style={{ marginBottom: 'var(--space-5)' }}>{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ lines = 1, height, width, className = '' }: {
  lines?: number; height?: number | string; width?: number | string; className?: string;
}) {
  return (
    <div className={`stack ${className}`} style={{ display: 'grid', gap: 'var(--space-3)' }} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: height ?? 14, width: width ?? (i === lines - 1 && lines > 1 ? '62%' : '100%') }} />
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="row">
      <span className="spinner" aria-hidden />
      {label && <span className="t-small ink-2">{label}</span>}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="visually-hidden">{children}</span>;
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="tt"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
    >
      {children}
      {open && <span className="tt-bubble" role="tooltip">{label}</span>}
    </span>
  );
}
