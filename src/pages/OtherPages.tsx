import { Placeholder } from './Placeholder';

export function TodayPage() {
  return (
    <Placeholder title="Aujourd'hui" phase="Phase 1">
      Tout ce qui arrive à échéance ou qui est en retard, tous collaborateurs confondus : tes promesses,
      les leurs, les points à planifier.
    </Placeholder>
  );
}

export function MeetingsPage() {
  return (
    <Placeholder title="Points" phase="Phase 2">
      Préparer un point (sujets, promesses, réussites, alertes, objectifs), le débriefer en 30 secondes,
      et exporter tes prochains points vers le calendrier de l'iPhone.
    </Placeholder>
  );
}

export function ReviewsPage() {
  return (
    <Placeholder title="Bilans" phase="Phase 4">
      Bilan d'entretien annuel par collaborateur (au format de ton formulaire d'entretien),
      texte « Préparer pour Claude », export PDF et vue « année de mon équipe ».
    </Placeholder>
  );
}
