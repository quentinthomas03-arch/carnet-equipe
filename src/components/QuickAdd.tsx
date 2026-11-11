import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { TEAM_ID, type EntryType } from '../db/types';
import { SETTING, getSetting, setSetting } from '../db/settings';
import { createEntries } from '../db/repo';
import { ENTRY_LABELS, ENTRY_TYPES, dueShortcuts } from '../domain/entries';
import { formatShort, todayISO } from '../domain/dates';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { colorHex } from '../ui/palette';
import { useToast } from '../ui/Toast';

interface Preset {
  collaboratorId?: string;
  type?: EntryType;
}

const QuickAddCtx = createContext<(p?: Preset) => void>(() => {});
export const useQuickAdd = () => useContext(QuickAddCtx);

interface LastQuickAdd {
  collaboratorIds: string[];
  type: EntryType;
}

/** Fournit `openQuickAdd()` à toute l'appli et affiche la feuille de saisie rapide. */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<Preset | null>(null);
  return (
    <QuickAddCtx.Provider value={(p) => setPreset(p ?? {})}>
      {children}
      {preset && <QuickAddSheet preset={preset} onClose={() => setPreset(null)} />}
    </QuickAddCtx.Provider>
  );
}


/**
 * Saisie rapide en 5 secondes : qui (un ou plusieurs, ou l'équipe), quoi (5 gros boutons),
 * le texte (grand champ, dictée par le micro du clavier), une échéance facultative.
 * Le dernier collaborateur et le dernier type sont mémorisés.
 */
function QuickAddSheet({ preset, onClose }: { preset: Preset; onClose: () => void }) {
  const toast = useToast();
  const collaborators = useLiveQuery(() => db.collaborators.filter((c) => !c.archivedAt).toArray(), []);
  const [who, setWho] = useState<string[]>([]);
  const [type, setType] = useState<EntryType>('topic');
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [ready, setReady] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Pré-remplissage : contexte d'ouverture, sinon dernier choix mémorisé.
  useEffect(() => {
    if (!collaborators || ready) return;
    getSetting<LastQuickAdd>(SETTING.lastQuickAdd).then((last) => {
      const valid = new Set([...collaborators.map((c) => c.id), TEAM_ID]);
      const remembered = (last?.collaboratorIds ?? []).filter((id) => valid.has(id));
      setWho(preset.collaboratorId ? [preset.collaboratorId] : remembered.length ? remembered : collaborators.length === 1 ? [collaborators[0].id] : []);
      setType(preset.type ?? last?.type ?? 'topic');
      setReady(true);
    });
  }, [collaborators, preset, ready]);

  const sorted = [...(collaborators ?? [])].sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'));
  const canSave = who.length > 0 && text.trim().length > 0;
  const today = todayISO();

  function toggle(id: string) {
    setWho((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }

  /** `again` : enregistre puis garde la feuille ouverte (même collaborateur, même type) pour noter la suite. */
  async function save(again = false) {
    if (!canSave) return;
    await createEntries({ collaboratorIds: who, type, text, dueDate: due || undefined });
    await setSetting(SETTING.lastQuickAdd, { collaboratorIds: who, type } satisfies LastQuickAdd);
    const names = who.map((id) => (id === TEAM_ID ? "l'équipe" : sorted.find((c) => c.id === id)?.firstName)).join(', ');
    toast(`Noté pour ${names}`);
    if (again) {
      setText('');
      setDue('');
      textRef.current?.focus();
    } else onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Noter vite"
      action={
        <button type="button" onClick={() => save()} disabled={!canSave} className="min-h-[40px] px-4 rounded-full bg-accent text-accent-ink font-semibold disabled:opacity-40">
          Noter
        </button>
      }
    >
      {collaborators && collaborators.length === 0 ? (
        <p className="text-[15px] text-muted leading-snug">Ajoute d'abord un collaborateur depuis l'écran Équipe (bouton « Ajouter »). Tu peux aussi noter pour toute l'équipe :</p>
      ) : null}
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="sr-only">Pour qui</legend>
          <div className="flex flex-wrap gap-2">
            {sorted.map((c) => (
              <button key={c.id} type="button" aria-pressed={who.includes(c.id)} onClick={() => toggle(c.id)}
                className={`min-h-[44px] pl-2 pr-3.5 rounded-full inline-flex items-center gap-2 text-[15px] ${who.includes(c.id) ? 'bg-ink text-bg font-semibold' : 'bg-surface-2 text-ink'}`}>
                <span aria-hidden="true" className="w-6 h-6 rounded-full" style={{ background: colorHex(c.color) }} />
                {c.firstName}
              </button>
            ))}
            <button type="button" aria-pressed={who.includes(TEAM_ID)} onClick={() => toggle(TEAM_ID)}
              className={`min-h-[44px] px-3.5 rounded-full text-[15px] ${who.includes(TEAM_ID) ? 'bg-ink text-bg font-semibold' : 'bg-surface-2 text-ink'}`}>
              Équipe
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {ENTRY_TYPES.map((t, i) => (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
                className={`min-h-[52px] rounded-2xl border text-[16px] ${i === ENTRY_TYPES.length - 1 ? 'col-span-2' : ''} ${type === t ? 'bg-accent text-accent-ink border-accent font-semibold' : 'bg-surface border-line text-ink'}`}>
                {ENTRY_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-text" className="sr-only">Texte</label>
          <textarea id="quick-text" ref={textRef} value={text} onChange={(e) => setText(e.target.value)} rows={4}
            placeholder="Quoi ?" enterKeyHint="done"
            className="w-full rounded-2xl bg-surface-2 p-4 text-[17px] leading-snug resize-none placeholder:text-muted" />
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
              <Icon name="mic" size={16} /> Pour dicter, touche le micro du clavier.
            </p>
            <button type="button" onClick={() => save(true)} disabled={!canSave} className="min-h-[36px] px-3 rounded-full bg-surface-2 text-[14px] font-semibold disabled:opacity-40 shrink-0">
              Noter + autre
            </button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="section-title mb-2">Échéance (facultatif)</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!due} onClick={() => setDue('')} className={`min-h-[40px] px-3 rounded-xl text-[14px] ${!due ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>Aucune</button>
            {dueShortcuts(today).map((s) => (
              <button key={s.label} type="button" aria-pressed={due === s.date} onClick={() => setDue(s.date)}
                className={`min-h-[40px] px-3 rounded-xl text-[14px] ${due === s.date ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>
                {s.label}
              </button>
            ))}
            <label className={`min-h-[40px] px-3 rounded-xl text-[14px] inline-flex items-center gap-1 relative ${due && !dueShortcuts(today).some((s) => s.date === due) ? 'bg-ink text-bg font-semibold' : 'bg-surface-2'}`}>
              {due && !dueShortcuts(today).some((s) => s.date === due) ? formatShort(due) : 'Date…'}
              <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} aria-label="Choisir une date" className="absolute inset-0 opacity-0" />
            </label>
          </div>
        </fieldset>
      </div>
    </Sheet>
  );
}
