import { useCallback, useState } from 'react';
import { useCollaborator } from '../db/hooks';
import { buildPrep } from '../domain/meetingPrep';
import { loadChecks, saveChecks } from '../lib/prepChecks';

/** Données de préparation d'un point + cases cochées (persistées sur l'appareil). */
export function usePrep(id: string | undefined) {
  const data = useCollaborator(id);
  const [checked, setChecked] = useState<string[]>(() => (id ? loadChecks(id) : []));
  const toggle = useCallback(
    (entryId: string) => {
      if (!id) return;
      setChecked((cur) => {
        const next = cur.includes(entryId) ? cur.filter((x) => x !== entryId) : [...cur, entryId];
        saveChecks(id, next);
        return next;
      });
    },
    [id],
  );
  const prep = data ? buildPrep(data.summary.collaborator, data.entries, data.meetings, data.objectives) : undefined;
  return { data, prep, checked, toggle };
}
