/** Design système « Ardoise » : les couleurs sont des variables CSS (voir src/index.css)
 *  pour basculer automatiquement en mode sombre. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        'accent-soft': v('accent-soft'),
        'accent-soft-ink': v('accent-soft-ink'),
        warn: v('warn'),
        'warn-soft': v('warn-soft'),
        danger: v('danger'),
        'danger-soft': v('danger-soft'),
        ok: v('ok'),
        'ok-soft': v('ok-soft'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
};
