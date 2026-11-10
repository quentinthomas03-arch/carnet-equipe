import { useState } from 'react';
import { useTeam } from '../db/hooks';
import { TEAM_ID, type Entry } from '../db/types';
import { commitmentStatus } from '../domain/entries';
import { todayISO } from '../domain/dates';
import { BackHeader } from '../ui/BackHeader';
import { Segmented } from '../ui/Segmented';
import { Chip } from '../ui/Chip';
import { EntryRow } from '../components/EntryRow';

type Who = 'myCommitment' | 'theirCommitment';
type Status = 'open' | 'late' | 'done';

/** Engagements dans les deux sens : les miens et les leurs, avec statut à faire / en retard / fait. */
export function CommitmentsPage() {
  const team = useTeam();
  const [who, setWho] = useState<Who>('myCommitment');
  const [status, setStatus] = useState<Status>('open');
  if (!team) return null;
  const today = todayISO();

  const visible = (e: Entry) => e.collaboratorId === TEAM_ID || !team.byId.get(e.collaboratorId)?.archivedAt;
  const all = team.entries.filter((e) => e.type === who && visible(e));
  const st = (e: Entry) => commitmentStatus(e, today);
  const counts = {
    open: all.filter((e) => st(e) === 'todo' || st(e) === 'late').length,
    late: all.filter((e) => st(e) === 'late').length,
    done: all.filter((e) => st(e) === 'done').length,
  };
  const shown = all
    .filter((e) => (status === 'open' ? st(e) === 'todo' || st(e) === 'late' : status === 'late' ? st(e) === 'late' : st(e) === 'done'))
    .sort((a, b) =>
      status === 'done'
        ? (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? '')
        : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <div className="pb-6">
      <BackHeader title="Engagements" />
      <div className="px-4 flex flex-col gap-3">
        <Segmented<Who>
          label="De qui"
          value={who}
          onChange={setWho}
          options={[
            { value: 'myCommitment', label: 'Les miens' },
            { value: 'theirCommitment', label: 'Les leurs' },
          ]}
        />
        <div className="flex gap-2" role="group" aria-label="Statut">
          <Chip selected={status === 'open'} onClick={() => setStatus('open')}>À faire · {counts.open}</Chip>
          <Chip selected={status === 'late'} onClick={() => setStatus('late')}>En retard · {counts.late}</Chip>
          <Chip selected={status === 'done'} onClick={() => setStatus('done')}>Faits · {counts.done}</Chip>
        </div>
        {shown.length === 0 && <p className="card p-5 text-[15px] text-muted">Rien dans cette liste.</p>}
        <div className="flex flex-col gap-2">
          {shown.map((e) => <EntryRow key={e.id} entry={e} collaborator={team.byId.get(e.collaboratorId)} showWho showType={false} />)}
        </div>
      </div>
    </div>
  );
}
