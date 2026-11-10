/** Sélecteur segmenté (onglets d'une fiche, filtres exclusifs). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 p-1 rounded-2xl bg-surface-2 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-[40px] px-3 rounded-xl text-[14px] whitespace-nowrap ${value === o.value ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted font-medium'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
