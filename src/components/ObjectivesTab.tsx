import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { ActionStep, DevelopmentPlan, Objective, ObjectiveCategory, ObjectiveStatus, Rating, Skill, Training } from '../db/types';
import {
  addSkills, deleteObjective, deleteSkill, newId, saveDevelopmentPlan, saveObjective, saveObjectiveTemplate, updateSkill,
  type ObjectiveInput,
} from '../db/repo';
import { SETTING, useSetting } from '../db/settings';
import {
  CATEGORY_LABELS, DEFAULT_SKILL_CATALOG, RATING_LABELS, SKILL_LEVELS, STATUS_LABELS, defaultObjectivePeriod, isOpenObjective, weightTotal,
} from '../domain/objectives';
import { formatShort, todayISO } from '../domain/dates';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Chip';
import { useToast } from '../ui/Toast';

const field = 'min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full';
const area = 'w-full rounded-2xl bg-surface-2 p-3 leading-snug resize-none placeholder:text-muted';

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 min-h-[32px]">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Onglet « Objectifs » de la fiche : objectifs, compétences, évolution. */
export function ObjectivesTab({ collaboratorId, firstName, objectives, skills, plan }: {
  collaboratorId: string; firstName: string; objectives: Objective[]; skills: Skill[]; plan?: DevelopmentPlan;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ObjectivesSection collaboratorId={collaboratorId} objectives={objectives} />
      <SkillsSection collaboratorId={collaboratorId} skills={skills} />
      <DevelopmentSection collaboratorId={collaboratorId} firstName={firstName} plan={plan} />
    </div>
  );
}

// --- Objectifs ---------------------------------------------------------------

