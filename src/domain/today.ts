/**
 * Écran « Aujourd'hui » : tout ce qui est en retard ou arrive à échéance, tous collaborateurs confondus.
 */
import type { DateISO, Entry } from '../db/types';
import { dueState } from './entries';
import type { CollaboratorSummary } from './cadence';

export interface TodayView {
  late: Entry[];
  today: Entry[];
  week: Entry[];
  /** Collaborateurs dont le point est en retard ou prévu dans les 3 jours. */
  meetings: CollaboratorSummary[];
  /** Nombre affiché sur le badge de l'onglet. */
  badge: number;
}

export function buildToday(entries: Entry[], summaries: CollaboratorSummary[], today: DateISO): TodayView {
  const byDue = (a: Entry, b: Entry) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  const late = entries.filter((e) => dueState(e, today) === 'late').sort(byDue);
  const todayList = entries.filter((e) => dueState(e, today) === 'today');
  const week = entries.filter((e) => dueState(e, today) === 'soon').sort(byDue);
  const meetings = summaries
    .filter((s) => s.schedule.daysUntil <= 3)
    .sort((a, b) => a.schedule.daysUntil - b.schedule.daysUntil);
  const overdueMeetings = meetings.filter((s) => s.schedule.overdue || s.schedule.daysUntil === 0).length;
  return { late, today: todayList, week, meetings, badge: late.length + todayList.length + overdueMeetings };
}
