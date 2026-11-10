import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeam } from '../db/hooks';
import { setArchived } from '../db/repo';
import { PageHeader } from '../ui/PageHeader';
import { Icon } from '../ui/Icon';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { BackupBanner } from '../components/BackupBanner';
import { CollaboratorCard } from '../components/CollaboratorCard';
import { CollaboratorForm } from '../components/CollaboratorForm';
import { useToast } from '../ui/Toast';

type Filter = { kind: 'site' | 'activity'; value: string } | null;

export function TeamPage() {
  const team = useTeam();
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>(null);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = team?.active ?? [];
  const sites = [...new Set(active.map((s) => s.collaborator.site).filter(Boolean))].sort();
  const activities = [...new Set(active.map((s) => s.collaborator.activity).filter(Boolean))].sort();
  const shown = filter ? active.filter((s) => s.collaborator[filter.kind] === filter.value) : active;
  const toSee = active.filter((s) => s.priority >= 50).length;

  const subtitle = active.length
    ? `${active.length} collaborateur${active.length > 1 ? 's' : ''}${toSee ? ` · ${toSee} à voir en priorité` : ''}`
    : undefined;

  return (
    <>
      <PageHeader
        title="Équipe"
        subtitle={subtitle}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(true)} aria-label="Ajouter un collaborateur" className="w-11 h-11 rounded-full bg-surface-2 text-ink flex items-center justify-center">
              <Icon name="userPlus" size={22} />
            </button>
            <Link to="/reglages" aria-label="Réglages" className="w-11 h-11 rounded-full bg-surface-2 text-muted flex items-center justify-center">
              <Icon name="settings" size={22} strokeWidth={1.8} />
            </Link>
          </div>
        }
      />

      {sites.length + activities.length > 1 && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" role="group" aria-label="Filtrer">
          <Chip selected={!filter} onClick={() => setFilter(null)}>Tous</Chip>
          {sites.map((v) => <Chip key={`s${v}`} selected={filter?.kind === 'site' && filter.value === v} onClick={() => setFilter({ kind: 'site', value: v })}>{v}</Chip>)}
          {activities.map((v) => <Chip key={`a${v}`} selected={filter?.kind === 'activity' && filter.value === v} onClick={() => setFilter({ kind: 'activity', value: v })}>{v}</Chip>)}
        </div>
      )}

      <BackupBanner />

      {team && active.length === 0 && (
        <section className="card mx-4 p-6 flex flex-col items-center text-center gap-3">
          <p className="text-[17px] font-semibold">Ton équipe est vide</p>
          <p className="text-[15px] text-muted leading-snug">Ajoute tes collaborateurs : seul le prénom est obligatoire.</p>
          <Button onClick={() => setAdding(true)}><Icon name="userPlus" size={20} /> Ajouter un collaborateur</Button>
        </section>
      )}

      <div className="flex flex-col gap-3 px-4">
        {shown.map((s) => <CollaboratorCard key={s.collaborator.id} s={s} />)}
      </div>

      {team && team.archived.length > 0 && (
        <section className="px-4 mt-6">
          <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="min-h-[44px] text-[15px] font-medium text-muted">
            {showArchived ? 'Masquer' : 'Afficher'} les archivés ({team.archived.length})
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2 mt-1">
              {team.archived.map((c) => (
                <li key={c.id} className="card p-3 flex items-center gap-3">
                  <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} size={32} />
                  <Link to={`/c/${c.id}`} className="flex-1 text-[16px] text-muted">{c.firstName} {c.lastName}</Link>
                  <button type="button" onClick={() => setArchived(c.id, false).then(() => toast(`${c.firstName} réactivé·e`))} className="min-h-[40px] px-3 rounded-xl bg-surface-2 text-[14px] font-semibold">
                    Réactiver
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <CollaboratorForm open={adding} onClose={() => setAdding(false)} onCreated={(id) => navigate(`/c/${id}`)} />
    </>
  );
}
