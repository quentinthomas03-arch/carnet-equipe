import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Collaborator } from '../db/types';
import { SETTING, useSetting, DEFAULT_ACTIVITIES, DEFAULT_SITES } from '../db/settings';
import { createCollaborator, updateCollaborator, type CollaboratorInput } from '../db/repo';
import { CADENCE_OPTIONS } from '../domain/cadence';
import { COLLABORATOR_COLORS, COLOR_KEYS, nextColor } from '../ui/palette';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';

const field = 'min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full';

/**
 * Ajout / modification d'un collaborateur. Seul le prénom est obligatoire ;
 * tout le reste a une valeur par défaut raisonnable.
 */
export function CollaboratorForm({ open, onClose, collaborator, onCreated }: { open: boolean; onClose: () => void; collaborator?: Collaborator; onCreated?: (id: string) => void }) {
  const toast = useToast();
  const sites = useSetting<string[]>(SETTING.sites, DEFAULT_SITES);
  const activities = useSetting<string[]>(SETTING.activities, DEFAULT_ACTIVITIES);
  const usedColors = useLiveQuery(() => db.collaborators.filter((c) => !c.archivedAt).toArray().then((l) => l.map((c) => c.color)), []) ?? [];

  const blank = (): CollaboratorInput => ({
    firstName: '', lastName: '', role: '', site: sites[0] ?? '', activity: activities[0] ?? '', arrivalDate: undefined, cadenceDays: 30, color: nextColor(usedColors),
  });
  const [form, setForm] = useState<CollaboratorInput>(blank);

  useEffect(() => {
    if (!open) return;
    if (collaborator) {
      const { id: _i, createdAt: _c, updatedAt: _u, archivedAt: _a, ...rest } = collaborator;
      setForm(rest);
    } else setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collaborator]);

  const set = <K extends keyof CollaboratorInput>(k: K, v: CollaboratorInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.firstName.trim().length > 0;

  async function save() {
    if (!valid) return;
    const clean = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), role: form.role.trim(), arrivalDate: form.arrivalDate || undefined };
    if (collaborator) {
      await updateCollaborator(collaborator.id, clean);
      toast('Fiche mise à jour');
    } else {
      const id = await createCollaborator(clean);
      toast(`${clean.firstName} ajouté·e`);
      onCreated?.(id);
    }
    onClose();
  }

  const siteOptions = form.site && !sites.includes(form.site) ? [...sites, form.site] : sites;
  const activityOptions = form.activity && !activities.includes(form.activity) ? [...activities, form.activity] : activities;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={collaborator ? 'Modifier la fiche' : 'Nouveau collaborateur'}
      action={
        <button type="button" onClick={save} disabled={!valid} className="min-h-[40px] px-4 rounded-full bg-accent text-accent-ink font-semibold disabled:opacity-40">
          {collaborator ? 'OK' : 'Ajouter'}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Prénom *</span>
            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoCapitalize="words" autoComplete="off" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Nom</span>
            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} autoCapitalize="words" autoComplete="off" className={field} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="section-title">Poste</span>
          <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="ex. Technicien VLEP" className={`${field} placeholder:text-muted`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Site</span>
            <select value={form.site} onChange={(e) => set('site', e.target.value)} className={field}>
              <option value="">—</option>
              {siteOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Activité</span>
            <select value={form.activity} onChange={(e) => set('activity', e.target.value)} className={field}>
              <option value="">—</option>
              {activityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Arrivée</span>
            <input type="date" value={form.arrivalDate ?? ''} onChange={(e) => set('arrivalDate', e.target.value || undefined)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Rythme des points</span>
            <select value={form.cadenceDays} onChange={(e) => set('cadenceDays', Number(e.target.value))} className={field}>
              {CADENCE_OPTIONS.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="section-title mb-2">Couleur de repérage</legend>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_KEYS.map((k) => (
              <button key={k} type="button" aria-label={COLLABORATOR_COLORS[k].label} aria-pressed={form.color === k} onClick={() => set('color', k)}
                className={`w-11 h-11 rounded-full ring-offset-2 ring-offset-surface ${form.color === k ? 'ring-[3px] ring-ink' : ''}`}
                style={{ background: COLLABORATOR_COLORS[k].hex }} />
            ))}
          </div>
        </fieldset>
        <p className="text-[13px] text-muted">Les listes de sites et d'activités se modifient dans les Réglages.</p>
      </div>
    </Sheet>
  );
}
