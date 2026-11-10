/**
 * Couleurs de repérage des collaborateurs. Texte blanc lisible sur chacune (≥ 4,5:1).
 * `tint` sert aux en-têtes teintés (fiche collaborateur).
 */
export const COLLABORATOR_COLORS = {
  teal: { label: 'Sarcelle', hex: '#0E7C86' },
  violet: { label: 'Violet', hex: '#6D4AFF' },
  orange: { label: 'Orange', hex: '#C2410C' },
  rose: { label: 'Framboise', hex: '#BE185D' },
  blue: { label: 'Bleu', hex: '#2563EB' },
  green: { label: 'Vert', hex: '#15803D' },
  amber: { label: 'Ambre', hex: '#A16207' },
  indigo: { label: 'Indigo', hex: '#4338CA' },
  cyan: { label: 'Cyan', hex: '#0E7490' },
  slate: { label: 'Ardoise', hex: '#475569' },
} as const;

export type ColorKey = keyof typeof COLLABORATOR_COLORS;
export const COLOR_KEYS = Object.keys(COLLABORATOR_COLORS) as ColorKey[];

export function colorHex(key: string): string {
  return (COLLABORATOR_COLORS as Record<string, { hex: string }>)[key]?.hex ?? COLLABORATOR_COLORS.slate.hex;
}

/** Couleur suivante la moins utilisée, pour qu'un nouveau collaborateur se distingue. */
export function nextColor(used: string[]): ColorKey {
  const count = (k: string) => used.filter((u) => u === k).length;
  return [...COLOR_KEYS].sort((a, b) => count(a) - count(b))[0];
}
