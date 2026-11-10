import Dexie, { type Table } from 'dexie';
import type {
  Collaborator,
  DevelopmentPlan,
  Entry,
  Meeting,
  Objective,
  ObjectiveTemplate,
  Onboarding,
  OnboardingTemplate,
  Setting,
  Skill,
} from './types';
import { SCHEMA_VERSION } from './migrations';

/**
 * Base IndexedDB locale (via Dexie).
 *
 * Pour faire évoluer le schéma :
 * 1. incrémenter SCHEMA_VERSION dans migrations.ts ;
 * 2. ajouter ici un bloc `this.version(N).stores({...}).upgrade(tx => ...)` ;
 * 3. ajouter dans migrations.ts la migration équivalente pour les fichiers d'export.
 * Les anciennes versions ne doivent jamais être supprimées : Dexie les rejoue dans l'ordre.
 */
export class CarnetDB extends Dexie {
  collaborators!: Table<Collaborator, string>;
  entries!: Table<Entry, string>;
  meetings!: Table<Meeting, string>;
  objectives!: Table<Objective, string>;
  skills!: Table<Skill, string>;
  developmentPlans!: Table<DevelopmentPlan, string>;
  onboardingTemplates!: Table<OnboardingTemplate, string>;
  onboardings!: Table<Onboarding, string>;
  objectiveTemplates!: Table<ObjectiveTemplate, string>;
  settings!: Table<Setting, string>;

  constructor(name = 'carnet-equipe') {
    super(name);
    // Version 1 — schéma initial. Seuls les champs indexés sont listés.
    this.version(1).stores({
      collaborators: 'id, archivedAt',
      entries: 'id, collaboratorId, type, status, dueDate, [collaboratorId+status]',
      meetings: 'id, collaboratorId, date, status',
      objectives: 'id, collaboratorId, dueDate',
      skills: 'id, collaboratorId',
      developmentPlans: 'id, &collaboratorId',
      onboardingTemplates: 'id',
      onboardings: 'id, collaboratorId',
      objectiveTemplates: 'id',
      settings: 'key',
    });
  }
}

// Garde-fou : la version Dexie la plus haute doit correspondre au schéma des exports.
const DEXIE_VERSION = 1;
if (DEXIE_VERSION !== SCHEMA_VERSION) {
  throw new Error('SCHEMA_VERSION et la version Dexie divergent : ajoute la migration manquante.');
}

export const db = new CarnetDB();
