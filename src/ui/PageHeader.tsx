import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pt-safe px-5 pb-2">
      <div className="flex items-center justify-between min-h-[52px] mt-2">
        <h1 className="text-[30px] font-bold tracking-tight">{title}</h1>
        {action}
      </div>
      {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
    </header>
  );
}
