import type { ReactNode } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { BackupBanner } from '../components/BackupBanner';

/** Page en attente de sa phase de développement. */
export function Placeholder({ title, subtitle, phase, children }: { title: string; subtitle?: string; phase: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <BackupBanner />
      <section className="card mx-4 p-5 flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-accent uppercase tracking-wider">{phase}</span>
        <div className="text-[15px] leading-snug text-ink">{children}</div>
      </section>
    </>
  );
}
