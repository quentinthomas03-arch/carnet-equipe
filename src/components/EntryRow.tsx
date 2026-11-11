import { useState } from 'react';
import type { Collaborator, Entry } from '../db/types';
import { TEAM_ID } from '../db/types';
import { ENTRY_SHORT, daysLate, dueState, isPending } from '../domain/entries';
import { formatShort, todayISO } from '../domain/dates';
import { postponeEntry, resolveEntry, restoreEntry, snoozeEntry } from '../db/repo';
import { isCommitment } from '../domain/entries';
import { useToast } from '../ui/Toast';
import { Avatar, TeamAvatar } from '../ui/Avatar';
import { SwipeRow } from './SwipeRow';
import { EntrySheet } from './EntrySheet';
import { RESOLVE_LABEL, TYPE_TONE } from './entryStyle';

/**
 * Une entrée dans une liste. Toucher → détail/modification.
 * Glisser à droite → traité ; à gauche → reporté (sujets à aborder uniquement).
 */
export function EntryRow({ entry, collaborator, showWho = false, showType = true }: { entry: Entry; collaborator?: Collaborator; showWho?: boolean; showType?: boolean }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const today = todayISO();
  const pending = isPending(entry);
  const due = dueState(entry, today);
  const who = entry.collaboratorId === TEAM_ID ? 'Équipe' : collaborator?.firstName ?? '—';
  /** Applique l'action puis propose « Annuler » (restaure l'entrée telle qu'elle était). */
  const withUndo = (action: () => Promise<void>, msg: string) => {
    const before = { ...entry };
    void action().then(() => toast(msg, { label: 'Annuler', run: () => restoreEntry(before) }));
  };

  const body = (
    <button type="button" onClick={() => setOpen(true)} className="w-full text-left bg-surface px-4 py-3 flex gap-3 items-start min-h-[56px]">
      {showWho &&
        (entry.collaboratorId === TEAM_ID ? <TeamAvatar size={30} /> : collaborator ? <Avatar firstName={collaborator.firstName} lastName={collaborator.lastName} color={collaborator.color} size={30} /> : null)}
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className={`text-[16px] leading-snug ${pending ? 'text-ink' : 'text-muted line-through'}`}>{entry.text}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          {showWho && <span className="font-medium text-ink">{who}</span>}
          {showType && <span className={`px-1.5 py-0.5 rounded-md text-[12px] font-semibold ${TYPE_TONE[entry.type]}`}>{ENTRY_SHORT[entry.type]}</span>}
          {entry.dueDate && pending && (
            <span className={due === 'late' ? 'text-danger font-semibold' : due === 'today' ? 'text-warn font-semibold' : ''}>
              {due === 'late' ? `En retard de ${daysLate(entry, today)} j` : due === 'today' ? "Aujourd'hui" : `Pour le ${formatShort(entry.dueDate)}`}
            </span>
          )}
          {entry.postponeCount > 0 && pending && <span className="text-warn font-medium">reporté {entry.postponeCount}×</span>}
          {!pending && <span>{entry.status === 'dropped' ? 'abandonné' : 'traité'}</span>}
        </span>
      </span>
    </button>
  );

  return (
    <>
      {pending ? (
        <SwipeRow
          rightLabel={RESOLVE_LABEL[entry.type]}
          onSwipeRight={() => withUndo(() => resolveEntry(entry.id), RESOLVE_LABEL[entry.type])}
          leftLabel={entry.type === 'topic' ? 'Reporter' : '+1 semaine'}
          onSwipeLeft={
            entry.type === 'topic'
              ? () => withUndo(() => postponeEntry(entry.id), 'Reporté au prochain point')
              : isCommitment(entry.type)
                ? () => withUndo(() => snoozeEntry(entry.id, 7), 'Échéance repoussée d’une semaine')
                : undefined
          }
        >
          {body}
        </SwipeRow>
      ) : (
        <div className="rounded-2xl overflow-hidden">{body}</div>
      )}
      {open && <EntrySheet entry={entry} open onClose={() => setOpen(false)} />}
    </>
  );
}
