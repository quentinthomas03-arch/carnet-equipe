import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollaborator } from '../db/hooks';
import { setArchived, updateCollaborator } from '../db/repo';
import type { Entry, EntryType } from '../db/types';
import { cadenceLabel } from '../domain/cadence';
import { ENTRY_LABELS, ENTRY_TYPES, isPending } from '../domain/entries';
import { addDaysISO, formatLong, formatShort, todayISO } from '../domain/dates';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Segmented } from '../ui/Segmented';
import { colorHex } from '../ui/palette';
import { useToast } from '../ui/Toast';
import { EntryRow } from '../components/EntryRow';
import { CollaboratorForm } from '../components/CollaboratorForm';
import { MeetingTag } from '../components/CollaboratorCard';
import { useQuickAdd } from '../components/QuickAdd';

type Tab = 'overview' | 'entries' | 'meetings' | 'objectives';

export function CollaboratorPage() {
  const { id } = useParams();
  const data = useCollaborator(id);
  const navigate = useNavigate();
  const quickAdd = useQuickAdd();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);

  if (data === undefined) return null;
  if (data === null)
    return (
      <div className="pt-safe p-6">
        <p>Collaborateur introuvable.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Retour à l'équipe</Button>
      </div>
    );

  const { summary, entries } = data;
  const c = summary.collaborator;
  const hex = colorHex(c.color);

  return (
    <div className="pb-6">
      {/* En-tête teinté de la couleur du collaborateur */}
      <header className="pt-safe pb-4 px-2" style={{ background: `${hex}24` }}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className="w-11 h-11 flex items-center justify-center text-accent">
            <Icon name="back" size={24} strokeWidth={2.2} />
          </button>
          <button type="button" onClick={() => setEditing(true)} aria-label="Modifier la fiche" className="w-11 h-11 flex items-center justify-center text-accent">
            <Icon name="edit" size={22} />
          </button>
        </div>
        <div className="px-3 flex items-center gap-3">
          <span aria-hidden="true" className="w-3 h-12 rounded-full shrink-0" style={{ background: hex }} />
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight truncate">{c.firstName} {c.lastName}</h1>
            <p className="text-[14px] text-muted truncate">{[c.role, c.site, c.activity].filter(Boolean).join(' · ') || 'Fiche à compléter'}</p>
            {c.archivedAt && <p className="text-[13px] font-semibold text-warn mt-0.5">Archivé·e</p>}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <Button onClick={() => quickAdd({ collaboratorId: c.id })} className="w-full">
          <Icon name="plus" size={20} strokeWidth={2.4} /> Noter pour {c.firstName}
        </Button>

        <Segmented<Tab>
          label="Sections de la fiche"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Aperçu' },
            { value: 'entries', label: 'Entrées' },
            { value: 'meetings', label: 'Points' },
            { value: 'objectives', label: 'Objectifs' },
          ]}
        />

        {tab === 'overview' && <Overview data={data} />}
        {tab === 'entries' && <Timeline entries={entries} />}
        {tab === 'meetings' && <Soon phase="Phase 2">Préparation et débrief des points, historique avec date et résumé.</Soon>}
        {tab === 'objectives' && <Soon phase="Phase 3">Objectifs, compétences, souhaits d'évolution, plan d'action et onboarding.</Soon>}

        <ArchiveButton id={c.id} firstName={c.firstName} archived={!!c.archivedAt} />
      </div>

      <CollaboratorForm open={editing} onClose={() => setEditing(false)} collaborator={c} />
    </div>
  );
}

function Soon({ phase, children }: { phase: string; children: string }) {
  return (
    <section className="card p-5 flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-accent uppercase tracking-wider">{phase}</span>
      <p className="text-[15px] leading-snug">{children}</p>
    </section>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-title px-1">{title}{count ? ` · ${count}` : ''}</h2>
      {children}
    </section>
  );
}

function List({ entries, empty }: { entries: Entry[]; empty: string }) {
  if (!entries.length) return <p className="text-[14px] text-muted px-1">{empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      {entries.map((e) => <EntryRow key={e.id} entry={e} showType={false} />)}
    </div>
  );
}

function Overview({ data }: { data: NonNullable<ReturnType<typeof useCollaborator>> }) {
  const { summary, entries } = data;
  const pending = entries.filter(isPending).sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9') || a.createdAt.localeCompare(b.createdAt));
  const of = (t: EntryType) => pending.filter((e) => e.type === t);
  const highlights = [...of('success'), ...of('alert')];

  return (
    <div className="flex flex-col gap-5">
      <NextMeeting summary={summary} />
      <Section title="À aborder" count={of('topic').length}>
        <List entries={of('topic')} empty="Rien en attente. Note un sujet avec le +." />
        {of('topic').length > 0 && <p className="text-[12px] text-muted px-1">Glisse vers la droite : abordé · vers la gauche : reporté.</p>}
      </Section>
      <Section title="Mes engagements" count={of('myCommitment').length}>
        <List entries={of('myCommitment')} empty="Aucun engagement de ma part en cours." />
      </Section>
      <Section title="Ses engagements" count={of('theirCommitment').length}>
        <List entries={of('theirCommitment')} empty="Aucun engagement de sa part en cours." />
      </Section>
      <Section title="À souligner" count={highlights.length}>
        {highlights.length ? (
          <div className="flex flex-col gap-2">{highlights.map((e) => <EntryRow key={e.id} entry={e} />)}</div>
        ) : (
          <p className="text-[14px] text-muted px-1">Aucune réussite ni alerte en attente.</p>
        )}
      </Section>
    </div>
  );
}

