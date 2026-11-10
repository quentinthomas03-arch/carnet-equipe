/**
 * Objectifs, compétences et évolution — référentiels et calculs simples.
 * Catégories alignées sur le formulaire d'entretien annuel (Sécurité, Qualité, Métier, Production).
 */
import type { DateISO, Objective, ObjectiveCategory, ObjectiveStatus, Rating } from '../db/types';

export const CATEGORY_LABELS: Record<ObjectiveCategory, string> = {
  securite: 'Sécurité',
  qualite: 'Qualité',
  metier: 'Métier',
  production: 'Production',
  autre: 'Autre',
};

export const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  notStarted: 'Non démarré',
  inProgress: 'En cours',
  achieved: 'Atteint',
  notAchieved: 'Non atteint',
};

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Ne répond pas aux attentes',
  2: 'Répond partiellement aux attentes',
  3: 'Répond aux attentes',
  4: 'Dépasse les attentes',
};

/** Niveaux de compétence (0 = non évalué). */
export const SKILL_LEVELS = ['Non évalué', 'Non acquis', 'En cours d’acquisition', 'Acquis', 'Maîtrisé'];

/** Compétences proposées par défaut (remplaçables via les réglages ou le pack employeur). */
export const DEFAULT_SKILL_CATALOG = [
  'Compétences techniques',
  'Relation client',
  'Organisation et priorités',
  'Prise d’initiative',
  'Rigueur et qualité',
  'Esprit d’équipe',
  'Partage de l’information',
  'Sécurité',
];

/** Période par défaut d'un nouvel objectif : l'année civile en cours. */
export function defaultObjectivePeriod(today: DateISO): { startDate: DateISO; dueDate: DateISO } {
  const y = today.slice(0, 4);
  return { startDate: `${y}-01-01`, dueDate: `${y}-12-31` };
}

/** Somme des pondérations des objectifs en cours (le formulaire attend 100 %). */
export function weightTotal(objectives: Objective[]): number | null {
  const weighted = objectives.filter((o) => o.weight !== undefined && o.status !== 'notAchieved' && o.status !== 'achieved');
  return weighted.length ? weighted.reduce((s, o) => s + (o.weight ?? 0), 0) : null;
}

export const isOpenObjective = (o: Objective) => o.status === 'notStarted' || o.status === 'inProgress';
