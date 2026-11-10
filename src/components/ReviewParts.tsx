import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { defaultPeriod, type Period, type ReviewSource } from '../domain/review';
import type { ReviewDocument } from '../domain/reviewDoc';
import { formatShort, todayISO } from '../domain/dates';
import { isPdfReady, preloadPdf, renderPdf } from '../lib/pdf';
import { shareOrDownload } from '../lib/share';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';

/** Toutes les données utiles aux bilans, lues en direct. */
export function useReviewSource(): (ReviewSource & { collaborators: import('../db/types').Collaborator[] }) | undefined {
  return useLiveQuery(async () => {
    const [collaborators, entries, meetings, objectives, skills, plans, onboardings] = await Promise.all([
      db.collaborators.toArray(), db.entries.toArray(), db.meetings.toArray(), db.objectives.toArray(),
      db.skills.toArray(), db.developmentPlans.toArray(), db.onboardings.toArray(),
    ]);
    return { collaborators, entries, meetings, objectives, skills, plans, onboardings };
  }, []);
}

/** Période choisie, conservée dans l'adresse (?du=…&au=…). */
export function usePeriod(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams();
  const def = defaultPeriod(todayISO());
  const period = { start: params.get('du') ?? def.start, end: params.get('au') ?? def.end };
  return [period, (p) => setParams({ du: p.start, au: p.end }, { replace: true })];
}

export function PeriodPicker({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const year = Number(todayISO().slice(0, 4));
  const years = [year, year - 1, year - 2];
  const isYear = (y: number) => period.start === `${y}-01-01` && period.end === `${y}-12-31`;
  const custom = !years.some(isYear);
  const [showCustom, setShowCustom] = useState(custom);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Période">
        {years.map((y) => (
          <Chip key={y} selected={isYear(y) && !showCustom} onClick={() => { setShowCustom(false); onChange({ start: `${y}-01-01`, end: `${y}-12-31` }); }}>{y}</Chip>
        ))}
        <Chip selected={showCustom} onClick={() => setShowCustom(true)}>Autre période</Chip>
      </div>
      {showCustom && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[13px] text-muted">Du</span>
            <input type="date" value={period.start} onChange={(e) => e.target.value && onChange({ ...period, start: e.target.value })} className="min-h-[44px] rounded-xl bg-surface-2 px-3 w-full" /></label>
          <label className="flex flex-col gap-1"><span className="text-[13px] text-muted">Au</span>
            <input type="date" value={period.end} onChange={(e) => e.target.value && onChange({ ...period, end: e.target.value })} className="min-h-[44px] rounded-xl bg-surface-2 px-3 w-full" /></label>
        </div>
      )}
    </div>
  );
}

/** Affichage d'un bilan dans l'appli. */
export function DocumentView({ doc }: { doc: ReviewDocument }) {
  return (
    <div className="flex flex-col gap-3">
      {doc.sections.map((s) => (
        <section key={s.title} className="card p-4 flex flex-col gap-2">
          <h2 className="section-title">{s.title}</h2>
          {s.blocks.map((b, i) =>
            b.kind === 'h3' ? <h3 key={i} className="text-[15px] font-semibold mt-1">{b.text}</h3>
            : b.kind === 'p' ? <p key={i} className="text-[15px] leading-snug">{b.text}</p>
            : b.kind === 'empty' ? <p key={i} className="text-[14px] text-muted">{b.text}</p>
            : <ul key={i} className="list-disc pl-5 flex flex-col gap-1 text-[15px] leading-snug">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>,
          )}
        </section>
      ))}
    </div>
  );
}

/** Actions d'un bilan : « Préparer pour Claude » et export PDF. */
export function ReviewActions({ doc, prompt, fileBase, withLastName, onToggleLastName }: {
  doc: ReviewDocument; prompt: string; fileBase: string; withLastName: boolean; onToggleLastName: (v: boolean) => void;
}) {
  const toast = useToast();
  const [claude, setClaude] = useState(false);
  const [pdfReady, setPdfReady] = useState(isPdfReady());
  useEffect(() => {
    preloadPdf().then(() => setPdfReady(true)).catch(() => {});
  }, []);

  /** Synchrone jusqu'au partage : Safari n'autorise le menu de partage que juste après un tap. */
  function exportPdf() {
    const blob = renderPdf(doc, formatShort(todayISO(), new Date(2000, 0, 1)));
    const file = new File([blob], `${fileBase}.pdf`, { type: 'application/pdf' });
    void shareOrDownload(file, doc.title).then((r) => r !== 'cancelled' && toast('PDF prêt'));
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button onClick={() => setClaude(true)}><Icon name="share" size={18} /> Préparer pour Claude</Button>
        <Button variant="secondary" onClick={exportPdf} disabled={!pdfReady}><Icon name="download" size={18} /> PDF</Button>
      </div>
      <label className="flex items-center gap-2 text-[14px] text-muted px-1">
        <input type="checkbox" checked={withLastName} onChange={(e) => onToggleLastName(e.target.checked)} className="w-5 h-5 accent-[rgb(var(--accent))]" />
        Inclure les noms de famille
      </label>
      {claude && <ClaudeSheet prompt={prompt} onClose={() => setClaude(false)} />}
    </>
  );
}

function ClaudeSheet({ prompt, onClose }: { prompt: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Sheet open onClose={onClose} title="Préparer pour Claude">
      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-muted leading-snug">
          Ce texte contient une consigne de rédaction et les données compilées. Rien n'est envoyé par l'appli :
          seule ta copie le transmet. Relis-le avant de le coller dans Claude, et vérifie qu'il respecte la politique de ton employeur.
        </p>
        <Button onClick={copy}><Icon name={copied ? 'check' : 'share'} size={18} /> {copied ? 'Copié : colle-le dans Claude' : 'Copier le texte'}</Button>
        <textarea readOnly value={prompt} rows={14} aria-label="Texte à copier" onFocus={(e) => e.currentTarget.select()} className="w-full rounded-2xl bg-surface-2 p-3 text-[13px] leading-snug font-mono" />
      </div>
    </Sheet>
  );
}
