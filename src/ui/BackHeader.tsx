import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

/** En-tête d'un écran secondaire, avec bouton retour. */
export function BackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe px-2 flex items-center gap-1 min-h-[56px]">
      <button type="button" onClick={() => navigate(-1)} aria-label="Retour" className="w-11 h-11 flex items-center justify-center text-accent">
        <Icon name="back" size={24} strokeWidth={2.2} />
      </button>
      <h1 className="text-[22px] font-bold">{title}</h1>
    </header>
  );
}
