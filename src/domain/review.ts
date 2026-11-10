/**
 * Bilan d'entretien annuel : compilation de tout ce qui a été noté sur une période.
 *
 * Rien n'est inventé : le bilan ne contient que des éléments saisis dans l'appli.
 * Les rubriques suivent le formulaire d'entretien annuel (bilan de l'année, objectifs,
 * charge de travail, compétences, évolution / formations).
 */
import type {
  Collaborator, DateISO, DevelopmentPlan, Entry, EntryType, Meeting, Objective, Onboarding, Skill, Workload,
} from '../db/types';
import { TEAM_ID } from '../db/types';
import { isPending } from './entries';
import { onboardingProgress } from './onboarding';

export interface Period {
  start: DateISO;
  end: DateISO;
}

/** Période par défaut : année civile en cours, ou la précédente en janvier-mars (saison des entretiens). */
export function defaultPeriod(today: DateISO): Period {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const y = month <= 3 ? year - 1 : year;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export const inPeriod = (d: string | undefined, p: Period) => !!d && d.slice(0, 10) >= p.start && d.slice(0, 10) <= p.end;

export interface CommitmentReport {
  /** Tenus (dont en retard). */
  kept: Entry[];
  keptLate: Entry[];
  /** Non tenus : abandonnés, ou échéance dépassée sans être faits. */
  notKept: Entry[];
  /** En cours, pas encore échus. */
  open: Entry[];
  /** Taux de tenue (null si rien d'évaluable). */
  rate: number | null;
}

export function commitmentReport(entries: Entry[], type: EntryType, p: Period, today: DateISO): CommitmentReport {
  const ref = today < p.end ? today : p.end;
  const relevant = entries.filter(
    (e) => e.type === type && (inPeriod(e.createdAt, p) || inPeriod(e.dueDate, p) || inPeriod(e.resolvedAt, p)),
  );
  const kept = relevant.filter((e) => e.status === 'done');
  const keptLate = kept.filter((e) => e.dueDate && e.resolvedAt && e.resolvedAt.slice(0, 10) > e.dueDate);
  const notKept = relevant.filter((e) => e.status === 'dropped' || (isPending(e) && !!e.dueDate && e.dueDate < ref));
  const open = relevant.filter((e) => isPending(e) && !notKept.includes(e));
  const evaluable = kept.length + notKept.length;
  return { kept, keptLate, notKept, open, rate: evaluable ? Math.round((kept.length / evaluable) * 100) : null };
}

export interface CollaboratorReview {
  collaborator: Collaborator;
  period: Period;
  successes: Entry[];
  alerts: Entry[];
  topicsCovered: Entry[];
  topicsPending: Entry[];
  mine: CommitmentReport;
  theirs: CommitmentReport;
  objectives: Objective[];
  skills: Skill[];
  plan?: DevelopmentPlan;
  meetings: Meeting[];
  workload: Record<Workload, number>;
  onboarding?: { arrivalDate: DateISO; percent: number; completed: boolean; trialEndDate: DateISO };
}

export interface ReviewSource {
  entries: Entry[];
  meetings: Meeting[];
  objectives: Objective[];
  skills: Skill[];
  plans: DevelopmentPlan[];
  onboardings: Onboarding[];
}

const byDate = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt);

/** Un objectif concerne la période si sa plage de dates la recoupe (ou, sans dates, s'il a été créé dedans). */
export function objectiveInPeriod(o: Objective, p: Period): boolean {
  if (!o.startDate && !o.dueDate) return inPeriod(o.createdAt, p);
  const start = o.startDate ?? o.dueDate!;
  const end = o.dueDate ?? o.startDate!;
  return start <= p.end && end >= p.start;
}

