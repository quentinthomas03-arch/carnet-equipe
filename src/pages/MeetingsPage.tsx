import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeam } from '../db/hooks';
import { formatShort } from '../domain/dates';
import { meetingSummary } from '../domain/meetingPrep';
import { PageHeader } from '../ui/PageHeader';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { BackupBanner } from '../components/BackupBanner';
import { MeetingTag } from '../components/CollaboratorCard';
import { CalendarExportSheet } from '../components/CalendarExport';

/** Onglet Points : prochains points (par date), accès direct à la préparation, derniers points, export calendrier. */
export function MeetingsPage() {
  const team = useTeam();
  const [ics, setIcs] = useState(false);
  if (!team) return null;
  const upcoming = [...team.active].sort((a, b) => a.schedule.next.localeCompare(b.schedule.next));
  const recent = team.meetings
    .filter((m) => m.status === 'done' && team.byId.get(m.collaboratorId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Points"
        action={
          <button type="button" onClick={() => setIcs(true)} aria-label="Exporter vers le calendrier" className="w-11 h-11 rounded-full bg-surface-2 text-ink flex items-center justify-center">
            <Icon name="today" size={22} />
          </button>
        }
      />
      <BackupBanner />
      <div className="px-4 flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h2 className="section-title px-1">Prochains points</h2>
          {upcoming.length === 0 && <p className="card p-5 text-[15px] text-muted">Ajoute d'abord tes collaborateurs dans l'onglet Équipe.</p>}
          {upcoming.map((s) => (
            <div key={s.collaborator.id} className="card p-3 flex items-center gap-3">
              <Avatar firstName={s.collaborator.firstName} lastName={s.collaborator.lastName} color={s.collaborator.color} size={36} />
              <Link to={`/c/${s.collaborator.id}`} className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.collaborator.firstName} {s.collaborator.lastName}</p>
                <p className="text-[13px] text-muted">{s.topics} sujet{s.topics > 1 ? 's' : ''} · {s.myOpen + s.theirOpen} engagement{s.myOpen + s.theirOpen > 1 ? 's' : ''}</p>
              </Link>
              <div className="flex flex-col items-end gap-1.5">
                <MeetingTag s={s.schedule} />
                <Link to={`/points/${s.collaborator.id}/preparer`} className="min-h-[36px] px-3 rounded-xl bg-accent text-accent-ink text-[14px] font-semibold flex items-center">Préparer</Link>
              </div>
            </div>
          ))}
        </section>

        {recent.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Derniers points</h2>
            {recent.map((m) => {
              const c = team.byId.get(m.collaboratorId)!;
              return (
                <Link key={m.id} to={`/c/${c.id}?onglet=points`} className="card p-3 flex gap-3 items-start">
                  <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} size={30} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium">{c.firstName} · {formatShort(m.date)}</span>
                    <span className="block text-[13px] text-muted line-clamp-1">{meetingSummary(m)}</span>
                  </span>
                </Link>
              );
            })}
          </section>
        )}

        <button type="button" onClick={() => setIcs(true)} className="card p-4 flex items-center gap-3 text-left">
          <Icon name="today" size={24} className="text-accent" />
          <span className="flex-1">
            <span className="block font-semibold">Exporter vers le calendrier</span>
            <span className="block text-[13px] text-muted">Prochains points avec rappel la veille, échéances des engagements.</span>
          </span>
          <Icon name="chevron" size={18} className="text-muted" />
        </button>
      </div>
      <CalendarExportSheet open={ics} onClose={() => setIcs(false)} />
    </>
  );
}