/** Prochain point : date suggérée à valider ou à changer en un tap. */
function NextMeeting({ summary }: { summary: NonNullable<ReturnType<typeof useCollaborator>>['summary'] }) {
  const toast = useToast();
  const c = summary.collaborator;
  const s = summary.schedule;
  const today = todayISO();

  async function setDate(date: string) {
    await updateCollaborator(c.id, { nextMeetingDate: date || undefined });
    toast(date ? `Point fixé au ${formatShort(date)}` : 'Date suggérée rétablie');
  }

  return (
    <section className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Prochain point</h2>
          <p className="text-[18px] font-semibold mt-1 first-letter:uppercase">{formatLong(s.next)}</p>
          <p className="text-[13px] text-muted">
            {s.suggested ? 'Date suggérée' : 'Date validée'} · {cadenceLabel(c.cadenceDays).toLowerCase()} · dernier point {s.last ? formatShort(s.last) : 'aucun'}
          </p>
        </div>
        <MeetingTag s={s} />
      </div>
      <div className="flex gap-2">
        {s.suggested && (
          <Button variant="secondary" className="flex-1 !min-h-[44px] !text-[15px]" onClick={() => setDate(s.overdue ? addDaysISO(today, 1) : s.next)}>
            {s.overdue ? 'Fixer à demain' : 'Valider'}
          </Button>
        )}
        <label className="flex-1 min-h-[44px] rounded-2xl bg-surface-2 text-[15px] font-semibold inline-flex items-center justify-center relative">
          Changer la date
          <input type="date" value={s.next} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date du prochain point" className="absolute inset-0 opacity-0" />
        </label>
        {!s.suggested && (
          <Button variant="ghost" className="!min-h-[44px] !px-3 !text-[15px]" onClick={() => setDate('')}>Suggérée</Button>
        )}
      </div>
    </section>
  );
}

type Period = 'all' | '30' | '90' | '365';

/** Chronologie unique de toutes les entrées, filtrable par type et par période. */
function Timeline({ entries }: { entries: Entry[] }) {
  const [type, setType] = useState<EntryType | 'all'>('all');
  const [period, setPeriod] = useState<Period>('all');
  const since = period === 'all' ? '' : addDaysISO(todayISO(), -Number(period));
  const shown = entries
    .filter((e) => (type === 'all' || e.type === type) && e.createdAt.slice(0, 10) >= since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Regroupement par mois de création.
  const groups = new Map<string, Entry[]>();
  for (const e of shown) {
    const key = new Date(e.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4" role="group" aria-label="Type">
        <Chip selected={type === 'all'} onClick={() => setType('all')}>Tout</Chip>
        {ENTRY_TYPES.map((t) => <Chip key={t} selected={type === t} onClick={() => setType(t)}>{ENTRY_LABELS[t]}</Chip>)}
      </div>
      <Segmented<Period>
        label="Période"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'all', label: 'Tout' },
          { value: '30', label: '30 j' },
          { value: '90', label: '3 mois' },
          { value: '365', label: '12 mois' },
        ]}
      />
      {shown.length === 0 && <p className="text-[14px] text-muted px-1">Aucune entrée pour ce filtre.</p>}
      {[...groups].map(([month, list]) => (
        <section key={month} className="flex flex-col gap-2">
          <h3 className="section-title px-1 first-letter:uppercase">{month}</h3>
          {list.map((e) => <EntryRow key={e.id} entry={e} />)}
        </section>
      ))}
    </div>
  );
}

function ArchiveButton({ id, firstName, archived }: { id: string; firstName: string; archived: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  if (archived)
    return <Button variant="secondary" className="mt-6" onClick={() => setArchived(id, false).then(() => toast(`${firstName} réactivé·e`))}>Réactiver {firstName}</Button>;
  return (
    <div className="mt-6 flex flex-col gap-2">
      {!confirm ? (
        <Button variant="ghost" className="text-muted" onClick={() => setConfirm(true)}><Icon name="archive" size={20} /> Archiver…</Button>
      ) : (
        <>
          <p className="text-[14px] text-muted leading-snug px-1">
            {firstName} disparaîtra de l'écran Équipe et des rappels. Rien n'est supprimé : tu pourras réactiver la fiche à tout moment.
          </p>
          <Button variant="danger" onClick={() => setArchived(id, true).then(() => { toast(`${firstName} archivé·e`); navigate('/'); })}>Confirmer l'archivage</Button>
          <Button variant="ghost" onClick={() => setConfirm(false)}>Annuler</Button>
        </>
      )}
    </div>
  );
}
