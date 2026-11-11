/**
 * Apparence (thème, taille du texte) : préférence propre à cet appareil, gardée dans localStorage
 * pour être appliquée dès le chargement, sans flash.
 */
export type Theme = 'auto' | 'light' | 'dark';
export type TextSize = 'normal' | 'large';

const read = <T extends string>(key: string, fallback: T): T => {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
};

export const getTheme = () => read<Theme>('carnet:theme', 'auto');
export const getTextSize = () => read<TextSize>('carnet:text', 'normal');

export function applyAppearance(theme = getTheme(), text = getTextSize()): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  if (text === 'large') root.setAttribute('data-text', 'large');
  else root.removeAttribute('data-text');
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0E1114' : '#F5F6F8'));
}

export function setAppearance(theme: Theme, text: TextSize): void {
  try {
    localStorage.setItem('carnet:theme', theme);
    localStorage.setItem('carnet:text', text);
  } catch {
    /* stockage indisponible : appliqué pour cette session seulement */
  }
  applyAppearance(theme, text);
}
