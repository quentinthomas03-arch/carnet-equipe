import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { useTeam } from '../db/hooks';
import { buildToday } from '../domain/today';
import { todayISO } from '../domain/dates';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Équipe', icon: 'team' },
  { to: '/aujourdhui', label: "Aujourd'hui", icon: 'today' },
  { to: '/points', label: 'Points', icon: 'meetings' },
  { to: '/bilans', label: 'Bilans', icon: 'reviews' },
];

function Tab({ to, label, icon, badge }: (typeof TABS)[number] & { badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative flex-1 min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'text-accent font-semibold' : 'text-muted font-medium'}`
      }
    >
      <Icon name={icon} size={24} />
      {label}
      {!!badge && (
        <span className="absolute top-0.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-surface text-[11px] font-bold flex items-center justify-center" aria-label={`${badge} élément(s) urgent(s)`}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

/** Barre d'onglets fixe en bas, avec le bouton « + » central de saisie rapide. */
export function TabBar({ onQuickAdd }: { onQuickAdd: () => void }) {
  const team = useTeam();
  const badge = team
    ? buildToday(team.entries.filter((e) => e.collaboratorId === 'team' || !team.byId.get(e.collaboratorId)?.archivedAt), team.active, todayISO()).badge
    : 0;
  return (
    <nav aria-label="Navigation principale" className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-safe">
      <div className="flex items-center max-w-lg mx-auto px-2 pt-1">
        <Tab {...TABS[0]} />
        <Tab {...TABS[1]} badge={badge} />
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Saisie rapide : noter quelque chose"
            className="w-[58px] h-[58px] -mt-6 rounded-full bg-accent text-accent-ink flex items-center justify-center shadow-[0_6px_16px_rgba(14,94,111,0.35)] active:scale-95 transition-transform"
          >
            <Icon name="plus" size={28} strokeWidth={2.4} />
          </button>
        </div>
        <Tab {...TABS[2]} />
        <Tab {...TABS[3]} />
      </div>
    </nav>
  );
}
