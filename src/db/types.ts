/**
 * Schéma de données du Carnet d'équipe.
 *
 * Règles communes :
 * - chaque enregistrement a un `id` (UUID) et des dates `createdAt` / `updatedAt` (ISO 8601) ;
 *   `updatedAt` sert à la fusion lors d'un import (la version la plus récente gagne) ;
 * - les dates « calendrier » (échéances, arrivée…) sont des chaînes `AAAA-MM-JJ` (type `DateISO`),
 *   sans heure ni fuseau, pour éviter tout décalage d'un jour ;
 * - rien n'est calculé et stocké s'il peut être déduit (retards, prochain point suggéré…).
 *
 * Toute modification de ce fichier doit s'accompagner d'une nouvelle version dans
 * `db.ts` et d'une migration dans `migrations.ts`.
 */

/** Date calendrier au format AAAA-MM-JJ. */
export type DateISO = string;
/** Horodatage ISO 8601 complet. */
export type Timestamp = string;

export interface BaseRecord {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Identifiant spécial pour une entrée qui concerne toute l'équipe. */
export const TEAM_ID = 'team';

export interface Collaborator extends BaseRecord {
  firstName: string;
  lastName: string;
  role: string;
  /** Site (ex. Metz, Strasbourg) — liste modifiable dans les réglages. */
  site: string;
  /** Activité (ex. Bruit, VLEP & Co) — liste modifiable dans les réglages. */
  activity: string;
  arrivalDate?: DateISO;
  /** Rythme des points en jours (30 = mensuel). */
  cadenceDays: number;
  /** Clé de couleur dans la palette (voir ui/palette.ts). */
  color: string;
  /** Date du prochain point validée ou modifiée par le manager (sinon : suggestion calculée). */
  nextMeetingDate?: DateISO;
  archivedAt?: Timestamp;
}

export type EntryType = 'topic' | 'myCommitment' | 'theirCommitment' | 'success' | 'alert';
export type EntryStatus = 'open' | 'done' | 'postponed' | 'dropped';

export interface Entry extends BaseRecord {
  /** Id du collaborateur, ou TEAM_ID pour une entrée d'équipe. */
  collaboratorId: string;
  type: EntryType;
  text: string;
  dueDate?: DateISO;
  status: EntryStatus;
  resolvedAt?: Timestamp;
  /** Point au cours duquel l'entrée a été traitée. */
  meetingId?: string;
  /** Nombre de reports successifs (affiché en préparation). */
  postponeCount: number;
}

export type MeetingKind = 'regular' | 'onboarding' | 'annual';
export type Workload = 'ok' | 'tense' | 'overloaded';

export interface Meeting extends BaseRecord {
  collaboratorId: string;
  kind: MeetingKind;
  /** Libellé facultatif (ex. « Point S+4 »). */
  label?: string;
  date: DateISO;
  status: 'planned' | 'done';
  decisions: string;
  note: string;
  /** Ressenti de charge de travail, saisi en un tap au débrief. */
  workload?: Workload;
  coveredEntryIds: string[];
  postponedEntryIds: string[];
}

export type ObjectiveCategory = 'securite' | 'qualite' | 'metier' | 'production' | 'autre';
export type ObjectiveStatus = 'notStarted' | 'inProgress' | 'achieved' | 'notAchieved';
/** Échelle d'appréciation à 4 niveaux (1 = ne répond pas … 4 = dépasse). */
export type Rating = 1 | 2 | 3 | 4;

export interface FollowUpNote {
  date: DateISO;
  text: string;
}

export interface Objective extends BaseRecord {
  collaboratorId: string;
  title: string;
  description: string;
  category: ObjectiveCategory;
  scope: 'individual' | 'collective';
  startDate?: DateISO;
  dueDate?: DateISO;
  status: ObjectiveStatus;
  /** Avancement 0–100. */
  progress: number;
  /** Pondération en % (facultatif). */
  weight?: number;
  rating?: Rating;
  notes: FollowUpNote[];
}

export interface Skill extends BaseRecord {
  collaboratorId: string;
  name: string;
  /** Niveaux 0–4 (0 = non évalué). */
  current: number;
  target: number;
}

export interface ActionStep {
  id: string;
  label: string;
  dueDate?: DateISO;
  done: boolean;
}

export interface Training {
  id: string;
  label: string;
  status: 'wished' | 'planned' | 'done';
  date?: DateISO;
}

/** Évolution professionnelle : un enregistrement par collaborateur. */
export interface DevelopmentPlan extends BaseRecord {
  collaboratorId: string;
  wishes: string;
  mobility: string;
  trainings: Training[];
  actionPlan: ActionStep[];
}

export interface OnboardingTemplateStep {
  id: string;
  /** Phase affichée (ex. « J-20 · Préparation »). */
  phase: string;
  label: string;
  /** Décalage en jours par rapport à la date d'arrivée (négatif = avant). */
  offsetDays: number;
  notes?: string;
  /** Crée automatiquement un point de suivi à cette échéance. */
  createsMeeting?: boolean;
}

export interface OnboardingTemplate extends BaseRecord {
  name: string;
  isDefault: boolean;
  trialPeriodDays: number;
  steps: OnboardingTemplateStep[];
}

export interface OnboardingTask {
  id: string;
  phase: string;
  label: string;
  dueDate: DateISO;
  done: boolean;
  doneAt?: Timestamp;
  note?: string;
}

export interface Onboarding extends BaseRecord {
  collaboratorId: string;
  templateId?: string;
  arrivalDate: DateISO;
  trialEndDate: DateISO;
  tasks: OnboardingTask[];
  completedAt?: Timestamp;
}

export interface ObjectiveTemplate extends BaseRecord {
  title: string;
  description: string;
  category: ObjectiveCategory;
  scope: 'individual' | 'collective';
}

/** Réglage clé/valeur (dernière sauvegarde, listes de sites, préférences…). */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: Timestamp;
}

/** Contenu complet de la base, tel qu'exporté. */
export interface Snapshot {
  collaborators: Collaborator[];
  entries: Entry[];
  meetings: Meeting[];
  objectives: Objective[];
  skills: Skill[];
  developmentPlans: DevelopmentPlan[];
  onboardingTemplates: OnboardingTemplate[];
  onboardings: Onboarding[];
  objectiveTemplates: ObjectiveTemplate[];
  settings: Setting[];
}

export const TABLE_NAMES = [
  'collaborators',
  'entries',
  'meetings',
  'objectives',
  'skills',
  'developmentPlans',
  'onboardingTemplates',
  'onboardings',
  'objectiveTemplates',
  'settings',
] as const satisfies readonly (keyof Snapshot)[];

export type TableName = (typeof TABLE_NAMES)[number];

export function emptySnapshot(): Snapshot {
  return {
    collaborators: [],
    entries: [],
    meetings: [],
    objectives: [],
    skills: [],
    developmentPlans: [],
    onboardingTemplates: [],
    onboardings: [],
    objectiveTemplates: [],
    settings: [],
  };
}
