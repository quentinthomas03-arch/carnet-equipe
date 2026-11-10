import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Puce sélectionnable (filtres, choix multiples). 40 px de haut minimum. */
export function Chip({ selected, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`min-h-[40px] px-3.5 rounded-full text-[15px] whitespace-nowrap inline-flex items-center gap-2 transition-colors ${
        selected ? 'bg-ink text-bg font-semibold' : 'bg-surface border border-line text-ink font-medium'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Étiquette d'information (non cliquable). */
export function Tag({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'danger' | 'ok' | 'accent'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    ok: 'bg-ok-soft text-ok',
    accent: 'bg-accent-soft text-accent-soft-ink',
  };
  return <span className={`text-[13px] px-2 py-1 rounded-lg whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}
