/**
 * Recherche globale, insensible aux accents et à la casse.
 */
import type { Collaborator, Entry, Meeting, Objective } from '../db/types';

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface SearchResults {
  collaborators: Collaborator[];
  entries: Entry[];
  meetings: Meeting[];
  objectives: Objective[];
  total: number;
}

/** Tous les mots de la requête doivent apparaître (dans n'importe quel ordre). */
export function matches(text: string, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const t = normalize(text);
  return words.every((w) => t.includes(w));
}

export function search(
  query: string,
  data: { collaborators: Collaborator[]; entries: Entry[]; meetings: Meeting[]; objectives: Objective[] },
  limit = 30,
): SearchResults {
  const collaborators = data.collaborators.filter((c) => matches(`${c.firstName} ${c.lastName} ${c.role} ${c.site} ${c.activity}`, query));
  const entries = data.entries.filter((e) => matches(e.text, query)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  const meetings = data.meetings.filter((m) => m.status === 'done' && matches(`${m.decisions} ${m.note} ${m.label ?? ''}`, query)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  const objectives = data.objectives.filter((o) => matches(`${o.title} ${o.description}`, query)).slice(0, limit);
  return { collaborators, entries, meetings, objectives, total: collaborators.length + entries.length + meetings.length + objectives.length };
}
