import type { ButtonHTMLAttributes, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type Size = 'md' | 'icon';

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
  secondary: 'border border-control bg-surface text-ink shadow-xs hover:bg-hover',
  ghost: 'text-ink-muted hover:bg-hover hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
  'danger-ghost': 'text-ink-muted hover:bg-danger-soft hover:text-danger',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4',
  icon: 'size-9',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
