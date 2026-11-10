import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Onboarding, OnboardingTask } from '../db/types';
import {
  deleteOnboarding, deleteOnboardingTask, saveOnboardingTask, setOnboardingCompleted, startOnboarding, toggleOnboardingTask, updateOnboarding,
} from '../db/repo';
import { defaultTemplate, groupByPhase, newTaskId, onboardingProgress } from '../domain/onboarding';
import { daysBetween, formatShort, todayISO } from '../domain/dates';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toast';

const field = 'min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full';

/** Barre de progression d'un onboarding (réutilisée sur les cartes de l'écran Équipe). */
export function OnboardingBar({ onboarding }: { onboarding: Onboarding }) {
  const p = onboardingProgress(onboarding, todayISO());
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-[13px] text-muted">
        <span className="truncate">
          {p.stage}
          {p.next ? <> · <strong className="font-medium text-ink">{p.next.label}</strong></> : ' · parcours terminé'}
        </span>
        <span className="font-semibold text-ink shrink-0">{p.percent} %</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${p.percent}%` }} /></div>
      {p.late.length > 0 && <span className="text-[13px] text-danger font-medium">{p.late.length} étape{p.late.length > 1 ? 's' : ''} en retard</span>}
    </div>
  );
}

/** Formulaire de démarrage d'un parcours (fiche collaborateur ou création d'une recrue). */
export function StartOnboarding({ collaboratorId, arrivalDate, onStarted }: { collaboratorId: string; arrivalDate?: string; onStarted?: () => void }) {
  const toast = useToast();
  const templates = useLiveQuery(() => db.onboardingTemplates.toArray(), []) ?? [];
  const def = defaultTemplate(templates);
  const [templateId, setTemplateId] = useState<string>('');
  const [date, setDate] = useState(arrivalDate ?? todayISO());
  const chosen = templateId || def?.id || '';

  async function start() {
    if (!chosen) return;
    await startOnboarding(collaboratorId, chosen, date);
    toast("Parcours d'intégration démarré");
    onStarted?.();
  }

  return (
    <section className="card p-4 flex flex-col gap-3">
      <h2 className="section-title">Démarrer l'onboarding</h2>
      <p className="text-[14px] text-muted leading-snug">Les étapes et les points de suivi sont datés à partir du jour d'arrivée. Tu pourras ensuite ajuster ce parcours sans toucher au modèle.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5"><span className="section-title">Arrivée</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} /></label>
        <label className="flex flex-col gap-1.5"><span className="section-title">Modèle</span>
          <select value={chosen} onChange={(e) => setTemplateId(e.target.value)} className={field}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
      </div>
      <Button onClick={start} disabled={!chosen}>Démarrer le parcours</Button>
    </section>
  );
}

/** Onglet Onboarding de la fiche : progression, étapes par phase, fin de période d'essai. */
export function OnboardingTab({ collaboratorId, onboarding, arrivalDate }: { collaboratorId: string; onboarding?: Onboarding; arrivalDate?: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState<OnboardingTask | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!onboarding) return <StartOnboarding collaboratorId={collaboratorId} arrivalDate={arrivalDate} />;

  const today = todayISO();
  const p = onboardingProgress(onboarding, today);
  const groups = groupByPhase(onboarding.tasks);

  return (
    <div className="flex flex-col gap-4">
      <section className="card p-4 flex flex-col gap-3">
        <OnboardingBar onboarding={onboarding} />
        <div className="grid grid-cols-2 gap-3 text-[14px]">
          <div><span className="block text-muted text-[13px]">Arrivée</span><strong className="font-semibold">{formatShort(onboarding.arrivalDate)}</strong></div>
          <label className="flex flex-col"><span className="text-muted text-[13px]">Fin de période d'essai</span>
            <input type="date" value={onboarding.trialEndDate} onChange={(e) => e.target.value && updateOnboarding(onboarding.id, { trialEndDate: e.target.value })} className="min-h-[36px] bg-transparent font-semibold p-0" />
          </label>
        </div>
        {!onboarding.completedAt && p.trialDaysLeft >= 0 && p.trialDaysLeft <= 30 && (
          <p className="text-[14px] text-warn font-medium">Fin de période d'essai dans {p.trialDaysLeft} jours.</p>
        )}
        {onboarding.completedAt && <p className="text-[14px] text-ok font-medium">Onboarding clôturé.</p>}
      </section>

      {groups.map((g) => (
        <section key={g.phase} className="flex flex-col gap-1">
          <h2 className="section-title px-1">{g.phase}</h2>
          <div className="card px-4 py-1">
            {g.tasks.map((t) => {
              const late = !t.done && t.dueDate < today;
              return (
                <div key={t.id} className="flex items-start gap-3 py-2 border-b border-line last:border-0">
                  <input type="checkbox" checked={t.done} aria-label={t.label} onChange={() => toggleOnboardingTask(onboarding.id, t.id)} className="w-6 h-6 mt-0.5 shrink-0 accent-[rgb(var(--accent))]" />
                  <button type="button" onClick={() => setEditing(t)} className="flex-1 text-left min-h-[32px]">
                    <span className={`block text-[15px] leading-snug ${t.done ? 'line-through text-muted' : ''}`}>{t.label}</span>
                    <span className={`block text-[13px] ${late ? 'text-danger font-semibold' : 'text-muted'}`}>
                      {formatShort(t.dueDate)}{late ? ` · en retard de ${daysBetween(t.dueDate, today)} j` : ''}{t.note ? ' · note' : ''}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <Button variant="secondary" onClick={() => setEditing('new')}><Icon name="plus" size={18} /> Ajouter une étape pour cette recrue</Button>
      {!onboarding.completedAt ? (
        <Button variant="secondary" onClick={() => setOnboardingCompleted(onboarding.id, true).then(() => toast('Onboarding clôturé'))}>Clôturer l'onboarding</Button>
      ) : (
        <Button variant="ghost" onClick={() => setOnboardingCompleted(onboarding.id, false)}>Rouvrir l'onboarding</Button>
      )}
      {!confirmDelete ? (
        <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>Supprimer ce parcours…</Button>
      ) : (
        <>
          <p className="text-[14px] text-muted px-1">Les étapes et les points de suivi encore planifiés seront supprimés. Les points déjà effectués restent dans l'historique.</p>
          <Button variant="danger" onClick={() => deleteOnboarding(onboarding.id).then(() => toast('Parcours supprimé'))}>Confirmer la suppression</Button>
        </>
      )}

      {editing && <TaskSheet onboardingId={onboarding.id} task={editing === 'new' ? undefined : editing} phases={groups.map((g) => g.phase)} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TaskSheet({ onboardingId, task, phases, onClose }: { onboardingId: string; task?: OnboardingTask; phases: string[]; onClose: () => void }) {
  const [form, setForm] = useState<OnboardingTask>(task ?? { id: newTaskId(), phase: phases.at(-1) ?? 'Autre', label: '', dueDate: todayISO(), done: false });
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof OnboardingTask>(k: K, v: OnboardingTask[K]) => setForm((f) => ({ ...f, [k]: v }));
  async function save() {
    if (!form.label.trim()) return;
    await saveOnboardingTask(onboardingId, { ...form, label: form.label.trim(), note: form.note?.trim() || undefined });
    onClose();
  }
  return (
    <Sheet open onClose={onClose} title={task ? 'Étape' : 'Nouvelle étape'}
      action={<button type="button" onClick={save} disabled={!form.label.trim()} className="min-h-[40px] px-4 rounded-full bg-accent text-accent-ink font-semibold disabled:opacity-40">OK</button>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="section-title">Étape</span>
          <input value={form.label} onChange={(e) => set('label', e.target.value)} className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="section-title">Phase</span>
            <input list="phases" value={form.phase} onChange={(e) => set('phase', e.target.value)} className={field} />
            <datalist id="phases">{phases.map((p) => <option key={p} value={p} />)}</datalist></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Échéance</span>
            <input type="date" value={form.dueDate} onChange={(e) => e.target.value && set('dueDate', e.target.value)} className={field} /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="section-title">Note</span>
          <textarea rows={3} value={form.note ?? ''} onChange={(e) => set('note', e.target.value)} className="w-full rounded-2xl bg-surface-2 p-3 leading-snug resize-none" /></label>
        {task && (!confirm ? (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>Supprimer cette étape…</Button>
        ) : (
          <Button variant="danger" onClick={() => deleteOnboardingTask(onboardingId, task.id).then(onClose)}>Confirmer la suppression</Button>
        ))}
      </div>
    </Sheet>
  );
}
