import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';

/** Saisie rapide — le formulaire complet arrive en Phase 1. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Noter vite">
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-muted leading-snug">
          La saisie rapide (collaborateur, type, texte, échéance) arrive en Phase 1.
        </p>
        <p className="flex items-center gap-2 text-[14px] text-muted">
          <Icon name="mic" size={18} /> Astuce : pour dicter, touche le micro du clavier.
        </p>
      </div>
    </Sheet>
  );
}
