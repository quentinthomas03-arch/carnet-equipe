import { Link } from 'react-router-dom';
import { useTeam } from '../db/hooks';
import type { Entry } from '../db/types';
import { buildToday } from '../domain/today';
import { formatLong, formatShort, todayISO } from '../domain/dates';
import { isPending } from '../domain/entries';
import { addDaysISO } from '../domain/dates';
import { toggleOnboardingTask } from '../db/repo';
import { PageHeader } from '../ui/PageHeader';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { BackupBanner } from '../components/BackupBanner';
import { EntryRow } from '../components/EntryRow';
import { MeetingTag } from '../components/CollaboratorCard';

export function TodayPage() {
  const team = useTeam();
  const today = todayISO();
  if (!team) return null;
  const view = buildToday(team.entries.filter((e) => e.collaboratorId === 'team' || !team.byId.get(e.collaboratorId)?.archivedAt), team.active, today);
  const pending = team.entries.filter((e) => isPending(e) && (e.collaboratorId === 'team' || !team.byId.get(e.collaboratorId)?.archivedAt));
  const topics = pending.filter((e) => e.type === 'topic').length;
  const commitments = pending.filter((e) => e.type === 'myCommitment' || e.type === 'theirCommitment').length;
  const horizon = addDaysISO(today, 7);
  const obTasks = [...team.onboardings.values()]
    .filter((o) => !team.byId.get(o.collaboratorId)?.archivedAt)
    .flatMap((o) => o.tasks.filter((t) => !t.done && t.dueDate <= horizon).map((t) => ({ o, t })))
    .sort((a, b) => a.t.dueDate.localeCompare(b.t.dueDate));
  const nothing = !view.late.length && !view.today.length && !view.week.length && !view.meetings.length && !obTasks.length;

  const list = (title: string, entries: Entry[], tone = '') =>
    entries.length > 0 && (
      <section className="flex flex-col gap-2">
        <h2 className={`section-title px-1 ${tone}`}>{title} · {entries.length}</h2>
        {entries.map((e) => <EntryRow key={e.id} entry={e} collaborator={team.byId.get(e.collaboratorId)} showWho />)}
      </section>
    );

  return (
    <>
      <PageHeader title="Aujourd'hui" subtitle={formatLong(today).replace(/^./, (c) => c.toUpperCase())} />
      <BackupBanner />
      <div className="px-4 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/a-aborder" className="card p-4 flex flex-col gap-1 active:opacity-80">
            <span className="text-[26px] font-bold">{topics}</span>
            <span className="text-[14px] text-muted flex items-center justify-between">Sujets à aborder <Icon name="chevron" size={16} /></span>
          </Link>
          <Link to="/engagements" className="card p-4 flex flex-col gap-1 active:opacity-80">
            <span className="text-[26px] font-bold">{commitments}</span>
            <span className="text-[14px] text-muted flex items-center justify-between">Engagements ouverts <Icon name="chevron" size={16} /></span>
          </Link>
        </div>

        {view.meetings.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Points à faire</h2>
            {view.meetings.map((s) => (
              <Link key={s.collaborator.id} to={`/points/${s.collaborator.id}/preparer`} className="card px-4 py-3 flex items-center gap-3 active:opacity-80">
                <Avatar firstName={s.collaborator.firstName} lastName={s.collaborator.lastName} color={s.collaborator.color} size={34} />
                <span className="flex-1 font-medium">{s.collaborator.firstName} {s.collaborator.lastName}</span>
                <MeetingTag s={s.schedule} />
                <span className="text-[14px] font-semibold text-accent">Préparer</span>
              </Link>
            ))}
          </section>
        )}
        {obTasks.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Onboarding · {obTasks.length}</h2>
            <div className="card px-4 py-1">
              {obTasks.map(({ o, t }) => {
                const c = team.byId.get(o.collaboratorId);
                const late = t.dueDate < today;
                return (
                  <div key={t.id} className="flex items-start gap-3 py-2 border-b border-line last:border-0">
                    <input type="checkbox" checked={false} aria-label={t.label} onChange={() => toggleOnboardingTask(o.id, t.id)} className="w-6 h-6 mt-0.5 accent-[rgb(var(--accent))]" />
                    <Link to={`/c/${o.collaboratorId}?onglet=onboarding`} className="flex-1">
                      <span className="block text-[15px] leading-snug">{t.label}</span>
                      <span className={`block text-[13px] ${late ? 'text-danger font-semibold' : 'text-muted'}`}>{c?.firstName} · {late ? 'en retard' : formatShort(t.dueDate)}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {list('En retard', view.late, 'text-danger')}
        {list("Aujourd'hui", view.today)}
        {list('Dans les 7 jours', view.week)}

        {nothing && (
          <section className="card p-6 text-center flex flex-col gap-1">
            <p className="text-[17px] font-semibold">Rien d'urgent aujourd'hui</p>
            <p className="text-[15px] text-muted">Aucun engagement en retard ni point à planifier.</p>
          </section>
        )}
      </div>
    </>
  );
}
