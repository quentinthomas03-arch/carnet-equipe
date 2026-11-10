import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { ExportPanel } from './ExportPanel';
import { useBackupState } from './useBackupState';

/** Bannière visible si la dernière sauvegarde date de plus de 30 jours. */
export function BackupBanner() {
  const state = useBackupState();
  const [open, setOpen] = useState(false);
  if (!state?.needsReminder && !open) return null;

  const label = state?.lastBackupAt
    ? `Dernière sauvegarde il y a ${state.ageDays} jours.`
    : 'Aucune sauvegarde pour le moment.';

  return (
    <>
      <div className="mx-4 mb-3 rounded-2xl bg-accent-soft px-4 py-3 flex items-center gap-3">
        <Icon name="download" size={22} className="text-accent-soft-ink shrink-0" />
        <p className="flex-1 text-[14px] leading-snug text-accent-soft-ink">
          <strong className="font-semibold">{label}</strong> Exporte en 2 taps.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="min-h-[40px] px-3 rounded-xl bg-accent text-accent-ink font-semibold text-[14px]">
          Exporter
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sauvegarder mes données">
        {open && <ExportPanel />}
      </Sheet>
    </>
  );
}
