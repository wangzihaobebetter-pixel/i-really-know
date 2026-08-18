import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface FieldShellProps {
  label?: string; hint?: string; error?: string; counter?: string;
  htmlFor?: string; children: React.ReactNode; className?: string;
}

function FieldShell({ label, hint, error, counter, htmlFor, children, className = '' }: FieldShellProps) {
  return (
    <div className={`field ${className}`}>
      {(label || counter) && (
        <div className="row-between" style={{ marginBottom: 'var(--space-3)' }}>
          {label ? <label className="field-label" htmlFor={htmlFor} style={{ marginBottom: 0 }}>{label}</label> : <span />}
          {counter && <span className="field-counter">{counter}</span>}
        </div>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; hint?: string; error?: string; mono?: boolean;
}

export function Input({ label, hint, error, mono, className = '', id, ...rest }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <input id={fid} className={`control${mono ? ' control-mono' : ''} ${className}`} aria-invalid={!!error} {...rest} />
    </FieldShell>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; hint?: string; error?: string; mono?: boolean; counter?: boolean; autogrow?: boolean;
}

export function Textarea({
  label, hint, error, mono, counter, autogrow, className = '', id, value, onChange, maxLength, ...rest
}: TextareaProps) {
  const auto = useId();
  const fid = id ?? auto;
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const len = typeof value === 'string' ? value.length : 0;

  React.useEffect(() => {
    if (!autogrow || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 640)}px`;
  }, [value, autogrow]);

  return (
    <FieldShell
      label={label} hint={hint} error={error} htmlFor={fid}
      counter={counter ? (maxLength ? `${len} / ${maxLength}` : `${len}`) : undefined}
    >
      <textarea
        id={fid} ref={ref} value={value} onChange={onChange} maxLength={maxLength}
        className={`control${mono ? ' control-mono' : ''} ${className}`} aria-invalid={!!error} {...rest}
      />
    </FieldShell>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; hint?: string; error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, error, options, className = '', id, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fid}>
      <div className="select-wrap">
        <select id={fid} className={`control ${className}`} {...rest}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} strokeWidth={1.75} />
      </div>
    </FieldShell>
  );
}

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', ariaLabel }: SegmentedProps<T>) {
  return (
    <div className={`segmented${size === 'sm' ? ' segmented-sm' : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value} type="button" className="segmented-opt"
          aria-pressed={o.value === value} title={o.hint}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface ToggleProps {
  label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean;
}

export function Toggle({ label, checked, onChange, hint, disabled }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span>
        <span className="t-body">{label}</span>
        {hint && <span className="t-small ink-3" style={{ display: 'block' }}>{hint}</span>}
      </span>
    </label>
  );
}
