import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { OnboardingTemplate, OnboardingTemplateStep } from '../db/types';
import { deleteObjectiveTemplate, deleteOnboardingTemplate, newId, saveOnboardingTemplate } from '../db/repo';
import { SETTING } from '../db/settings';
import { CATEGORY_LABELS, DEFAULT_SKILL_CATALOG } from '../domain/objectives';
import { offsetLabel } from '../domain/onboarding';
import { BackHeader } from '../ui/BackHeader';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { ListEditor } from '../components/ListEditor';

/** Réglages › Parcours d'intégration : modèles appliqués aux nouvelles recrues. */
export function OnboardingTemplatesPage() {
  const templates = useLiveQuery(() => db.onboardingTemplates.toArray(), []) ?? [];
  const [editing, setEditing] = useState<OnboardingTemplate | null>(null);
  const create = () =>
    setEditing({ id: newId(), createdAt: new Date().toISOString(), updatedAt: '', name: 'Nouveau parcours', isDefault: false, trialPeriodDays: 90, steps: [] });

  return (
    <div className="pb-8">
      <BackHeader title="Parcours d'intégration" />
      <div className="px-4 flex flex-col gap-3">
        <p className="text-[14px] text-muted leading-snug px-1">
          Le modèle s'applique aux recrues dont tu démarres l'onboarding ensuite. Les parcours déjà démarrés ne changent pas : on les ajuste sur la fiche de la recrue.
        </p>
        {templates.map((t) => (
          <button key={t.id} type="button" onClick={() => setEditing(t)} className="card p-4 text-left flex items-center gap-3">
            <span className="flex-1">
              <span className="block font-semibold">{t.name}{t.isDefault ? ' · par défaut' : ''}</span>
              <span className="block text-[13px] text-muted">{t.steps.length} étapes · {t.steps.filter((s) => s.createsMeeting).length} points de suivi · essai {t.trialPeriodDays} j</span>
            </span>
            <Icon name="chevron" size={18} className="text-muted" />
          </button>
        ))}
        <Button variant="secondary" onClick={create}><Icon name="plus" size={18} /> Nouveau modèle</Button>
      </div>
      {editing && <TemplateEditor template={editing} canDelete={templates.length > 1} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TemplateEditor({ template, canDelete, onClose }: { template: OnboardingTemplate; canDelete: boolean; onClose: () => void }) {
  const toast = useToast();
  const [tpl, setTpl] = useState<OnboardingTemplate>(template);
  const [confirm, setConfirm] = useState(false);
  const steps = [...tpl.steps].sort((a, b) => a.offsetDays - b.offsetDays);
  const setStep = (id: string, patch: Partial<OnboardingTemplateStep>) => setTpl((t) => ({ ...t, steps: t.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const lastPhase = steps.at(-1)?.phase ?? 'Jour 1';

  async function save() {
    await saveOnboardingTemplate({ ...tpl, steps: tpl.steps.filter((s) => s.label.trim()) });
    toast('Modèle enregistré');
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title="Modèle de parcours"
      action={<button type="button" onClick={save} disabled={!tpl.name.trim()} className="min-h-[40px] px-4 rounded-full bg-accent text-accent-ink font-semibold disabled:opacity-40">OK</button>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="section-title">Nom</span>
          <input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} className="min-h-[48px] rounded-2xl bg-surface-2 px-3" /></label>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="flex flex-col gap-1.5"><span className="section-title">Période d'essai (jours)</span>
            <input type="number" inputMode="numeric" min={0} value={tpl.trialPeriodDays} onChange={(e) => setTpl({ ...tpl, trialPeriodDays: Math.max(0, Number(e.target.value)) })} className="min-h-[48px] rounded-2xl bg-surface-2 px-3" /></label>
          <label className="flex items-center gap-2 min-h-[48px]">
            <input type="checkbox" checked={tpl.isDefault} onChange={(e) => setTpl({ ...tpl, isDefault: e.target.checked })} className="w-6 h-6 accent-[rgb(var(--accent))]" />
            <span className="text-[15px]">Modèle par défaut</span>
          </label>
        </div>
        <p className="text-[13px] text-muted">Décalage en jours par rapport à l'arrivée : -20 = 20 jours avant, 0 = jour d'arrivée, 28 = 4 semaines après.</p>
        {steps.map((s) => (
          <div key={s.id} className="card p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input aria-label="Phase" value={s.phase} onChange={(e) => setStep(s.id, { phase: e.target.value })} className="flex-1 min-h-[40px] rounded-xl bg-surface-2 px-2 text-[14px]" />
              <label className="flex items-center gap-1 text-[13px] text-muted">
                <span>{offsetLabel(s.offsetDays)}</span>
                <input aria-label="Décalage en jours" type="number" inputMode="numeric" value={s.offsetDays} onChange={(e) => setStep(s.id, { offsetDays: Number(e.target.value) })} className="w-16 min-h-[40px] rounded-xl bg-surface-2 px-2 text-[14px]" />
              </label>
              <button type="button" aria-label="Retirer l'étape" onClick={() => setTpl((t) => ({ ...t, steps: t.steps.filter((x) => x.id !== s.id) }))} className="w-10 h-10 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
            </div>
            <input aria-label="Étape" value={s.label} onChange={(e) => setStep(s.id, { label: e.target.value })} placeholder="Étape" className="min-h-[44px] rounded-xl bg-surface-2 px-3" />
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={!!s.createsMeeting} onChange={(e) => setStep(s.id, { createsMeeting: e.target.checked || undefined })} className="w-5 h-5 accent-[rgb(var(--accent))]" />
              Créer un point de suivi à cette date
            </label>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setTpl((t) => ({ ...t, steps: [...t.steps, { id: newId(), phase: lastPhase, label: '', offsetDays: (steps.at(-1)?.offsetDays ?? 0) + 1 }] }))}>
          <Icon name="plus" size={18} /> Ajouter une étape
        </Button>
        {canDelete && (!confirm ? (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>Supprimer ce modèle…</Button>
        ) : (
          <Button variant="danger" onClick={() => deleteOnboardingTemplate(tpl.id).then(onClose)}>Confirmer la suppression</Button>
        ))}
      </div>
    </Sheet>
  );
}

/** Réglages › Modèles d'objectifs et référentiel de compétences. */
export function ModelsPage() {
  const templates = useLiveQuery(() => db.objectiveTemplates.toArray(), []) ?? [];
  return (
    <div className="pb-8">
      <BackHeader title="Objectifs et compétences" />
      <div className="px-4 flex flex-col gap-4">
        <section className="card p-5 flex flex-col gap-3">
          <h2 className="section-title">Modèles d'objectifs</h2>
          {templates.length === 0 && <p className="text-[14px] text-muted leading-snug">Sur un objectif, touche « Enregistrer comme modèle réutilisable ».</p>}
          {templates.sort((a, b) => a.category.localeCompare(b.category)).map((t) => (
            <div key={t.id} className="flex items-center gap-2 border-b border-line last:border-0 pb-2">
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{t.title}</span>
                <span className="block text-[13px] text-muted">{CATEGORY_LABELS[t.category]}</span>
              </span>
              <button type="button" aria-label={`Supprimer le modèle ${t.title}`} onClick={() => deleteObjectiveTemplate(t.id)} className="w-10 h-10 flex items-center justify-center text-muted"><Icon name="close" size={16} /></button>
            </div>
          ))}
        </section>
        <section className="card p-5 flex flex-col gap-3">
          <h2 className="section-title">Référentiel de compétences</h2>
          <p className="text-[14px] text-muted leading-snug">Proposé sur chaque fiche (onglet Objectifs) en un tap.</p>
          <ListEditor settingKey={SETTING.skillCatalog} fallback={DEFAULT_SKILL_CATALOG} label="Compétences" placeholder="Nouvelle compétence" />
        </section>
      </div>
    </div>
  );
}
