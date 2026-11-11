import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { TEAM_ID, type Entry, type EntryType } from '../db/types';
import { ENTRY_LABELS, ENTRY_TYPES, isCommitment, isPending } from '../domain/entries';
import { deleteEntry, dropEntry, postponeEntry, reopenEntry, resolveEntry, restoreEntry, snoozeEntry, updateEntry } from '../db/repo';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { RESOLVE_LABEL } from './entryStyle';

/** Détail d'une entrée : modifier, déplacer vers un autre collaborateur, traiter, reporter, supprimer. */
export function EntrySheet({ entry, open, onClose }: { entry: Entry; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const collaborators = useLiveQuery(() => db.collaborators.toArray(), []) ?? [];
  const [text, setText] = useState(entry.text);
  const [type, setType] = useState<EntryType>(entry.type);
  const [due, setDue] = useState(entry.dueDate ?? '');
  const [who, setWho] = useState(entry.collaboratorId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setText(entry.text);
      setType(entry.type);
      setDue(entry.dueDate ?? '');
      setWho(entry.collaboratorId);
      setConfirmDelete(false);
    }
  }, [open, entry]);

  const dirty = text.trim() !== entry.text || type !== entry.type || due !== (entry.dueDate ?? '') || who !== entry.collaboratorId;
  const pending = isPending(entry);

  async function save() {
    if (!text.trim()) return;
    await updateEntry(entry.id, { text: text.trim(), type, dueDate: due || undefined, collaboratorId: who });
    toast(who !== entry.collaboratorId ? 'Déplacé' : 'Modifié');
    onClose();
  }
  /** Toutes les actions de la feuille proposent « Annuler » (y compris la suppression). */
  async function run(action: () => Promise<void>, msg: string) {
    const before = { ...entry };
    await action();
    toast(msg, { label: 'Annuler', run: () => restoreEntry(before) });
    onClose();
  }

  const options = [
    ...collaborators.filter((c) => !c.archivedAt || c.id === entry.collaboratorId).sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr')),
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ENTRY_LABELS[entry.type]}
      action={
        <button type="button" onClick={save} disabled={!dirty || !text.trim()} className="min-h-[44px] px-2 font-semibold text-accent disabled:text-muted">
          OK
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="section-title">Texte</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-2xl bg-surface-2 p-3 leading-snug resize-none" />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="section-title mb-1.5">Type</legend>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
                className={`min-h-[40px] px-3 rounded-xl text-[14px] ${type === t ? 'bg-ink text-bg font-semibold' : 'bg-surface-2 text-ink'}`}>
                {ENTRY_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Concerne</span>
            <select value={who} onChange={(e) => setWho(e.target.value)} className="min-h-[48px] rounded-2xl bg-surface-2 px-3">
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
              <option value={TEAM_ID}>Toute l'équipe</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Échéance</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="min-h-[48px] rounded-2xl bg-surface-2 px-3 w-full" />
          </label>
        </div>
        {due && <button type="button" onClick={() => setDue('')} className="self-start -mt-3 min-h-[36px] text-[14px] text-accent font-medium">Retirer l'échéance</button>}

        <div className="flex flex-col gap-2 pt-1">
          {pending ? (
            <>
              <Button onClick={() => run(() => resolveEntry(entry.id), RESOLVE_LABEL[entry.type])}>Marquer « {RESOLVE_LABEL[entry.type]} »</Button>
              {entry.type === 'topic' && <Button variant="secondary" onClick={() => run(() => postponeEntry(entry.id), 'Reporté')}>Reporter au prochain point</Button>}
              {isCommitment(entry.type) && <Button variant="secondary" onClick={() => run(() => snoozeEntry(entry.id, 7), 'Échéance repoussée d’une semaine')}>Repousser d'une semaine</Button>}
              {isCommitment(entry.type) && <Button variant="secondary" onClick={() => run(() => dropEntry(entry.id), 'Abandonné')}>Abandonner cet engagement</Button>}
            </>
          ) : (
            <Button variant="secondary" onClick={() => run(() => reopenEntry(entry.id), 'Rouvert')}>Remettre en attente</Button>
          )}
          {!confirmDelete ? (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>Supprimer…</Button>
          ) : (
            <Button variant="danger" onClick={() => run(() => deleteEntry(entry.id), 'Supprimé')}>Confirmer la suppression définitive</Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
