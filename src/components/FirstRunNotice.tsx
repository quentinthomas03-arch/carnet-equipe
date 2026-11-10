import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SETTING, setSetting } from '../db/settings';
import { isStandalone } from '../lib/storage';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Texte du rappel « données sensibles », aussi affiché dans les réglages. */
export function SensitiveDataText() {
  return (
    <ul className="flex flex-col gap-2 text-[15px] leading-snug list-disc pl-5">
      <li>Notes <strong>courtes et factuelles</strong> : des faits observables, pas des jugements.</li>
      <li><strong>Aucune donnée de santé</strong>, ni information sur la vie privée, familiale ou syndicale.</li>
      <li>Pas d'informations RH sensibles (salaire, sanctions, arrêts…) : ce n'est pas un dossier RH.</li>
      <li>Vérifie que cet usage respecte la politique interne de ton employeur.</li>
      <li>Les données restent <strong>uniquement sur ce téléphone</strong> : aucun serveur, aucun envoi.</li>
    </ul>
  );
}

/** Écran d'accueil de la première ouverture : rappel données sensibles + conseil d'installation. */
export function FirstRunNotice() {
  // Objet enveloppe : `undefined` = chargement en cours, `{ ack: undefined }` = jamais accepté.
  const state = useLiveQuery(async () => ({ ack: await db.settings.get(SETTING.sensitiveNoticeAck) }), []);
  if (!state || state.ack) return null;
  const standalone = isStandalone();

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="first-run-title" className="fixed inset-0 z-50 bg-bg overflow-y-auto">
      <div className="pt-safe px-6 pb-10 max-w-lg mx-auto flex flex-col gap-6">
        <div className="mt-8 w-14 h-14 rounded-2xl bg-accent text-accent-ink flex items-center justify-center">
          <Icon name="shield" size={30} />
        </div>
        <h1 id="first-run-title" className="text-[28px] font-bold leading-tight">Bienvenue dans ton carnet d'équipe</h1>
        <section className="card p-5 flex flex-col gap-3">
          <h2 className="section-title">Avant de commencer</h2>
          <SensitiveDataText />
        </section>
        {!standalone && (
          <section className="card p-5 flex flex-col gap-3">
            <h2 className="section-title">Installe l'appli d'abord</h2>
            <p className="text-[15px] leading-snug">
              Tu es dans Safari. Pour protéger tes données, ajoute l'appli à l'écran d'accueil
              (bouton <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>), puis utilise
              uniquement l'icône : les données de Safari et celles de l'appli installée sont <strong>séparées</strong>.
            </p>
          </section>
        )}
        <Button onClick={() => setSetting(SETTING.sensitiveNoticeAck, new Date().toISOString())} className="w-full">
          J'ai compris
        </Button>
      </div>
    </div>
  );
}
