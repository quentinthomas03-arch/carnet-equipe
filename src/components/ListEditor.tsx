import { useState } from 'react';
import { setSetting, useSetting } from '../db/settings';
import { Icon } from '../ui/Icon';

/** Édition d'une liste de libellés (sites, activités). */
export function ListEditor({ settingKey, fallback, label, placeholder }: { settingKey: string; fallback: string[]; label: string; placeholder: string }) {
  const items = useSetting<string[]>(settingKey, fallback);
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) void setSetting(settingKey, [...items, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[15px] font-semibold">{label}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it} className="min-h-[40px] pl-3.5 pr-1 rounded-full bg-surface-2 inline-flex items-center gap-1 text-[15px]">
            {it}
            <button type="button" aria-label={`Retirer ${it}`} onClick={() => setSetting(settingKey, items.filter((x) => x !== it))} className="w-9 h-9 rounded-full flex items-center justify-center text-muted">
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="flex-1 min-w-0 min-h-[44px] rounded-2xl bg-surface-2 px-3 placeholder:text-muted" />
        <button type="submit" disabled={!draft.trim()} className="min-h-[44px] px-4 rounded-2xl bg-accent text-accent-ink font-semibold disabled:opacity-40">Ajouter</button>
      </form>
    </div>
  );
}
