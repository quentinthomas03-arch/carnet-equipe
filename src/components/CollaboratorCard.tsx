import { Link } from 'react-router-dom';
import type { CollaboratorSummary } from '../domain/cadence';
import type { Onboarding } from '../db/types';
import { OnboardingBar } from './OnboardingTab';
import { formatShort } from '../domain/dates';
import { Avatar } from '../ui/Avatar';
import { colorHex } from '../ui/palette';
import { Tag } from '../ui/Chip';

/** Statut du prochain point, sous forme d'étiquette. */
export function MeetingTag({ s }: { s: CollaboratorSummary['schedule'] }) {
  if (s.overdue) return <Tag tone="warn">Retard {-s.daysUntil} j</Tag>;
  if (s.daysUntil === 0) return <Tag tone="accent">Aujourd'hui</Tag>;
  if (s.daysUntil <= 3) return <Tag tone="accent">Dans {s.daysUntil} j</Tag>;
  return <Tag>{formatShort(s.next)}</Tag>;
}

/** Carte d'un collaborateur sur l'écran Équipe. */
export function CollaboratorCard({ s, onboarding }: { s: CollaboratorSummary; onboarding?: Onboarding }) {
  const c = s.collaborator;
  const meta = [c.role, c.site].filter(Boolean).join(' · ');
  return (
    <Link to={`/c/${c.id}`} className="card relative overflow-hidden p-4 pl-5 flex flex-col gap-3 active:opacity-80">
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1" style={{ background: colorHex(c.color) }} />
      <div className="flex items-center gap-3">
        <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} />
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold truncate">{c.firstName} {c.lastName}</p>
          {meta && <p className="text-[13px] text-muted truncate">{meta}</p>}
        </div>
        {onboarding ? <Tag tone="accent">Onboarding</Tag> : <MeetingTag s={s.schedule} />}
      </div>
      {onboarding && <OnboardingBar onboarding={onboarding} />}
      <p className="text-[13px] text-muted">
        Dernier point <strong className="font-medium text-ink">{s.schedule.last ? formatShort(s.schedule.last) : 'aucun'}</strong>
        {' · '}prochain <strong className={`font-medium ${s.schedule.overdue ? 'text-warn' : 'text-ink'}`}>{formatShort(s.schedule.next)}</strong>
        {s.schedule.suggested && ' (suggéré)'}
      </p>
      {(s.topics > 0 || s.myOpen > 0 || s.theirOpen > 0 || s.openAlerts > 0 || s.recentSuccesses > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {s.topics > 0 && <Tag><strong>{s.topics}</strong> à aborder</Tag>}
          {s.myOpen > 0 && <Tag tone={s.myLate ? 'danger' : 'neutral'}><strong>{s.myOpen}</strong> de moi{s.myLate ? ` · ${s.myLate} en retard` : ''}</Tag>}
          {s.theirOpen > 0 && <Tag tone={s.theirLate ? 'warn' : 'neutral'}><strong>{s.theirOpen}</strong> de sa part{s.theirLate ? ` · ${s.theirLate} en retard` : ''}</Tag>}
          {s.openAlerts > 0 && <Tag tone="warn"><strong>{s.openAlerts}</strong> alerte{s.openAlerts > 1 ? 's' : ''}</Tag>}
          {s.recentSuccesses > 0 && <Tag tone="ok"><strong>{s.recentSuccesses}</strong> réussite{s.recentSuccesses > 1 ? 's' : ''}</Tag>}
        </div>
      )}
    </Link>
  );
}
