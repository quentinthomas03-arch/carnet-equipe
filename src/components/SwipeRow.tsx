import { useRef, useState, type ReactNode } from 'react';

const THRESHOLD = 80;

/**
 * Ligne qu'on peut glisser : vers la droite → action principale (ex. « Abordé »),
 * vers la gauche → action secondaire (ex. « Reporter »).
 * Les mêmes actions restent accessibles sans geste dans la feuille de détail (accessibilité).
 */
export function SwipeRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel,
  leftLabel,
}: {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; locked: 'h' | 'v' | null } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, locked: null };
  }
  function onTouchMove(e: React.TouchEvent) {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const mx = t.clientX - s.x;
    const my = t.clientY - s.y;
    if (!s.locked && Math.hypot(mx, my) > 10) s.locked = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
    if (s.locked !== 'h') return;
    if ((mx > 0 && !onSwipeRight) || (mx < 0 && !onSwipeLeft)) return setDx(0);
    setDx(Math.max(-140, Math.min(140, mx)));
  }
  function onTouchEnd() {
    if (dx >= THRESHOLD) onSwipeRight?.();
    else if (dx <= -THRESHOLD) onSwipeLeft?.();
    start.current = null;
    setDx(0);
  }

  const armed = Math.abs(dx) >= THRESHOLD;
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {dx > 0 && (
        <div className={`absolute inset-0 flex items-center pl-5 font-semibold text-[15px] ${armed ? 'bg-ok text-surface' : 'bg-ok-soft text-ok'}`}>{rightLabel}</div>
      )}
      {dx < 0 && (
        <div className={`absolute inset-0 flex items-center justify-end pr-5 font-semibold text-[15px] ${armed ? 'bg-warn text-surface' : 'bg-warn-soft text-warn'}`}>{leftLabel}</div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{ transform: `translateX(${dx}px)`, transition: start.current ? 'none' : 'transform 0.2s', touchAction: 'pan-y' }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
