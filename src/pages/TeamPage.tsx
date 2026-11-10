import { Link } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';
import { Icon } from '../ui/Icon';
import { BackupBanner } from '../components/BackupBanner';

export function TeamPage() {
  return (
    <>
      <PageHeader
        title="Équipe"
        action={
          <Link to="/reglages" aria-label="Réglages" className="w-11 h-11 rounded-full bg-surface-2 text-muted flex items-center justify-center">
            <Icon name="settings" size={22} strokeWidth={1.8} />
          </Link>
        }
      />
      <BackupBanner />
      <section className="card mx-4 p-5 flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-accent uppercase tracking-wider">Phase 1</span>
        <p className="text-[15px] leading-snug">
          Ici s'afficheront tes collaborateurs, triés pour que ceux à voir en priorité remontent en haut :
          dernier et prochain point, sujets à aborder, promesses ouvertes, alertes de retard.
        </p>
      </section>
    </>
  );
}