export function compileReview(c: Collaborator, src: ReviewSource, p: Period, today: DateISO): CollaboratorReview {
  const mineEntries = src.entries.filter((e) => e.collaboratorId === c.id);
  const created = mineEntries.filter((e) => inPeriod(e.createdAt, p)).sort(byDate);
  const meetings = src.meetings.filter((m) => m.collaboratorId === c.id && m.status === 'done' && inPeriod(m.date, p)).sort((a, b) => a.date.localeCompare(b.date));
  const workload: Record<Workload, number> = { ok: 0, tense: 0, overloaded: 0 };
  for (const m of meetings) if (m.workload) workload[m.workload]++;
  const ob = src.onboardings.filter((o) => o.collaboratorId === c.id && (inPeriod(o.arrivalDate, p) || inPeriod(o.completedAt, p)))[0];

  return {
    collaborator: c,
    period: p,
    successes: created.filter((e) => e.type === 'success' && e.status !== 'dropped'),
    alerts: created.filter((e) => e.type === 'alert'),
    topicsCovered: mineEntries.filter((e) => e.type === 'topic' && e.status === 'done' && inPeriod(e.resolvedAt, p)).sort(byDate),
    topicsPending: mineEntries.filter((e) => e.type === 'topic' && isPending(e) && e.createdAt.slice(0, 10) <= p.end).sort(byDate),
    mine: commitmentReport(mineEntries, 'myCommitment', p, today),
    theirs: commitmentReport(mineEntries, 'theirCommitment', p, today),
    objectives: src.objectives.filter((o) => o.collaboratorId === c.id && objectiveInPeriod(o, p)).sort((a, b) => a.category.localeCompare(b.category)),
    skills: src.skills.filter((s) => s.collaboratorId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    plan: src.plans.find((x) => x.collaboratorId === c.id),
    meetings,
    workload,
    ...(ob ? { onboarding: { arrivalDate: ob.arrivalDate, percent: onboardingProgress(ob, today).percent, completed: !!ob.completedAt, trialEndDate: ob.trialEndDate } } : {}),
  };
}

// --- Année de l'équipe ---------------------------------------------------------

export interface MemberYear {
  collaborator: Collaborator;
  meetingsDone: number;
  meetingsExpected: number;
  successes: number;
  objectivesAchieved: number;
  objectivesTotal: number;
  skillsAtTarget: number;
  skillsWithTarget: number;
  trainingsDone: string[];
  onboarded: boolean;
}

export interface TeamYear {
  period: Period;
  members: MemberYear[];
  arrivals: Collaborator[];
  departures: Collaborator[];
  onboardingsCompleted: number;
  onboardingsInProgress: number;
  teamSuccesses: Entry[];
  individualSuccesses: Entry[];
  meetingsDone: number;
  meetingsExpected: number;
  mine: CommitmentReport;
  workload: Record<Workload, number>;
}

/** Nombre de points attendus selon le rythme, sur la part de la période où le collaborateur était là. */
export function expectedMeetings(c: Collaborator, p: Period, today: DateISO): number {
  const from = [p.start, c.arrivalDate ?? p.start, c.createdAt.slice(0, 10)].sort().at(-1)!;
  const to = [p.end, today, c.archivedAt?.slice(0, 10) ?? p.end].sort()[0];
  if (to < from) return 0;
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  return Math.max(0, Math.floor(days / c.cadenceDays));
}

export function compileTeamYear(collaborators: Collaborator[], src: ReviewSource, p: Period, today: DateISO): TeamYear {
  const present = collaborators.filter(
    (c) => (c.arrivalDate ?? c.createdAt.slice(0, 10)) <= p.end && (!c.archivedAt || c.archivedAt.slice(0, 10) >= p.start),
  );
  const members: MemberYear[] = present.map((c) => {
    const r = compileReview(c, src, p, today);
    const withTarget = r.skills.filter((s) => s.target > 0);
    return {
      collaborator: c,
      meetingsDone: r.meetings.length,
      meetingsExpected: expectedMeetings(c, p, today),
      successes: r.successes.length,
      objectivesAchieved: r.objectives.filter((o) => o.status === 'achieved').length,
      objectivesTotal: r.objectives.length,
      skillsAtTarget: withTarget.filter((s) => s.current >= s.target).length,
      skillsWithTarget: withTarget.length,
      trainingsDone: (r.plan?.trainings ?? []).filter((t) => t.status === 'done' && (!t.date || inPeriod(t.date, p))).map((t) => t.label),
      onboarded: !!r.onboarding?.completed,
    };
  });
  const allMine = src.entries.filter((e) => e.collaboratorId === TEAM_ID || present.some((c) => c.id === e.collaboratorId));
  const workload: Record<Workload, number> = { ok: 0, tense: 0, overloaded: 0 };
  for (const m of src.meetings) if (m.status === 'done' && m.workload && inPeriod(m.date, p) && present.some((c) => c.id === m.collaboratorId)) workload[m.workload]++;
  const obs = src.onboardings.filter((o) => present.some((c) => c.id === o.collaboratorId) && (inPeriod(o.arrivalDate, p) || inPeriod(o.completedAt, p)));

  return {
    period: p,
    members: members.sort((a, b) => a.collaborator.firstName.localeCompare(b.collaborator.firstName, 'fr')),
    arrivals: present.filter((c) => inPeriod(c.arrivalDate, p)),
    departures: collaborators.filter((c) => inPeriod(c.archivedAt, p)),
    onboardingsCompleted: obs.filter((o) => inPeriod(o.completedAt, p)).length,
    onboardingsInProgress: obs.filter((o) => !o.completedAt).length,
    teamSuccesses: src.entries.filter((e) => e.collaboratorId === TEAM_ID && e.type === 'success' && inPeriod(e.createdAt, p)).sort(byDate),
    individualSuccesses: allMine.filter((e) => e.collaboratorId !== TEAM_ID && e.type === 'success' && inPeriod(e.createdAt, p)).sort(byDate),
    meetingsDone: members.reduce((s, m) => s + m.meetingsDone, 0),
    meetingsExpected: members.reduce((s, m) => s + m.meetingsExpected, 0),
    mine: commitmentReport(allMine, 'myCommitment', p, today),
    workload,
  };
}
