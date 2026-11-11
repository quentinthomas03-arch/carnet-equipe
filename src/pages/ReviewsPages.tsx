import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { compileReview, compileTeamYear } from '../domain/review';
import { claudeReviewPrompt, claudeTeamPrompt, collaboratorDocument, periodLabel, teamDocument } from '../domain/reviewDoc';
import { todayISO } from '../domain/dates';
import { PageHeader } from '../ui/PageHeader';
import { BackHeader } from '../ui/BackHeader';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { BackupBanner } from '../components/BackupBanner';
import { DocumentView, PeriodPicker, ReviewActions, usePeriod, useReviewSource } from '../components/ReviewParts';
import { SETTING, setSetting, useSetting } from '../db/settings';
import { CAMPAIGN_LABELS, CAMPAIGN_ORDER, campaignProgress, campaignStatus, setCampaignStatus, type Campaign, type CampaignStatus } from '../domain/campaign';

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

/** Onglet Bilans : un bilan par collaborateur + « Année de mon équipe ». */
export function ReviewsPage() {
  const src = useReviewSource();
  const [period, setPeriod] = usePeriod();
  const campaign = useSetting<Campaign | undefined>(SETTING.reviewCampaign, undefined);
  if (!src) return null;
  const year = period.end.slice(0, 4);
  const qs = `?du=${period.start}&au=${period.end}`;
  const active = src.collaborators.filter((c) => !c.archivedAt).sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'));
  const archived = src.collaborators.filter((c) => c.archivedAt && c.archivedAt.slice(0, 10) >= period.start);

  return (
    <>
      <PageHeader title="Bilans" subtitle={periodLabel(period)} />
      <BackupBanner />
      <div className="px-4 flex flex-col gap-4">
        <PeriodPicker period={period} onChange={setPeriod} />
        <Link to={`/bilans/equipe${qs}`} className="card p-4 flex items-center gap-3 active:opacity-80">
          <span className="w-10 h-10 rounded-full bg-accent text-accent-ink flex items-center justify-center"><Icon name="team" size={22} /></span>
          <span className="flex-1">
            <span className="block font-semibold">Année de mon équipe</span>
            <span className="block text-[13px] text-muted">Pour mon dossier de candidature à chef de groupe</span>
          </span>
          <Icon name="chevron" size={18} className="text-muted" />
        </Link>
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="section-title">Entretiens annuels {year}</h2>
            {active.length > 0 && (() => {
              const p = campaignProgress(campaign, year, active.map((c) => c.id));
              return <span className="text-[13px] text-muted">{p.done} / {p.total} réalisés</span>;
            })()}
          </div>
          {active.length === 0 && <p className="card p-5 text-[15px] text-muted">Aucun collaborateur.</p>}
          {[...active, ...archived].map((c) => (
            <div key={c.id} className="card p-3 flex items-center gap-3">
              <Link to={`/bilans/${c.id}${qs}`} className="flex-1 min-w-0 flex items-center gap-3 active:opacity-80">
                <Avatar firstName={c.firstName} lastName={c.lastName} color={c.color} size={36} />
                <span className="flex-1 min-w-0 font-medium truncate">{c.firstName} {c.lastName}{c.archivedAt ? <span className="text-muted font-normal"> · archivé·e</span> : null}</span>
              </Link>
              <select
                aria-label={`Avancement de l'entretien de ${c.firstName}`}
                value={campaignStatus(campaign, year, c.id)}
                onChange={(e) => setSetting(SETTING.reviewCampaign, setCampaignStatus(campaign, year, c.id, e.target.value as CampaignStatus))}
                className={`min-h-[36px] max-w-[132px] rounded-xl px-2 text-[13px] font-semibold ${({ todo: 'bg-surface-2 text-muted', ready: 'bg-accent-soft text-accent-soft-ink', done: 'bg-ok-soft text-ok', signed: 'bg-ok text-surface' } as const)[campaignStatus(campaign, year, c.id)]}`}
              >
                {CAMPAIGN_ORDER.map((s) => <option key={s} value={s}>{CAMPAIGN_LABELS[s]}</option>)}
              </select>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const src = useReviewSource();
  const [period, setPeriod] = usePeriod();
  const [withLastName, setWithLastName] = useState(false);
  if (!src) return null;
  const c = src.collaborators.find((x) => x.id === id);
  if (!c) return <p className="pt-safe p-6">Collaborateur introuvable.</p>;
  const review = compileReview(c, src, period, todayISO());
  const doc = collaboratorDocument(review, { withLastName });
  return (
    <div className="pb-8">
      <BackHeader title={`Bilan · ${c.firstName}`} />
      <div className="px-4 flex flex-col gap-4">
        <PeriodPicker period={period} onChange={setPeriod} />
        <ReviewActions doc={doc} prompt={claudeReviewPrompt(doc, c.firstName)} fileBase={`bilan-${slug(c.firstName)}-${period.start.slice(0, 4)}`} withLastName={withLastName} onToggleLastName={setWithLastName} />
        <DocumentView doc={doc} />
      </div>
    </div>
  );
}

export function TeamYearPage() {
  const src = useReviewSource();
  const [period, setPeriod] = usePeriod();
  const [withLastName, setWithLastName] = useState(false);
  if (!src) return null;
  const year = compileTeamYear(src.collaborators, src, period, todayISO());
  const doc = teamDocument(year, { withLastName });
  return (
    <div className="pb-8">
      <BackHeader title="Année de mon équipe" />
      <div className="px-4 flex flex-col gap-4">
        <PeriodPicker period={period} onChange={setPeriod} />
        <ReviewActions doc={doc} prompt={claudeTeamPrompt(doc)} fileBase={`annee-equipe-${period.start.slice(0, 4)}`} withLastName={withLastName} onToggleLastName={setWithLastName} />
        <p className="text-[13px] text-muted px-1 leading-snug">Construit uniquement à partir de ce que tu as saisi. Plus tu notes de réussites (y compris « Équipe ») et de points, plus ce bilan est riche.</p>
        <DocumentView doc={doc} />
      </div>
    </div>
  );
}
