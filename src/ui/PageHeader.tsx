import type { ReactNode } from 'react';
import { formatLong, todayISO } from '../domain/dates';

/**
 * En-tête des écrans principaux : surtitre coloré (date du jour), grand titre, sous-titre.
 */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: string; action?: ReactNode; eyebrow?: string | false }) {
  const kicker = eyebrow === false ? null : eyebrow ?? formatLong(todayISO());
  return (
    <header className="pt-safe px-5 pb-3">
      <div className="flex items-end justify-between gap-3 min-h-[60px] mt-2">
        <div className="min-w-0">
          {kicker && <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-accent">{kicker}</p>}
          <h1 className="text-[31px] leading-tight font-extrabold tracking-tight">{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="text-[15px] text-muted mt-0.5">{subtitle}</p>}
    </header>
  );
}
