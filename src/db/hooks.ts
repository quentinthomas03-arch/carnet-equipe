/**
 * Lectures réactives : les écrans se mettent à jour dès que la base change.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { summarize, sortByPriority, type CollaboratorSummary } from '../domain/cadence';
import { todayISO } from '../domain/dates';
import type { Collaborator, Entry, Meeting, Onboarding } from './types';

export interface TeamData {
  active: CollaboratorSummary[];
  archived: Collaborator[];
  entries: Entry[];
  meetings: Meeting[];
  /** Onboardings en cours, par collaborateur. */
  onboardings: Map<string, Onboarding>;
  byId: Map<string, Collaborator>;
}

export function useTeam(): TeamData | undefined {
  return useLiveQuery(async () => {
    const [collaborators, entries, meetings, onboardings] = await Promise.all([
      db.collaborators.toArray(),
      db.entries.toArray(),
      db.meetings.toArray(),
      db.onboardings.filter((o) => !o.completedAt).toArray(),
    ]);
    const today = todayISO();
    const active = sortByPriority(collaborators.filter((c) => !c.archivedAt).map((c) => summarize(c, entries, meetings, today)));
    const archived = collaborators.filter((c) => c.archivedAt).sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'));
    return {
      active, archived, entries, meetings,
      onboardings: new Map(onboardings.map((o) => [o.collaboratorId, o])),
      byId: new Map(collaborators.map((c) => [c.id, c])),
    };
  }, []);
}

export function useCollaborator(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const c = await db.collaborators.get(id);
    if (!c) return null;
    const [entries, meetings, objectives, skills, plan, onboardings] = await Promise.all([
      db.entries.where('collaboratorId').equals(id).toArray(),
      db.meetings.where('collaboratorId').equals(id).toArray(),
      db.objectives.where('collaboratorId').equals(id).toArray(),
      db.skills.where('collaboratorId').equals(id).toArray(),
      db.developmentPlans.where('collaboratorId').equals(id).first(),
      db.onboardings.where('collaboratorId').equals(id).toArray(),
    ]);
    const onboarding = onboardings.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { summary: summarize(c, entries, meetings, todayISO()), entries, meetings, objectives, skills, plan, onboarding };
  }, [id]);
}
