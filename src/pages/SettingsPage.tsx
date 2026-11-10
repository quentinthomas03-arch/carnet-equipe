import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { checkImport, type ImportCheck } from '../domain/backup';
import { mergeAll, replaceAll } from '../db/backupIO';
import { SCHEMA_VERSION } from '../db/migrations';
import { getStorageStatus, formatBytes, requestPersistence, type StorageStatus } from '../lib/storage';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { ExportPanel } from '../components/ExportPanel';
import { SensitiveDataText } from '../components/FirstRunNotice';
import { useBackupState } from '../components/useBackupState';

const TABLE_LABELS: Record<string, string> = {
  collaborators: 'collaborateurs',
  entries: 'entrées',
  meetings: 'points',
  objectives: 'objectifs',
  onboardings: 'onboardings',
};

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-line last:border-0 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className={`font-medium text-right ${color}`}>{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const backup = useBackupState();
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    getStorageStatus().then(setStorage);
  }, []);

  const lastBackup = backup?.lastBackupAt
    ? `${format(new Date(backup.lastBackupAt), 'd MMMM yyyy', { locale: fr })} (il y a ${backup.ageDays} j)`
    : 'Jamais';

  return (
    <div className="pb-8">
      <header className="pt-safe px-2 flex items-center gap-1 min-h-[56px]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className="w-11 h-11 flex items-center justify-center text-accent">
          <Icon name="back" size={24} strokeWidth={2.2} />
        </button>
        <h1 className="text-[22px] font-bold">Réglages</h1>
      </header>

      <div className="flex flex-col gap-4 px-4 mt-2">
        <section className="card p-5 flex flex-col gap-3" aria-labelledby="s-backup">
          <h2 id="s-backup" className="section-title">Sauvegarde</h2>
          <div>
            <Row label="Dernière sauvegarde" value={lastBackup} tone={backup?.needsReminder ? 'warn' : backup?.lastBackupAt ? 'ok' : undefined} />
          </div>
          <Button onClick={() => setExportOpen(true)} className="w-full">
            <Icon name="download" size={20} /> Exporter toutes mes données
          </Button>
          <ImportSection />
          <p className="text-[13px] text-muted leading-snug">
            Un rappel s'affiche si ta dernière sauvegarde a plus de 30 jours. Le fichier contient tout, y compris
            les notes : range-le dans ton iCloud Drive personnel.
          </p>
        </section>

        <StorageSection storage={storage} onChange={setStorage} />

        <section className="card p-5 flex flex-col gap-3" aria-labelledby="s-sensitive">
          <h2 id="s-sensitive" className="section-title">Données sensibles</h2>
          <SensitiveDataText />
        </section>

        <section className="card p-5" aria-labelledby="s-about">
          <h2 id="s-about" className="section-title mb-1">À propos</h2>
          <Row label="Version" value={__APP_VERSION__} />
          <Row label="Schéma de données" value={`v${SCHEMA_VERSION}`} />
          <Row label="Serveur, compte, suivi" value="Aucun" />
        </section>
      </div>

      <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title="Sauvegarder mes données">
        {exportOpen && <ExportPanel />}
      </Sheet>
    </div>
  );
}

