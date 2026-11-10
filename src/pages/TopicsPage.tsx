import { useTeam } from '../db/hooks';
import { TEAM_ID } from '../db/types';
import { isPending } from '../domain/entries';
import { BackHeader } from '../ui/BackHeader';
import { Avatar, TeamAvatar } from '../ui/Avatar';
import { EntryRow } from '../components/EntryRow';

/** Vue globale « À aborder » : tous les sujets en attente, par collaborateur (ordre de priorité). */
export function TopicsPage() {
  const team = useTeam();
  if (!team) return null;
  const topics = team.entries.filter((e) => e.type === 'topic' && isPending(e));
  const groups = [
    ...team.active.map((s) => ({ id: s.collaborator.id, c: s.collaborator, list: topics.filter((e) => e.collaboratorId === s.collaborator.id) })),
    { id: TEAM_ID, c: undefined, list: topics.filter((e) => e.collaboratorId === TEAM_ID) },
  ].filter((g) => g.list.length);

  return (
    <div className="pb-6">
      <BackHeader title="À aborder" />
      <p className="px-5 pb-3 text-[14px] text-muted">Glisse vers la droite : abordé · vers la gauche : reporté.</p>
      <div className="px-4 flex flex-col gap-5">
        {groups.length === 0 && <p className="card p-5 text-[15px] text-muted">Aucun sujet en attente.</p>}
        {groups.map((g) => (
          <section key={g.id} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 px-1 font-semibold">
              {g.c ? <Avatar firstName={g.c.firstName} lastName={g.c.lastName} color={g.c.color} size={26} /> : <TeamAvatar size={26} />}
              {g.c ? `${g.c.firstName} ${g.c.lastName}` : 'Toute l’équipe'}
              <span className="text-muted font-normal">· {g.list.length}</span>
            </h2>
            {g.list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((e) => <EntryRow key={e.id} entry={e} showType={false} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
