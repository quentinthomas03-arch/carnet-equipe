import { colorHex } from './palette';

export function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ''}${last.trim()[0] ?? ''}`.toUpperCase() || '?';
}

export function Avatar({ firstName, lastName, color, size = 40 }: { firstName: string; lastName: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="rounded-full text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: colorHex(color), fontSize: Math.round(size * 0.38) }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

/** Pastille « Équipe » pour les entrées collectives. */
export function TeamAvatar({ size = 40 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="rounded-full bg-ink text-bg font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}>
      ÉQ
    </span>
  );
}
