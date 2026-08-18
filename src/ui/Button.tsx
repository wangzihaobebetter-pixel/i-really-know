import React from 'react';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, loading, block,
  className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}${block ? ' btn-block' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Required: icon-only controls must still be nameable by a screen reader. */
  label: string;
  size?: 'sm' | 'md';
}

export function IconButton({ icon, label, size = 'md', className = '', ...rest }: IconButtonProps) {
  return (
    <button className={`icon-btn icon-btn-${size} ${className}`} aria-label={label} title={label} {...rest}>
      {icon}
    </button>
  );
}
