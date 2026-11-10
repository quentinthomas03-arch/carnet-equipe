import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Feuille modale qui monte du bas de l'écran (utilisable d'une main).
 * S'appuie sur <dialog> : focus piégé, Échap et libellé accessibles nativement.
 */
export function Sheet({ open, onClose, title, children, action }: { open: boolean; onClose: () => void; title: string; children: ReactNode; action?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none max-h-[92dvh] p-0 bg-transparent backdrop:bg-black/40"
    >
      <div className="bg-surface text-ink rounded-t-3xl pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-muted">
            <Icon name="close" size={22} />
          </button>
          <h2 className="flex-1 text-[18px] font-bold text-center truncate px-2">{title}</h2>
          <div className="min-w-[44px] flex justify-end">{action}</div>
        </div>
        <div className="px-5 pb-6 overflow-y-auto max-h-[80dvh]">{children}</div>
      </div>
    </dialog>
  );
}
