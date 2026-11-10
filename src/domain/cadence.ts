/**
 * Rythme des points individuels et priorité des collaborateurs.
 */
import type { Collaborator, DateISO, Entry, Meeting } from '../db/types';
import { addDaysISO, daysBetween, toDateISO } from './dates';
import { dueState, isPending } from './entries';

export const CADENCE_OPTIONS = [
  { days: 14, label: 'Toutes les 2 semaines' },
  { days: 21, label: 'Toutes les 3 semaines' },
  { days: 30, label: 'Mensuel' },
  { days: 45, label: 'Toutes les 6 semaines' },
  { days: 60, label: 'Tous les 2 mois' },
  { days: 90, label: 'Trimestriel' },
];

export function cadenceLabel(days: number): string {
  return CADENCE_OPTIONS.find((o) => o.days === days)?.label ?? `Tous les ${days} jours`;
}

/** Date du dernier point effectué (le plus récent). */
export function lastMeetingDate(meetings: Meeting[]): DateISO | undefined {
  return meetings
    .filter((m) => m.status === 'done')
    .map((m) => m.date)
    .sort()
    .at(-1);
}

export interface MeetingSchedule {
  last?: DateISO;
  /** Date retenue pour le prochain point. */
  next: DateISO;
  /** Vrai si la date vient du calcul (non validée par le manager). */
  suggested: boolean;
  /** Jours restants avant le prochain point (négatif = en retard). */
  daysUntil: number;
  overdue: boolean;
}

/**
 * Prochain point = date validée par le manager si elle existe et n'est pas antérieure au dernier point ;
 * sinon dernier point + rythme. Sans aucun point enregistré, on part de la date la plus récente entre
 * l'arrivée et la création de la fiche : un collaborateur ancien ajouté aujourd'hui n'est pas « en retard de 2 ans ».
 */
export function meetingSchedule(c: Collaborator, meetings: Meeting[], today: DateISO): MeetingSchedule {
  const last = lastMeetingDate(meetings);
  const validated = c.nextMeetingDate && (!last || c.nextMeetingDate > last) ? c.nextMeetingDate : undefined;
  const created = toDateISO(new Date(c.createdAt));
  const base = last ?? (c.arrivalDate && c.arrivalDate > created ? c.arrivalDate : created);
  const next = validated ?? addDaysISO(base, c.cadenceDays);
  const daysUntil = daysBetween(today, next);
  return { last, next, suggested: !validated, daysUntil, overdue: daysUntil < 0 };
}

export interface CollaboratorSummary {
  collaborator: Collaborator;
  schedule: MeetingSchedule;
  topics: number;
  myOpen: number;
  myLate: number;
  theirOpen: number;
  theirLate: number;
  recentSuccesses: number;
  openAlerts: number;
  /** Plus le score est élevé, plus le collaborateur remonte en haut de la liste. */
  priority: number;
}

export function summarize(c: Collaborator, entries: Entry[], meetings: Meeting[], today: DateISO): CollaboratorSummary {
  const mine = entries.filter((e) => e.collaboratorId === c.id);
  const pending = mine.filter(isPending);
  const count = (pred: (e: Entry) => boolean) => pending.filter(pred).length;
  const schedule = meetingSchedule(c, meetings.filter((m) => m.collaboratorId === c.id), today);
  const s = {
    collaborator: c,
    schedule,
    topics: count((e) => e.type === 'topic'),
    myOpen: count((e) => e.type === 'myCommitment'),
    myLate: count((e) => e.type === 'myCommitment' && dueState(e, today) === 'late'),
    theirOpen: count((e) => e.type === 'theirCommitment'),
    theirLate: count((e) => e.type === 'theirCommitment' && dueState(e, today) === 'late'),
    recentSuccesses: count((e) => e.type === 'success'),
    openAlerts: count((e) => e.type === 'alert'),
    priority: 0,
  };
  s.priority = priorityScore(s);
  return s;
}

/**
 * Score de priorité : point en retard (ou imminent), mes engagements en retard, alertes ouvertes,
 * puis volume de sujets en attente. Les poids sont volontairement simples et lisibles.
 */
export function priorityScore(s: Omit<CollaboratorSummary, 'priority' | 'collaborator'>): number {
  const d = s.schedule.daysUntil;
  let score = 0;
  if (d < 0) score += 100 + Math.min(-d, 60);
  else if (d <= 3) score += 50 - d * 5;
  else if (d <= 7) score += 20;
  score += s.myLate * 30 + s.theirLate * 10 + s.openAlerts * 15 + s.topics * 3;
  return score;
}

export function sortByPriority(list: CollaboratorSummary[]): CollaboratorSummary[] {
  return [...list].sort(
    (a, b) => b.priority - a.priority || a.schedule.next.localeCompare(b.schedule.next) || a.collaborator.firstName.localeCompare(b.collaborator.firstName, 'fr'),
  );
}
