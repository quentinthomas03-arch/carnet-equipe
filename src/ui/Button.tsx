import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink shadow-[0_6px_14px_-8px_rgb(var(--accent))]',
  secondary: 'bg-surface-2 text-ink',
  ghost: 'bg-transparent text-accent',
  danger: 'bg-danger-soft text-danger',
};

/** Bouton standard : 48 px de haut minimum (cible tactile confortable). */
export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-[48px] px-5 rounded-2xl font-semibold text-[16px] inline-flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-40 transition-opacity ${VARIANTS[variant]} ${className}`}
    />
  );
}
