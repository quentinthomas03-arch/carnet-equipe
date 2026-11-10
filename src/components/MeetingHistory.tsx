import { useEffect, useState } from 'react';
import type { Entry, Meeting, Workload } from '../db/types';
import { deleteMeeting, updateMeeting } from '../db/repo';
import { formatLong, formatShort } from '../domain/dates';
import { meetingSummary, WORKLOAD_LABELS } from '../domain/meetingPrep';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Chip';
import { useToast } from '../ui/Toast';

const WORKLOAD_TONE: Record<Workload, 'ok' | 'warn' | 'danger'> = { ok: 'ok', tense: 'warn', overloaded: 'danger' };

/** Historique des points d'un collaborateur, du plus récent au plus ancien. */
export function MeetingHistory({ meetings, entries }: { meetings: Meeting[]; entries: Entry[] }) {
  const [open, setOpen] = useState<Meeting | null>(null);
  const done = meetings.filter((m) => m.status === 'done').sort((a, b) => b.date.localeCompare(a.date));
  if (!done.length) return <p className="text-[14px] text-muted px-1">Aucun point enregistré. Ouvre « Préparer le point » puis « Débriefer ».</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {done.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => setOpen(m)} className="card w-full text-left p-4 flex flex-col gap-1.5">
              <span className="flex justify-between items-center gap-2">
                <span className="font-semibold first-letter:uppercase">{formatLong(m.date)}</span>
                {m.workload && <Tag tone={WORKLOAD_TONE[m.workload]}>{WORKLOAD_LABELS[m.workload]}</Tag>}
              </span>
              <span className="text-[14px] text-muted leading-snug line-clamp-2">{meetingSummary(m)}</span>
            </button>
          </li>
        ))}
      </ul>
      {open && <MeetingSheet meeting={open} entries={entries} onClose={() => setOpen(null)} />}
    </>
  );
}

function MeetingSheet({ meeting, entries, onClose }: { meeting: Meeting; entries: Entry[]; onClose: () => void }) {
  const toast = useToast();
  const [decisions, setDecisions] = useState(meeting.decisions);
  const [note, setNote] = useState(meeting.note);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [meeting]);
  const covered = entries.filter((e) => meeting.coveredEntryIds.includes(e.id));
  const postponed = entries.filter((e) => meeting.postponedEntryIds.includes(e.id));
  const created = entries.filter((e) => e.meetingId === meeting.id && !meeting.coveredEntryIds.includes(e.id));
  const dirty = decisions !== meeting.decisions || note !== meeting.note;
  const field = 'w-full rounded-2xl bg-surface-2 p-3 leading-snug resize-none';

  return (
    <Sheet open onClose={onClose} title={`Point du ${formatShort(meeting.date)}`}
      action={dirty ? <button type="button" className="min-h-[44px] px-2 font-semibold text-accent" onClick={() => updateMeeting(meeting.id, { decisions, note }).then(() => { toast('Modifié'); onClose(); })}>OK</button> : undefined}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className="section-title">Décisions</span><textarea rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} className={field} /></label>
        <label className="flex flex-col gap-1.5"><span className="section-title">Note</span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} /></label>
        {[['Traités', covered], ['Reportés', postponed], ['Engagements pris', created]].map(([title, list]) =>
          (list as Entry[]).length ? (
            <section key={title as string} className="flex flex-col gap-1">
              <h3 className="section-title">{title as string} · {(list as Entry[]).length}</h3>
              <ul className="list-disc pl-5 text-[15px] leading-snug">{(list as Entry[]).map((e) => <li key={e.id}>{e.text}</li>)}</ul>
            </section>
          ) : null,
        )}
        {!confirm ? (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>Supprimer ce point…</Button>
        ) : (
          <>
            <p className="text-[14px] text-muted">Le point disparaît de l'historique. Les éléments traités restent traités.</p>
            <Button variant="danger" onClick={() => deleteMeeting(meeting.id).then(() => { toast('Point supprimé'); onClose(); })}>Confirmer la suppression</Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
