import { useEffect, useState } from 'react';
import { createExport, markBackupDone } from '../db/backupIO';
import { exportFileName } from '../domain/backup';
import { makeFile, shareOrDownload } from '../lib/share';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Export en 2 taps : le fichier est préparé dès l'ouverture (tap 1),
 * puis partagé au tap 2 (Safari exige un tap juste avant le partage).
 */
export function ExportPanel({ onDone }: { onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'done' | 'cancelled'>('idle');

  useEffect(() => {
    let alive = true;
    createExport()
      .then((exp) => alive && setFile(makeFile(JSON.stringify(exp, null, 2), exportFileName(), 'application/json')))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  async function share() {
    if (!file) return;
    const r = await shareOrDownload(file, "Sauvegarde Carnet d'équipe");
    if (r === 'cancelled') return setStatus('cancelled');
    await markBackupDone();
    setStatus('done');
    onDone?.();
  }

  if (error) return <p className="text-danger">Erreur pendant la préparation : {error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-muted leading-snug">
        Dans le menu de partage, choisis <strong className="text-ink">« Enregistrer dans Fichiers »</strong> puis
        <strong className="text-ink"> iCloud Drive</strong> : tu retrouveras ta sauvegarde même sur un nouveau téléphone.
      </p>
      <Button onClick={share} disabled={!file} className="w-full">
        <Icon name="share" size={20} />
        {file ? 'Enregistrer la sauvegarde' : 'Préparation…'}
      </Button>
      {file && <p className="text-[13px] text-muted text-center">{file.name} · {(file.size / 1024).toFixed(0)} Ko</p>}
      {status === 'done' && (
        <p role="status" className="text-ok font-medium text-center">Sauvegarde effectuée</p>
      )}
      {status === 'cancelled' && (
        <p role="status" className="text-muted text-center">Partage annulé : aucune sauvegarde enregistrée.</p>
      )}
    </div>
  );
}
