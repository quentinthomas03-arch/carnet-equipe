/**
 * Préparation et débrief d'un point individuel.
 *
 * Préparer : tout ce qu'il faut avoir sous les yeux, calculé à partir de ce qui a été noté.
 * Débriefer : à partir des cases cochées pendant le point, on déduit ce qui est traité
 * (archivé automatiquement) et ce qui est reporté (reste en attente pour le prochain point).
 */
import type { Collaborator, DateISO, Entry, EntryType, Meeting, Objective, Workload } from '../db/types';
import { isPending } from './entries';

export interface MeetingPrep {
  topics: Entry[];
  /** Sujets reportés lors du dernier point et toujours en attente. */
  leftOver: Entry[];
  myCommitments: Entry[];
  theirCommitments: Entry[];
  successes: Entry[];
  alerts: Entry[];
  objectives: Objective[];
  lastMeeting?: Meeting;
}

const byDueThenCreated = (a: Entry, b: Entry) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt.localeCompare(b.createdAt);

export function buildPrep(c: Collaborator, entries: Entry[], meetings: Meeting[], objectives: Objective[]): MeetingPrep {
  const mine = entries.filter((e) => e.collaboratorId === c.id && isPending(e));
  const done = meetings.filter((m) => m.collaboratorId === c.id && m.status === 'done').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const lastMeeting = done.at(-1);
  const leftOverIds = new Set(lastMeeting?.postponedEntryIds ?? []);
  const of = (t: EntryType) => mine.filter((e) => e.type === t).sort(byDueThenCreated);
  return {
    leftOver: of('topic').filter((e) => leftOverIds.has(e.id)),
    topics: of('topic').filter((e) => !leftOverIds.has(e.id)),
    myCommitments: of('myCommitment'),
    theirCommitments: of('theirCommitment'),
    successes: of('success'),
    alerts: of('alert'),
    objectives: objectives
      .filter((o) => o.collaboratorId === c.id && (o.status === 'notStarted' || o.status === 'inProgress'))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    lastMeeting,
  };
}

/** Toutes les entrées présentées en préparation (pour le débrief). */
export function prepEntries(p: MeetingPrep): Entry[] {
  return [...p.leftOver, ...p.topics, ...p.myCommitments, ...p.theirCommitments, ...p.successes, ...p.alerts];
}

export interface NewCommitment {
  type: 'myCommitment' | 'theirCommitment';
  text: string;
  dueDate?: DateISO;
}

export interface DebriefInput {
  collaboratorId: string;
  date: DateISO;
  /** Entrées cochées pendant le point (abordées / faites). */
  checkedIds: string[];
  /** Entrées présentées en préparation. */
  presented: Entry[];
  decisions: string;
  note: string;
  workload?: Workload;
  newCommitments: NewCommitment[];
  /** Date du prochain point retenue (validée par le manager). */
  nextMeetingDate?: DateISO;
}

export interface DebriefPlan {
  resolve: string[];
  postpone: string[];
}

/**
 * Règles du débrief :
 * - coché → traité (archivé, rattaché au point) ;
 * - sujet à aborder non coché → reporté (reste en attente, compteur de reports +1) ;
 * - engagement, réussite ou alerte non coché → inchangé (reste ouvert, sans être « reporté »).
 */
export function planDebrief(input: Pick<DebriefInput, 'checkedIds' | 'presented'>): DebriefPlan {
  const checked = new Set(input.checkedIds);
  return {
    resolve: input.presented.filter((e) => checked.has(e.id)).map((e) => e.id),
    postpone: input.presented.filter((e) => e.type === 'topic' && !checked.has(e.id)).map((e) => e.id),
  };
}

export const WORKLOAD_LABELS: Record<Workload, string> = {
  ok: 'Charge OK',
  tense: 'Charge tendue',
  overloaded: 'Surcharge',
};

/** Résumé d'une ligne pour l'historique. */
export function meetingSummary(m: Meeting): string {
  const first = (m.decisions || m.note).split('\n').map((l) => l.trim()).find(Boolean);
  const parts = [`${m.coveredEntryIds.length} traité${m.coveredEntryIds.length > 1 ? 's' : ''}`];
  if (m.postponedEntryIds.length) parts.push(`${m.postponedEntryIds.length} reporté${m.postponedEntryIds.length > 1 ? 's' : ''}`);
  return first ? `${first} · ${parts.join(', ')}` : parts.join(', ');
}
