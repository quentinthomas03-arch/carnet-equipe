/**
 * Sélection des événements à exporter vers le calendrier.
 */
import { TEAM_ID, type Collaborator, type DateISO, type Entry } from '../db/types';
import type { CollaboratorSummary } from './cadence';
import { addDaysISO } from './dates';
import { isPending } from './entries';
import type { IcsEvent } from './ics';

export interface CalendarOptions {
  meetings: boolean;
  myCommitments: boolean;
  theirCommitments: boolean;
  /** Horizon en jours (les échéances au-delà sont ignorées ; les retards sont exportés à aujourd'hui). */
  horizonDays: number;
}

export const DEFAULT_CALENDAR_OPTIONS: CalendarOptions = { meetings: true, myCommitments: true, theirCommitments: false, horizonDays: 90 };

export function calendarEvents(
  summaries: CollaboratorSummary[],
  entries: Entry[],
  byId: Map<string, Collaborator>,
  today: DateISO,
  opt: CalendarOptions,
): IcsEvent[] {
  const limit = addDaysISO(today, opt.horizonDays);
  const events: IcsEvent[] = [];

  if (opt.meetings) {
    for (const s of summaries) {
      const c = s.collaborator;
      const date = s.schedule.next < today ? today : s.schedule.next;
      if (date > limit) continue;
      events.push({
        uid: `point-${c.id}@carnet-equipe`,
        date,
        title: `Point avec ${c.firstName} ${c.lastName}`.trim(),
        description: `${s.schedule.suggested ? 'Date suggérée' : 'Date validée'}. La veille : ouvrir Carnet › Points › Préparer.`,
        alarmDayBefore: true,
      });
    }
  }

  const wanted = (e: Entry) =>
    isPending(e) && !!e.dueDate &&
    ((opt.myCommitments && e.type === 'myCommitment') || (opt.theirCommitments && e.type === 'theirCommitment'));

  for (const e of entries.filter(wanted)) {
    if (e.collaboratorId !== TEAM_ID && byId.get(e.collaboratorId)?.archivedAt) continue;
    const date = e.dueDate! < today ? today : e.dueDate!;
    if (date > limit) continue;
    const who = e.collaboratorId === TEAM_ID ? "l'équipe" : byId.get(e.collaboratorId)?.firstName ?? '';
    events.push({
      uid: `engagement-${e.id}@carnet-equipe`,
      date,
      title: e.type === 'myCommitment' ? `Mon engagement (${who}) : ${e.text}` : `${who} : ${e.text}`,
      description: e.dueDate! < today ? `En retard (échéance initiale ${e.dueDate}).` : undefined,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
