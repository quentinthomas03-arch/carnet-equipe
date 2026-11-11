/**
 * Campagne d'entretiens annuels : avancement par collaborateur, pour une année donnée.
 * Stocké dans les réglages (clé « reviewCampaign ») : { "2026": { "<id>": "done", … } }.
 */
export type CampaignStatus = 'todo' | 'ready' | 'done' | 'signed';
export type Campaign = Record<string, Record<string, CampaignStatus>>;

export const CAMPAIGN_LABELS: Record<CampaignStatus, string> = {
  todo: 'À préparer',
  ready: 'Bilan prêt',
  done: 'Entretien fait',
  signed: 'Signé',
};

export const CAMPAIGN_ORDER: CampaignStatus[] = ['todo', 'ready', 'done', 'signed'];

export function campaignStatus(c: Campaign | undefined, year: string, collaboratorId: string): CampaignStatus {
  return c?.[year]?.[collaboratorId] ?? 'todo';
}

export function setCampaignStatus(c: Campaign | undefined, year: string, collaboratorId: string, status: CampaignStatus): Campaign {
  return { ...(c ?? {}), [year]: { ...(c?.[year] ?? {}), [collaboratorId]: status } };
}

/** Entretiens réalisés (faits ou signés) sur le nombre de collaborateurs. */
export function campaignProgress(c: Campaign | undefined, year: string, ids: string[]): { done: number; total: number } {
  return { done: ids.filter((id) => ['done', 'signed'].includes(campaignStatus(c, year, id))).length, total: ids.length };
}
