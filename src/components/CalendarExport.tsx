import { useState } from 'react';
import { useTeam } from '../db/hooks';
import { calendarEvents, DEFAULT_CALENDAR_OPTIONS, type CalendarOptions } from '../domain/calendarExport';
import { buildIcs } from '../domain/ics';
import { todayISO } from '../domain/dates';
import { makeFile, shareOrDownload } from '../lib/share';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Export des points et échéances vers le calendrier de l'iPhone (fichier .ics). */
export function CalendarExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const team = useTeam();
  const [opt, setOpt] = useState<CalendarOptions>(DEFAULT_CALENDAR_OPTIONS);
  const [done, setDone] = useState(false);
  const events = team ? calendarEvents(team.active, team.entries, team.byId, todayISO(), opt) : [];

  async function share() {
    // Fichier construit de façon synchrone : Safari exige un tap juste avant le partage.
    const file = makeFile(buildIcs(events), `carnet-equipe-${todayISO()}.ics`, 'text/calendar');
    const r = await shareOrDownload(file, "Calendrier Carnet d'équipe");
    if (r !== 'cancelled') setDone(true);
  }

  const toggle = (k: keyof Omit<CalendarOptions, 'horizonDays'>) => setOpt((o) => ({ ...o, [k]: !o[k] }));
  const Option = ({ k, label }: { k: keyof Omit<CalendarOptions, 'horizonDays'>; label: string }) => (
    <label className="flex items-center justify-between min-h-[48px] border-b border-line last:border-0">
      <span className="text-[16px]">{label}</span>
      <input type="checkbox" checked={opt[k]} onChange={() => toggle(k)} className="w-6 h-6 accent-[rgb(var(--accent))]" />
    </label>
  );

  return (
    <Sheet open={open} onClose={() => { setDone(false); onClose(); }} title="Exporter vers le calendrier">
      <div className="flex flex-col gap-4">
        <div className="card px-4">
          <Option k="meetings" label="Prochains points (rappel la veille à 17 h)" />
          <Option k="myCommitments" label="Échéances de mes engagements" />
          <Option k="theirCommitments" label="Échéances de leurs engagements" />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-muted">Horizon</span>
          <select value={opt.horizonDays} onChange={(e) => setOpt((o) => ({ ...o, horizonDays: Number(e.target.value) }))} className="min-h-[44px] rounded-xl bg-surface-2 px-3">
            <option value={30}>1 mois</option>
            <option value={90}>3 mois</option>
            <option value={180}>6 mois</option>
          </select>
        </label>
        <Button onClick={share} disabled={!events.length}>
          <Icon name="share" size={20} /> Exporter {events.length} événement{events.length > 1 ? 's' : ''}
        </Button>
        {done && <p role="status" className="text-ok font-medium text-center">Fichier prêt : ouvre-le pour l'ajouter au calendrier.</p>}
        <details className="text-[14px] leading-snug">
          <summary className="min-h-[44px] flex items-center font-semibold text-accent">Comment l'ajouter sur iPhone ?</summary>
          <ol className="list-decimal pl-5 flex flex-col gap-1.5">
            <li>Dans le menu de partage, choisis <strong>Calendrier</strong> s'il apparaît ; sinon <strong>Enregistrer dans Fichiers</strong>.</li>
            <li>Dans Fichiers, touche le fichier <strong>.ics</strong> puis <strong>Ajouter tout</strong>, et choisis ton calendrier.</li>
            <li>Les dates bougent ? Exporte à nouveau après tes points : chaque événement garde le même identifiant.</li>
          </ol>
          <p className="mt-2 text-muted">Les points en retard sont placés à aujourd'hui. Le fichier contient les prénoms et l'intitulé des engagements : il ira dans ton calendrier (iCloud si activé).</p>
        </details>
      </div>
    </Sheet>
  );
}