function ObjectivesSection({ collaboratorId, objectives }: { collaboratorId: string; objectives: Objective[] }) {
  const [editing, setEditing] = useState<Objective | 'new' | null>(null);
  const [fromTemplate, setFromTemplate] = useState(false);
  const open = objectives.filter(isOpenObjective).sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const closed = objectives.filter((o) => !isOpenObjective(o)).sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''));
  const total = weightTotal(objectives);

  return (
    <Section title="Objectifs" action={<button type="button" onClick={() => setEditing('new')} className="min-h-[40px] px-2 text-[15px] font-semibold text-accent inline-flex items-center gap-1"><Icon name="plus" size={18} strokeWidth={2.4} /> Ajouter</button>}>
      {objectives.length === 0 && <p className="text-[14px] text-muted px-1">Aucun objectif. Ils apparaîtront dans la préparation des points.</p>}
      {total !== null && total !== 100 && <p className="text-[13px] text-warn px-1">Pondération totale : {total} % (le formulaire annuel attend 100 %).</p>}
      {[...open, ...closed].map((o) => (
        <button key={o.id} type="button" onClick={() => setEditing(o)} className="card p-4 text-left flex flex-col gap-2">
          <span className="flex items-start justify-between gap-3">
            <span className="font-semibold leading-snug">{o.title}</span>
            <Tag tone={o.status === 'achieved' ? 'ok' : o.status === 'notAchieved' ? 'danger' : 'neutral'}>{STATUS_LABELS[o.status]}</Tag>
          </span>
          <span className="text-[13px] text-muted">
            {CATEGORY_LABELS[o.category]} · {o.scope === 'collective' ? 'collectif' : 'individuel'}
            {o.dueDate ? ` · échéance ${formatShort(o.dueDate)}` : ''}{o.weight !== undefined ? ` · ${o.weight} %` : ''}
          </span>
          <span className="flex items-center gap-3">
            <span className="flex-1 h-1.5 rounded-full bg-surface-2"><span className="block h-1.5 rounded-full bg-accent" style={{ width: `${o.progress}%` }} /></span>
            <span className="text-[13px] text-muted w-10 text-right">{o.progress} %</span>
          </span>
        </button>
      ))}
      <button type="button" onClick={() => setFromTemplate(true)} className="self-start min-h-[40px] px-1 text-[14px] font-medium text-accent">Partir d'un modèle d'objectif…</button>
      {editing && <ObjectiveSheet collaboratorId={collaboratorId} objective={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {fromTemplate && <TemplatePicker collaboratorId={collaboratorId} onClose={() => setFromTemplate(false)} />}
    </Section>
  );
}

function blankObjective(collaboratorId: string): ObjectiveInput {
  return { collaboratorId, title: '', description: '', category: 'metier', scope: 'individual', ...defaultObjectivePeriod(todayISO()), status: 'inProgress', progress: 0, notes: [] };
}

function ObjectiveSheet({ collaboratorId, objective, onClose, initial }: { collaboratorId: string; objective?: Objective; onClose: () => void; initial?: Partial<ObjectiveInput> }) {
  const toast = useToast();
  const [form, setForm] = useState<ObjectiveInput>(() => {
    if (objective) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = objective;
      return rest;
    }
    return { ...blankObjective(collaboratorId), ...initial };
  });
  const [noteText, setNoteText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof ObjectiveInput>(k: K, v: ObjectiveInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) return;
    const notes = noteText.trim() ? [...form.notes, { date: todayISO(), text: noteText.trim() }] : form.notes;
    await saveObjective({ ...form, title: form.title.trim(), notes }, objective?.id);
    toast(objective ? 'Objectif mis à jour' : 'Objectif ajouté');
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={objective ? 'Objectif' : 'Nouvel objectif'}
      action={<button type="button" onClick={save} disabled={!form.title.trim()} className="min-h-[40px] px-4 rounded-full bg-accent text-accent-ink font-semibold disabled:opacity-40">OK</button>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="section-title">Intitulé *</span>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} /></label>
        <label className="flex flex-col gap-1.5"><span className="section-title">Description et éléments de mesure</span>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Indicateurs concrets (SMART)" className={area} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5"><span className="section-title">Catégorie</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value as ObjectiveCategory)} className={field}>
              {(Object.keys(CATEGORY_LABELS) as ObjectiveCategory[]).map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
            </select></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Type</span>
            <select value={form.scope} onChange={(e) => set('scope', e.target.value as ObjectiveInput['scope'])} className={field}>
              <option value="individual">Individuel</option><option value="collective">Collectif</option>
            </select></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Début</span>
            <input type="date" value={form.startDate ?? ''} onChange={(e) => set('startDate', e.target.value || undefined)} className={field} /></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Échéance</span>
            <input type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || undefined)} className={field} /></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Statut</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value as ObjectiveStatus)} className={field}>
              {(Object.keys(STATUS_LABELS) as ObjectiveStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </select></label>
          <label className="flex flex-col gap-1.5"><span className="section-title">Pondération %</span>
            <input type="number" inputMode="numeric" min={0} max={100} value={form.weight ?? ''} onChange={(e) => set('weight', e.target.value === '' ? undefined : Math.max(0, Math.min(100, Number(e.target.value))))} placeholder="—" className={field} /></label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="section-title">Avancement : {form.progress} %</span>
          <input type="range" min={0} max={100} step={5} value={form.progress} onChange={(e) => set('progress', Number(e.target.value))} className="w-full h-10 accent-[rgb(var(--accent))]" />
        </label>
        <label className="flex flex-col gap-1.5"><span className="section-title">Appréciation (bilan annuel)</span>
          <select value={form.rating ?? ''} onChange={(e) => set('rating', e.target.value ? (Number(e.target.value) as Rating) : undefined)} className={field}>
            <option value="">Non évalué</option>
            {([1, 2, 3, 4] as Rating[]).map((r) => <option key={r} value={r}>{RATING_LABELS[r]}</option>)}
          </select></label>
        <section className="flex flex-col gap-2">
          <h3 className="section-title">Notes de suivi</h3>
          {form.notes.length === 0 && <p className="text-[14px] text-muted">Aucune note.</p>}
          {[...form.notes].reverse().map((n, i) => (
            <p key={i} className="text-[15px] leading-snug"><span className="text-muted text-[13px]">{formatShort(n.date)} · </span>{n.text}</p>
          ))}
          <textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ajouter une note de suivi (enregistrée avec OK)" className={area} />
        </section>
        {objective && (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => saveObjectiveTemplate({ title: form.title, description: form.description, category: form.category, scope: form.scope }).then(() => toast('Modèle enregistré'))}>
              Enregistrer comme modèle réutilisable
            </Button>
            {!confirmDelete ? (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>Supprimer…</Button>
            ) : (
              <Button variant="danger" onClick={() => deleteObjective(objective.id).then(() => { toast('Objectif supprimé'); onClose(); })}>Confirmer la suppression</Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function TemplatePicker({ collaboratorId, onClose }: { collaboratorId: string; onClose: () => void }) {
  const templates = useLiveQuery(() => db.objectiveTemplates.toArray(), []) ?? [];
  const [chosen, setChosen] = useState<Partial<ObjectiveInput> | null>(null);
  if (chosen) return <ObjectiveSheet collaboratorId={collaboratorId} initial={chosen} onClose={onClose} />;
  return (
    <Sheet open onClose={onClose} title="Modèles d'objectifs">
      <div className="flex flex-col gap-2">
        {templates.length === 0 && <p className="text-[15px] text-muted leading-snug">Aucun modèle. Ouvre un objectif existant puis « Enregistrer comme modèle », ou importe le pack employeur dans les réglages.</p>}
        {templates.sort((a, b) => a.category.localeCompare(b.category)).map((t) => (
          <button key={t.id} type="button" onClick={() => setChosen({ title: t.title, description: t.description, category: t.category, scope: t.scope })} className="card p-4 text-left">
            <span className="block font-semibold">{t.title}</span>
            <span className="block text-[13px] text-muted">{CATEGORY_LABELS[t.category]} · {t.scope === 'collective' ? 'collectif' : 'individuel'}</span>
            {t.description && <span className="block text-[13px] text-muted mt-1 line-clamp-2 whitespace-pre-line">{t.description}</span>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// --- Compétences -------------------------------------------------------------

function SkillsSection({ collaboratorId, skills }: { collaboratorId: string; skills: Skill[] }) {
  const catalog = useSetting<string[]>(SETTING.skillCatalog, DEFAULT_SKILL_CATALOG);
  const [draft, setDraft] = useState('');
  const sorted = [...skills].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name, 'fr'));
  const missing = catalog.filter((n) => !skills.some((s) => s.name.toLowerCase() === n.toLowerCase()));

  return (
    <Section title="Compétences">
      {skills.length === 0 && <p className="text-[14px] text-muted px-1">Niveau actuel et niveau visé, sur l'échelle du formulaire annuel.</p>}
      {sorted.map((s) => <SkillRow key={s.id} skill={s} />)}
      {missing.length > 0 && (
        <Button variant="secondary" onClick={() => addSkills(collaboratorId, missing)}>
          <Icon name="plus" size={18} /> {skills.length ? `Ajouter les ${missing.length} compétences manquantes du référentiel` : 'Ajouter le référentiel de compétences'}
        </Button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void addSkills(collaboratorId, [draft]); setDraft(''); }} className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Autre compétence" aria-label="Nouvelle compétence" className="flex-1 min-w-0 min-h-[44px] rounded-2xl bg-surface-2 px-3 placeholder:text-muted" />
        <button type="submit" disabled={!draft.trim()} className="min-h-[44px] px-4 rounded-2xl bg-accent text-accent-ink font-semibold disabled:opacity-40">Ajouter</button>
      </form>
    </Section>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const [confirm, setConfirm] = useState(false);
  const gap = skill.target > 0 && skill.current > 0 && skill.current < skill.target;
  const select = (value: number, onChange: (v: number) => void, label: string) => (
    <label className="flex flex-col gap-1 flex-1 min-w-0">
      <span className="text-[12px] text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full min-w-0 min-h-[40px] rounded-xl bg-surface-2 px-2 text-[14px]">
        {SKILL_LEVELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{skill.name}</span>
        <span className="flex items-center gap-1">
          {gap && <Tag tone="warn">à développer</Tag>}
          {!confirm ? (
            <button type="button" aria-label={`Retirer ${skill.name}`} onClick={() => setConfirm(true)} className="w-9 h-9 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
          ) : (
            <button type="button" onClick={() => deleteSkill(skill.id)} className="min-h-[36px] px-2 rounded-lg bg-danger-soft text-danger text-[13px] font-semibold">Retirer</button>
          )}
        </span>
      </div>
      <div className="flex gap-2">
        {select(skill.current, (v) => updateSkill(skill.id, { current: v }), 'Niveau actuel')}
        {select(skill.target, (v) => updateSkill(skill.id, { target: v }), 'Niveau visé')}
      </div>
    </div>
  );
}

// --- Évolution ---------------------------------------------------------------

const TRAINING_STATUS: Record<Training['status'], string> = { wished: 'Souhaitée', planned: 'Programmée', done: 'Réalisée' };

function DevelopmentSection({ collaboratorId, firstName, plan }: { collaboratorId: string; firstName: string; plan?: DevelopmentPlan }) {
  const [wishes, setWishes] = useState(plan?.wishes ?? '');
  const [mobility, setMobility] = useState(plan?.mobility ?? '');
  const [training, setTraining] = useState('');
  const [step, setStep] = useState('');
  useEffect(() => {
    setWishes(plan?.wishes ?? '');
    setMobility(plan?.mobility ?? '');
  }, [plan?.wishes, plan?.mobility]);
  const trainings = plan?.trainings ?? [];
  const steps = plan?.actionPlan ?? [];
  const saveTrainings = (t: Training[]) => saveDevelopmentPlan(collaboratorId, { trainings: t });
  const saveSteps = (s: ActionStep[]) => saveDevelopmentPlan(collaboratorId, { actionPlan: s });

  return (
    <Section title="Évolution">
      <div className="card p-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">Ce que {firstName} souhaite devenir</span>
          <textarea rows={3} value={wishes} onChange={(e) => setWishes(e.target.value)} onBlur={() => wishes !== (plan?.wishes ?? '') && saveDevelopmentPlan(collaboratorId, { wishes })}
            placeholder="Projet professionnel, souhaits exprimés…" className={area} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">Mobilité</span>
          <input value={mobility} onChange={(e) => setMobility(e.target.value)} onBlur={() => mobility !== (plan?.mobility ?? '') && saveDevelopmentPlan(collaboratorId, { mobility })}
            placeholder="ex. mobile géographiquement, autre activité…" className={`${field} placeholder:text-muted`} /></label>

        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold">Formations</h3>
          {trainings.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="flex-1 min-w-0 text-[15px]">{t.label}</span>
              <select aria-label={`Statut de ${t.label}`} value={t.status} onChange={(e) => saveTrainings(trainings.map((x) => (x.id === t.id ? { ...x, status: e.target.value as Training['status'] } : x)))} className="min-h-[40px] rounded-xl bg-surface-2 px-2 text-[14px]">
                {(Object.keys(TRAINING_STATUS) as Training['status'][]).map((k) => <option key={k} value={k}>{TRAINING_STATUS[k]}</option>)}
              </select>
              <button type="button" aria-label={`Retirer ${t.label}`} onClick={() => saveTrainings(trainings.filter((x) => x.id !== t.id))} className="w-9 h-9 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (training.trim()) void saveTrainings([...trainings, { id: newId(), label: training.trim(), status: 'wished' }]); setTraining(''); }} className="flex gap-2">
            <input value={training} onChange={(e) => setTraining(e.target.value)} placeholder="Formation envisagée" aria-label="Nouvelle formation" className="flex-1 min-w-0 min-h-[44px] rounded-2xl bg-surface-2 px-3 placeholder:text-muted" />
            <button type="submit" disabled={!training.trim()} className="min-h-[44px] px-4 rounded-2xl bg-surface-2 font-semibold disabled:opacity-40">Ajouter</button>
          </form>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold">Plan d'action</h3>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input type="checkbox" checked={s.done} aria-label={s.label} onChange={() => saveSteps(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} className="w-6 h-6 accent-[rgb(var(--accent))]" />
              <span className={`flex-1 min-w-0 text-[15px] ${s.done ? 'line-through text-muted' : ''}`}>{s.label}</span>
              <input type="date" value={s.dueDate ?? ''} aria-label={`Échéance de ${s.label}`} onChange={(e) => saveSteps(steps.map((x) => (x.id === s.id ? { ...x, dueDate: e.target.value || undefined } : x)))} className="min-h-[40px] w-[132px] rounded-xl bg-surface-2 px-2 text-[14px]" />
              <button type="button" aria-label={`Retirer ${s.label}`} onClick={() => saveSteps(steps.filter((x) => x.id !== s.id))} className="w-9 h-9 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (step.trim()) void saveSteps([...steps, { id: newId(), label: step.trim(), done: false }]); setStep(''); }} className="flex gap-2">
            <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Étape (tutorat, mise en situation…)" aria-label="Nouvelle étape" className="flex-1 min-w-0 min-h-[44px] rounded-2xl bg-surface-2 px-3 placeholder:text-muted" />
            <button type="submit" disabled={!step.trim()} className="min-h-[44px] px-4 rounded-2xl bg-surface-2 font-semibold disabled:opacity-40">Ajouter</button>
          </form>
        </div>
      </div>
    </Section>
  );
}
