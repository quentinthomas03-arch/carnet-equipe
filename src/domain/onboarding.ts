/**
 * Onboarding des nouveaux arrivants : parcours relatif à la date d'arrivée.
 *
 * Un modèle (OnboardingTemplate) liste des étapes avec un décalage en jours par rapport à l'arrivée
 * (J-7 = -7, J+30 = 30). Démarrer l'onboarding d'une recrue copie le modèle en tâches datées :
 * modifier ensuite le modèle ne change pas les parcours déjà démarrés, et inversement.
 * Les étapes marquées « point de suivi » créent automatiquement un point planifié.
 */
import type { DateISO, Meeting, Onboarding, OnboardingTask, OnboardingTemplate, OnboardingTemplateStep } from '../db/types';
import { addDaysISO, daysBetween } from './dates';

export const DEFAULT_TEMPLATE_ID = 'tpl-default';

const step = (id: string, phase: string, offsetDays: number, label: string, createsMeeting = false): OnboardingTemplateStep => ({
  id, phase, offsetDays, label, ...(createsMeeting ? { createsMeeting } : {}),
});

/** Modèle générique fourni avec l'appli (remplaçable par le « pack employeur »). */
export function genericTemplate(now = new Date().toISOString()): OnboardingTemplate {
  return {
    id: DEFAULT_TEMPLATE_ID,
    createdAt: now,
    updatedAt: '2000-01-01T00:00:00.000Z', // volontairement ancien : un modèle importé le remplace
    name: 'Parcours générique',
    isDefault: true,
    trialPeriodDays: 90,
    steps: [
      step('g1', 'Avant l’arrivée', -7, 'Préparer le poste, le matériel et les accès'),
      step('g2', 'Avant l’arrivée', -7, 'Annoncer l’arrivée à l’équipe'),
      step('g3', 'Jour 1', 0, 'Accueil, présentation de l’équipe et des locaux'),
      step('g4', 'Jour 1', 0, 'Remise des équipements et consignes de sécurité'),
      step('g5', 'Première semaine', 2, 'Désigner un tuteur et présenter le planning de formation'),
      step('g6', 'Première semaine', 7, 'Point de fin de première semaine', true),
      step('g7', 'Premier mois', 30, 'Point à 1 mois : formations, tutorat, objectifs', true),
      step('g8', 'Fin de période d’essai', 60, 'Point à 2 mois : bilan avant fin de période d’essai', true),
      step('g9', 'Fin de période d’essai', 85, 'Décision de fin de période d’essai'),
    ],
  };
}

export const newTaskId = () => crypto.randomUUID();

/** Copie un modèle en parcours daté pour une recrue, avec les points de suivi à planifier. */
export function instantiateOnboarding(
  template: OnboardingTemplate,
  collaboratorId: string,
  arrivalDate: DateISO,
  ids: { onboarding: string; newId: () => string },
  now = new Date().toISOString(),
): { onboarding: Onboarding; meetings: Meeting[] } {
  const steps = [...template.steps].sort((a, b) => a.offsetDays - b.offsetDays);
  const tasks: OnboardingTask[] = steps.map((s) => ({
    id: ids.newId(),
    phase: s.phase,
    label: s.label,
    dueDate: addDaysISO(arrivalDate, s.offsetDays),
    done: false,
    ...(s.notes ? { note: s.notes } : {}),
  }));
  const meetings: Meeting[] = steps
    .filter((s) => s.createsMeeting)
    .map((s) => ({
      id: ids.newId(),
      createdAt: now,
      updatedAt: now,
      collaboratorId,
      kind: 'onboarding',
      label: s.label,
      date: addDaysISO(arrivalDate, s.offsetDays),
      status: 'planned',
      decisions: '',
      note: '',
      coveredEntryIds: [],
      postponedEntryIds: [],
    }));
  return {
    onboarding: {
      id: ids.onboarding,
      createdAt: now,
      updatedAt: now,
      collaboratorId,
      templateId: template.id,
      arrivalDate,
      trialEndDate: addDaysISO(arrivalDate, template.trialPeriodDays),
      tasks,
    },
    meetings,
  };
}

export interface OnboardingProgress {
  done: number;
  total: number;
  percent: number;
  late: OnboardingTask[];
  /** Prochaine tâche non faite (par échéance). */
  next?: OnboardingTask;
  /** « Semaine 2 », « Mois 2 », ou « Arrivée dans 5 j ». */
  stage: string;
  trialDaysLeft: number;
}

export function onboardingProgress(o: Onboarding, today: DateISO): OnboardingProgress {
  const total = o.tasks.length;
  const done = o.tasks.filter((t) => t.done).length;
  const pending = o.tasks.filter((t) => !t.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const sinceArrival = daysBetween(o.arrivalDate, today);
  const stage =
    sinceArrival < 0 ? `Arrivée dans ${-sinceArrival} j` : sinceArrival < 56 ? `Semaine ${Math.floor(sinceArrival / 7) + 1}` : `Mois ${Math.floor(sinceArrival / 30) + 1}`;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 100,
    late: pending.filter((t) => t.dueDate < today),
    next: pending[0],
    stage,
    trialDaysLeft: daysBetween(today, o.trialEndDate),
  };
}

/** Regroupe les tâches par phase, dans l'ordre chronologique de la première échéance. */
export function groupByPhase(tasks: OnboardingTask[]): { phase: string; tasks: OnboardingTask[] }[] {
  const groups = new Map<string, OnboardingTask[]>();
  for (const t of [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) groups.set(t.phase, [...(groups.get(t.phase) ?? []), t]);
  return [...groups].map(([phase, list]) => ({ phase, tasks: list }));
}

/** Choisit le modèle par défaut : marqué par défaut et modifié le plus récemment. */
export function defaultTemplate(templates: OnboardingTemplate[]): OnboardingTemplate | undefined {
  return [...templates].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Une recrue est « en cours d'onboarding » tant que le parcours n'est pas clôturé. */
export const isActiveOnboarding = (o: Onboarding) => !o.completedAt;

/** Libellé d'un décalage : J-7, J0, J+30. */
export function offsetLabel(days: number): string {
  return days === 0 ? 'J0' : days > 0 ? `J+${days}` : `J${days}`;
}
