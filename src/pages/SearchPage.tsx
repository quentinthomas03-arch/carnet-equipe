import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { search } from '../domain/search';
import { formatShort } from '../domain/dates';
import { CATEGORY_LABELS } from '../domain/objectives';
import { BackHeader } from '../ui/BackHeader';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { EntryRow } from '../components/EntryRow';

/** Recherche dans les collaborateurs, les entrées, les décisions de points et les objectifs. */
export function SearchPage() {
  const [q, setQ] = useState('');
  const data = useLiveQuery(async () => {
    const [collaborators, entries, meetings, objectives] = await Promise.all([db.collaborators.toArray(), db.entries.toArray(), db.meetings.toArray(), db.objectives.toArray()]);
    return { collaborators, entries, meetings, objectives };
  }, []);
  const byId = new Map((data?.collaborators ?? []).map((c) => [c.id, c]));
  const r = data && q.trim().length >= 2 ? search(q, data) : null;

  return (
    <div className="pb-8">
      <BackHeader title="Rechercher" />
      <div className="px-4 flex flex-col gap-4">
        <label className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 min-h-[48px]">
          <Icon name="search" size={20} className="text-muted" />
          <input autoFocus type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, sujet, décision, objectif…" aria-label="Rechercher" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted" />
        </label>
        {r && r.total === 0 && <p className="text-[15px] text-muted px-1">Aucun résultat.</p>}
        {r && r.collaborators.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Collaborateurs</h2>
            {r.collaborators.map((c) => (
              <Link key={c.id} to={`/c/${c.id}`} className="card p-3 flex items-center gap-3">
                <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} size={32} />
                <span className="flex-1"><span className="block font-medium">{c.firstName} {c.lastName}</span><span className="block text-[13px] text-muted">{[c.role, c.site].filter(Boolean).join(' · ')}{c.archivedAt ? ' · archivé·e' : ''}</span></span>
              </Link>
            ))}
          </section>
        )}
        {r && r.entries.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Entrées · {r.entries.length}</h2>
            {r.entries.map((e) => <EntryRow key={e.id} entry={e} collaborator={byId.get(e.collaboratorId)} showWho />)}
          </section>
        )}
        {r && r.meetings.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Points · {r.meetings.length}</h2>
            {r.meetings.map((m) => (
              <Link key={m.id} to={`/c/${m.collaboratorId}?onglet=points`} className="card p-3">
                <span className="block text-[13px] text-muted">{byId.get(m.collaboratorId)?.firstName} · {formatShort(m.date)}</span>
                <span className="block text-[15px] leading-snug line-clamp-3 whitespace-pre-line">{m.decisions || m.note}</span>
              </Link>
            ))}
          </section>
        )}
        {r && r.objectives.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Objectifs · {r.objectives.length}</h2>
            {r.objectives.map((o) => (
              <Link key={o.id} to={`/c/${o.collaboratorId}`} className="card p-3">
                <span className="block text-[13px] text-muted">{byId.get(o.collaboratorId)?.firstName} · {CATEGORY_LABELS[o.category]}</span>
                <span className="block text-[15px] font-medium">{o.title}</span>
              </Link>
            ))}
          </section>
        )}
        {!r && <p className="text-[14px] text-muted px-1">Tape au moins 2 lettres. Les accents et majuscules sont ignorés.</p>}
      </div>
    </div>
  );
}
