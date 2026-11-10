import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Entry } from '../db/types';
import { daysLate, dueState } from '../domain/entries';
import { formatLong, formatShort, todayISO } from '../domain/dates';
import { WORKLOAD_LABELS } from '../domain/meetingPrep';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { useQuickAdd } from '../components/QuickAdd';
import { usePrep } from '../components/usePrep';

const OBJ_CATEGORY: Record<string, string> = { securite: 'Sécurité', qualite: 'Qualité', metier: 'Métier', production: 'Production', autre: 'Autre' };

/** Ligne cochable : sert pendant le point pour suivre la discussion. */
function CheckRow({ entry, checked, onToggle, tag }: { entry: Entry; checked: boolean; onToggle: () => void; tag?: React.ReactNode }) {
  const today = todayISO();
  const due = dueState(entry, today);
  return (
    <label className="flex gap-3 items-start min-h-[44px] py-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="w-6 h-6 mt-0.5 shrink-0 accent-[rgb(var(--accent))]" />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className={`text-[16px] leading-snug ${checked ? 'line-through text-muted' : ''}`}>{entry.text}</span>
        {(tag || entry.dueDate || entry.postponeCount > 0) && (
          <span className="flex flex-wrap gap-x-2 text-[13px] text-muted">
            {tag}
            {entry.dueDate && (
              <span className={due === 'late' ? 'text-danger font-semibold' : ''}>
                {due === 'late' ? `en retard de ${daysLate(entry, today)} j` : `pour le ${formatShort(entry.dueDate)}`}
              </span>
            )}
            {entry.postponeCount > 0 && <span className="text-warn font-medium">reporté {entry.postponeCount}×</span>}
          </span>
        )}
      </span>
    </label>
  );
}

function Block({ title, children, tone = '', count }: { title: string; children: React.ReactNode; tone?: string; count?: string }) {
  return (
    <section className={`rounded-card p-4 flex flex-col gap-1 ${tone || 'bg-surface'}`}>
      <div className="flex justify-between items-baseline mb-1">
        <h2 className="section-title">{title}</h2>
        {count && <span className="text-[13px] text-muted">{count}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * « Préparer le point » : à ouvrir la veille, et à garder sous les yeux pendant le point
 * (on coche au fil de la discussion ; les cases sont conservées même si l'appli est fermée).
 */
export function PrepPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quickAdd = useQuickAdd();
  const { data, prep, checked, toggle } = usePrep(id);
  if (!data || !prep) return data === null ? <p className="pt-safe p-6">Collaborateur introuvable.</p> : null;

  const c = data.summary.collaborator;
  const s = data.summary.schedule;
  const rows = (list: Entry[], tag?: (e: Entry) => React.ReactNode) =>
    list.map((e) => <CheckRow key={e.id} entry={e} checked={checked.includes(e.id)} onToggle={() => toggle(e.id)} tag={tag?.(e)} />);
  const topicsAll = [...prep.leftOver, ...prep.topics];
  const doneTopics = topicsAll.filter((e) => checked.includes(e.id)).length;
  const empty = !topicsAll.length && !prep.myCommitments.length && !prep.theirCommitments.length && !prep.successes.length && !prep.alerts.length;

  return (
    <div className="pb-24">
      <header className="pt-safe px-2 pb-2 flex items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className="w-11 h-11 flex items-center justify-center text-accent">
          <Icon name="back" size={24} strokeWidth={2.2} />
        </button>
        <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} size={34} />
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold truncate">{c.firstName} {c.lastName}</h1>
          <p className="text-[13px] text-muted">Préparer le point · {formatLong(s.next)}</p>
        </div>
      </header>

      <div className="px-4 flex flex-col gap-3">
        {prep.leftOver.length > 0 && (
          <Block title="Resté en suspens la dernière fois" tone="bg-warn-soft">
            {rows(prep.leftOver)}
          </Block>
        )}
        <Block title="À aborder" count={topicsAll.length ? `${doneTopics} / ${topicsAll.length}` : undefined}>
          {prep.topics.length ? rows(prep.topics) : <p className="text-[14px] text-muted">{prep.leftOver.length ? 'Pas d’autre sujet.' : 'Aucun sujet noté.'}</p>}
          <button type="button" onClick={() => quickAdd({ collaboratorId: c.id, type: 'topic' })} className="self-start min-h-[40px] mt-1 text-[15px] font-semibold text-accent inline-flex items-center gap-1">
            <Icon name="plus" size={18} strokeWidth={2.4} /> Ajouter un sujet
          </button>
        </Block>

        {(prep.myCommitments.length > 0 || prep.theirCommitments.length > 0) && (
          <Block title="Engagements ouverts">
            {rows(prep.myCommitments, () => <span className="font-bold text-accent">MOI</span>)}
            {rows(prep.theirCommitments, () => <span className="font-bold text-ink">{c.firstName.toUpperCase()}</span>)}
            <p className="text-[12px] text-muted mt-1">Coche ce qui est fait ; le reste reste ouvert.</p>
          </Block>
        )}

        {prep.successes.length > 0 && <Block title="Réussites à féliciter" tone="bg-ok-soft">{rows(prep.successes)}</Block>}
        {prep.alerts.length > 0 && <Block title="Points d'alerte" tone="bg-warn-soft">{rows(prep.alerts)}</Block>}

        {prep.objectives.length > 0 && (
          <Block title="Objectifs en cours">
            {prep.objectives.map((o) => (
              <div key={o.id} className="flex flex-col gap-1.5 py-1.5">
                <div className="flex justify-between gap-3 text-[15px]">
                  <span>{OBJ_CATEGORY[o.category]} · {o.title}</span>
                  <span className="text-muted">{o.progress} %</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${o.progress}%` }} /></div>
              </div>
            ))}
          </Block>
        )}

        {prep.lastMeeting && (
          <Block title={`Dernier point · ${formatShort(prep.lastMeeting.date)}`}>
            {prep.lastMeeting.decisions && <p className="text-[15px] leading-snug whitespace-pre-line"><strong>Décisions :</strong> {prep.lastMeeting.decisions}</p>}
            {prep.lastMeeting.note && <p className="text-[15px] leading-snug whitespace-pre-line text-muted">{prep.lastMeeting.note}</p>}
            {prep.lastMeeting.workload && <p className="text-[14px] text-muted">{WORKLOAD_LABELS[prep.lastMeeting.workload]}</p>}
            {!prep.lastMeeting.decisions && !prep.lastMeeting.note && <p className="text-[14px] text-muted">Pas de note.</p>}
          </Block>
        )}

        {empty && !prep.lastMeeting && (
          <p className="text-[14px] text-muted px-1 leading-snug">
            Rien de noté pour l'instant. Pendant le mois, utilise le + dès que tu penses à un sujet : il apparaîtra ici.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 px-4 pb-2 pt-3 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="max-w-lg mx-auto">
          <Link to={`/points/${c.id}/debrief`} className="min-h-[52px] rounded-2xl bg-accent text-accent-ink font-bold text-[16px] flex items-center justify-center shadow-lg">
            Débriefer le point
          </Link>
        </div>
      </div>
    </div>
  );
}
