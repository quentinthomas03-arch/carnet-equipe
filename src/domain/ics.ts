/**
 * Export calendrier au format iCalendar (RFC 5545), lisible par Calendrier sur iPhone.
 *
 * Événements « journée entière » :
 * - prochain point de chaque collaborateur, avec une alarme la veille à 17 h (« préparer le point ») ;
 * - échéances des engagements ouverts (les miens, et facultativement les leurs).
 * Les UID sont stables : réimporter le fichier met à jour les mêmes événements au lieu d'en créer d'autres
 * (selon le calendrier choisi ; iCloud le gère).
 */
import type { DateISO } from '../db/types';
import { addDaysISO } from './dates';

export interface IcsEvent {
  uid: string;
  date: DateISO;
  title: string;
  description?: string;
  /** Alarme la veille à 17 h. */
  alarmDayBefore?: boolean;
}

/** Échappe un texte iCalendar (antislash, point-virgule, virgule, retours à la ligne). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Plie une ligne à 75 octets (UTF-8) comme l'exige la norme, sans couper un caractère. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // les lignes de continuation commencent par un espace
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const compact = (d: DateISO) => d.replace(/-/g, '');

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Carnet d equipe//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', "X-WR-CALNAME:Carnet d'équipe"];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDaysISO(e.date, 1))}`,
      `SUMMARY:${escapeText(e.title)}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.alarmDayBefore) {
      // Événement journée entière à 00:00 : -PT7H = la veille à 17:00.
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`Préparer : ${e.title}`)}`, 'TRIGGER:-PT7H', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