function StorageSection({ storage, onChange }: { storage: StorageStatus | null; onChange: (s: StorageStatus) => void }) {
  async function retry() {
    await requestPersistence();
    onChange(await getStorageStatus());
  }
  return (
    <section className="card p-5 flex flex-col gap-3" aria-labelledby="s-storage">
      <h2 id="s-storage" className="section-title">Stockage sur ce téléphone</h2>
      <div>
        <Row
          label="Appli installée (écran d'accueil)"
          value={storage ? (storage.standalone ? 'Oui' : 'Non — ouverte dans Safari') : '…'}
          tone={storage ? (storage.standalone ? 'ok' : 'warn') : undefined}
        />
        <Row
          label="Stockage persistant"
          value={storage ? (storage.persisted === null ? 'Non pris en charge' : storage.persisted ? 'Accordé' : 'Non accordé') : '…'}
          tone={storage?.persisted ? 'ok' : storage ? 'warn' : undefined}
        />
        <Row label="Espace utilisé" value={formatBytes(storage?.usageBytes)} />
      </div>
      {storage && storage.persisted === false && (
        <Button variant="secondary" onClick={retry}>Redemander le stockage persistant</Button>
      )}
      <details className="text-[14px] leading-snug">
        <summary className="min-h-[44px] flex items-center font-semibold text-accent cursor-pointer">Limites de Safari sur iPhone</summary>
        <ul className="list-disc pl-5 flex flex-col gap-2 text-ink">
          <li>Les données de Safari et celles de l'appli installée sont <strong>séparées</strong> : utilise toujours l'icône.</li>
          <li><strong>Supprimer l'icône de l'écran d'accueil efface toutes les données.</strong></li>
          <li>Effacer l'historique et les données de sites dans Réglages › Safari peut aussi les effacer.</li>
          <li>Si le téléphone manque d'espace, iOS peut vider le stockage des sites, même « persistant ».</li>
          <li>Seul l'export régulier vers Fichiers / iCloud Drive te protège vraiment.</li>
        </ul>
      </details>
    </section>
  );
}

function ImportSection() {
  const input = useRef<HTMLInputElement>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setCheck(null);
    setConfirmReplace(false);
    if (input.current) input.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setCheck(await checkImport(await f.text()));
    } catch (err) {
      setError((err as Error).message);
      reset();
    }
  }

  async function apply(mode: 'merge' | 'replace') {
    if (!check) return;
    setBusy(true);
    try {
      if (mode === 'replace') {
        await replaceAll(check.data);
        setResult('Données remplacées par la sauvegarde.');
      } else {
        const r = await mergeAll(check.data);
        setResult(`Fusion terminée : ${r.added} ajouté(s), ${r.updated} mis à jour, ${r.unchanged} inchangé(s).`);
      }
      reset();
    } catch (err) {
      setError(`Échec de l'import, aucune donnée modifiée : ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={input} id="import-file" type="file" accept="application/json,.json" onChange={onFile} className="sr-only" />
      <label htmlFor="import-file" className="min-h-[48px] px-5 rounded-2xl font-semibold text-[16px] inline-flex items-center justify-center gap-2 bg-surface-2 text-ink cursor-pointer">
        <Icon name="upload" size={20} /> Importer une sauvegarde
      </label>

      {error && <p role="alert" className="text-danger text-[14px] leading-snug">{error}</p>}
      {result && <p role="status" className="text-ok text-[14px] font-medium">{result}</p>}

      {check && (
        <div className="rounded-2xl bg-surface-2 p-4 flex flex-col gap-3">
          <p className="text-[15px] font-semibold flex items-center gap-2">
            <Icon name="check" size={18} className="text-ok" /> Fichier vérifié et intact
          </p>
          <p className="text-[14px] text-muted leading-snug">
            Sauvegarde du {format(new Date(check.file.exportedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })} ·{' '}
            {Object.entries(TABLE_LABELS).map(([t, l]) => `${check.counts[t as keyof typeof check.counts]} ${l}`).join(', ')}.
          </p>
          <Button onClick={() => apply('merge')} disabled={busy}>Fusionner avec mes données</Button>
          {!confirmReplace ? (
            <Button variant="danger" onClick={() => setConfirmReplace(true)} disabled={busy}>Remplacer mes données…</Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[14px] text-danger leading-snug font-medium">
                Tout le contenu actuel de l'appli sera effacé et remplacé par cette sauvegarde. Exporte d'abord tes
                données actuelles si tu as un doute.
              </p>
              <Button variant="danger" onClick={() => apply('replace')} disabled={busy}>Oui, tout remplacer</Button>
            </div>
          )}
          <Button variant="ghost" onClick={reset} disabled={busy}>Annuler</Button>
        </div>
      )}
    </div>
  );
}
