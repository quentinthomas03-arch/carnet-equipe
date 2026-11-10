import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Workload } from '../db/types';
import { saveDebrief } from '../db/repo';
import { addDaysISO, formatShort, todayISO } from '../domain/dates';
import { dueShortcuts } from '../domain/entries';
import { planDebrief, prepEntries, WORKLOAD_LABELS, type NewCommitment } from '../domain/meetingPrep';
import { clearChecks } from '../lib/prepChecks';
import { BackHeader } from '../ui/BackHeader';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { usePrep } from '../components/usePrep';

const field = 'w-full rounded-2xl bg-surface-2 p-3 leading-snug resize-none placeholder:text-muted';

/**
 * « Débriefer le point » : 30 secondes. Les éléments cochés en préparation sont archivés,
 * les sujets non abordés sont reportés automatiquement. On ajoute décisions, nouveaux
 * engagements, ressenti de charge et note libre.
 */
export function DebriefPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, prep, checked, toggle } = usePrep(id);
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [decisions, setDecisions] = useState('');
  const [note, setNote] = useState('');
  const [workload, setWorkload] = useState<Workload | undefined>();
  const [commitments, setCommitments] = useState<NewCommitment[]>([]);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!data || !prep) return null;
  const c = data.summary.collaborator;
  const presented = prepEntries(prep);
  const plan = planDebrief({ presented, checkedIds: checked });
  const resolved = presented.filter((e) => plan.resolve.includes(e.id));
  const postponed = presented.filter((e) => plan.postpone.includes(e.id));
  const suggestedNext = addDaysISO(date, c.cadenceDays);
  const next = nextDate ?? suggestedNext;

  const setCommitment = (i: number, patch: Partial<NewCommitment>) =>
    setCommitments((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setSaving(true);
    try {
      await saveDebrief({
        collaboratorId: c.id, date, checkedIds: checked, presented, decisions, note, workload,
        newCommitments: commitments, nextMeetingDate: next,
      });
      clearChecks(c.id);
      toast('Point enregistré');
      navigate(`/c/${c.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-8">
      <BackHeader title={`Débrief · ${c.firstName}`} />
      <div className="px-4 flex flex-col gap-5">
        <section className="card p-4 flex flex-col gap-2">
          <h2 className="section-title">Bilan des cases cochées</h2>
          <p className="text-[15px]"><strong>{resolved.length}</strong> traité{resolved.length > 1 ? 's' : ''} (archivé{resolved.length > 1 ? 's' : ''} automatiquement)</p>
          {postponed.length > 0 && (
            <>
              <p className="text-[15px] text-warn"><strong>{postponed.length}</strong> sujet{postponed.length > 1 ? 's' : ''} reporté{postponed.length > 1 ? 's' : ''} au prochain point :</p>
              <ul className="flex flex-col">
                {postponed.map((e) => (
                  <li key={e.id}>
                    <label className="flex gap-3 items-start min-h-[40px] py-1">
                      <input type="checkbox" checked={false} onChange={() => toggle(e.id)} className="w-5 h-5 mt-0.5 accent-[rgb(var(--accent))]" />
                      <span className="text-[15px] leading-snug">{e.text} <span className="text-muted text-[13px]">(cocher si abordé)</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <label className="flex flex-col gap-1.5">
          <span className="section-title px-1">Décisions</span>
          <textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} rows={3} placeholder="Ce qui a été décidé…" className={field} />
        </label>

        <section className="flex flex-col gap-2">
          <h2 className="section-title px-1">Nouveaux engagements</h2>
          {commitments.map((nc, i) => (
            <div key={i} className="card p-3 flex flex-col gap-2">
              <div className="flex gap-2">
                {(['myCommitment', 'theirCommitment'] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={nc.type === t} onClick={() => setCommitment(i, { type: t })}
                    className={`flex-1 min-h-[40px] rounded-xl text-[14px] ${nc.type === t ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>
                    {t === 'myCommitment' ? 'Moi' : c.firstName}
                  </button>
                ))}
                <button type="button" aria-label="Retirer cet engagement" onClick={() => setCommitments((l) => l.filter((_, j) => j !== i))} className="w-10 h-10 flex items-center justify-center text-muted">
                  <Icon name="close" size={18} />
                </button>
              </div>
              <input value={nc.text} onChange={(e) => setCommitment(i, { text: e.target.value })} placeholder="Quoi ?" aria-label="Engagement" className="min-h-[44px] rounded-xl bg-surface-2 px-3 placeholder:text-muted" />
              <div className="flex flex-wrap gap-1.5">
                {dueShortcuts(today).map((s) => (
                  <button key={s.label} type="button" aria-pressed={nc.dueDate === s.date} onClick={() => setCommitment(i, { dueDate: nc.dueDate === s.date ? undefined : s.date })}
                    className={`min-h-[36px] px-2.5 rounded-lg text-[13px] ${nc.dueDate === s.date ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>
                    {s.label}
                  </button>
                ))}
                <label className={`min-h-[36px] px-2.5 rounded-lg text-[13px] inline-flex items-center relative ${nc.dueDate && !dueShortcuts(today).some((s) => s.date === nc.dueDate) ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>
                  {nc.dueDate && !dueShortcuts(today).some((s) => s.date === nc.dueDate) ? formatShort(nc.dueDate) : 'Date…'}
                  <input type="date" value={nc.dueDate ?? ''} onChange={(e) => setCommitment(i, { dueDate: e.target.value || undefined })} aria-label="Échéance" className="absolute inset-0 opacity-0" />
                </label>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setCommitments((l) => [...l, { type: 'myCommitment', text: '' }])}><Icon name="plus" size={18} /> De moi</Button>
            <Button variant="secondary" onClick={() => setCommitments((l) => [...l, { type: 'theirCommitment', text: '' }])}><Icon name="plus" size={18} /> De {c.firstName}</Button>
          </div>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="section-title px-1 mb-2">Charge de travail (facultatif)</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(WORKLOAD_LABELS) as Workload[]).map((w) => (
              <button key={w} type="button" aria-pressed={workload === w} onClick={() => setWorkload(workload === w ? undefined : w)}
                className={`min-h-[44px] rounded-xl text-[14px] ${workload === w ? 'bg-ink text-bg font-semibold' : 'bg-surface border border-line'}`}>
                {({ ok: 'OK', tense: 'Tendue', overloaded: 'Surcharge' } as const)[w]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="section-title px-1">Note libre</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Factuel et court" className={field} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-title px-1">Date du point</span>
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title px-1">Prochain point</span>
            <input type="date" value={next} min={date} onChange={(e) => setNextDate(e.target.value || null)} className="min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full" />
          </label>
        </div>
        <p className="text-[13px] text-muted -mt-3 px-1">Prochain point suggéré selon le rythme ; modifiable plus tard sur la fiche.</p>

        <Button onClick={save} disabled={saving} className="w-full mt-1">
          <Icon name="check" size={20} /> Enregistrer le point
        </Button>
      </div>
    </div>
  );
}
