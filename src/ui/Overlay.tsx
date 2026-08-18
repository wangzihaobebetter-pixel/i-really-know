import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { translate } from '../i18n';
import { id as newId } from '../lib/ids';

/* ---------- Dialog (auto-becomes a bottom sheet under 640px via CSS) ---------- */

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Blocks backdrop/Escape dismissal for destructive confirmations. */
  dismissable?: boolean;
}

export function Dialog({ open, onClose, title, footer, children, dismissable = true }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="dialog-head row-between">
          <h2 className="t-title">{title}</h2>
          {dismissable && <IconButton icon={<X size={18} strokeWidth={1.75} />} label={translate('common.action.close')} onClick={onClose} size="sm" />}
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Explicit bottom-sheet alias for mobile-first surfaces. Same component, same CSS. */
export const BottomSheet = Dialog;

/* ---------- Toast ---------- */

export type ToastTone = 'neutral' | 'owned' | 'borrowed';
export interface ToastItem { id: string; tone: ToastTone; message: string; action?: { label: string; onClick: () => void } }

interface ToastApi { push: (message: string, opts?: { tone?: ToastTone; action?: ToastItem['action']; ms?: number }) => void }

const ToastCtx = createContext<ToastApi>({ push: () => {} });

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback<ToastApi['push']>((message, opts) => {
    const item: ToastItem = { id: newId('t'), tone: opts?.tone ?? 'neutral', message, action: opts?.action };
    setItems((xs) => [...xs, item]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== item.id)), opts?.ms ?? 4200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-host" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast-${t.tone}`}>
              <span className="grow t-small">{t.message}</span>
              {t.action && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'inherit' }} onClick={t.action.onClick}>
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
