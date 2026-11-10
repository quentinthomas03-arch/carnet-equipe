import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine } from './ics';
import { calendarEvents, DEFAULT_CALENDAR_OPTIONS } from './calendarExport';
import { summarize } from './cadence';
import { collaborator, entry } from '../test/fixtures';

describe('format iCalendar', () => {
  it('échappe les caractères spéciaux', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\; c\\\\d\\ne');
  });

  it('plie les lignes longues à 75 octets sans couper les accents', () => {
    const line = `SUMMARY:${'é'.repeat(60)}`;
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line);
  });

  it('produit un événement journée entière avec alarme la veille', () => {
    const ics = buildIcs([{ uid: 'u1@x', date: '2026-12-31', title: 'Point avec Camille', alarmDayBefore: true }], new Date('2026-11-10T08:00:00Z'));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('DTSTAMP:20261110T080000Z');
    expect(ics).toContain('TRIGGER:-PT7H');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});

describe('événements exportés', () => {
  const today = '2026-11-10';
  const c = collaborator({ createdAt: '2026-11-01T00:00:00Z' });
  const entries = [
    entry({ id: 'm1', type: 'myCommitment', dueDate: '2026-11-20' }),
    entry({ id: 'm2', type: 'myCommitment', dueDate: '2026-10-01' }),
    entry({ id: 'm3', type: 'myCommitment', dueDate: '2027-06-01' }),
    entry({ id: 'h1', type: 'theirCommitment', dueDate: '2026-11-15' }),
    entry({ id: 'd1', type: 'myCommitment', dueDate: '2026-11-15', status: 'done' }),
  ];
  const s = summarize(c, entries, [], today);
  const byId = new Map([[c.id, c]]);

  it('points + mes engagements par défaut ; retards ramenés à aujourd’hui ; horizon respecté', () => {
    const ev = calendarEvents([s], entries, byId, today, DEFAULT_CALENDAR_OPTIONS);
    expect(ev.map((e) => e.uid)).toEqual(['engagement-m2@carnet-equipe', 'engagement-m1@carnet-equipe', 'point-c1@carnet-equipe']);
    expect(ev[0].date).toBe(today);
    expect(ev.find((e) => e.uid.startsWith('point'))!.date).toBe('2026-12-01');
  });

  it('inclut leurs engagements sur demande', () => {
    const ev = calendarEvents([s], entries, byId, today, { ...DEFAULT_CALENDAR_OPTIONS, meetings: false, myCommitments: false, theirCommitments: true });
    expect(ev.map((e) => e.uid)).toEqual(['engagement-h1@carnet-equipe']);
  });
});
