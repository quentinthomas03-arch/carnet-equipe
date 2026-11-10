/**
 * Mise en forme des bilans en un « document » neutre, réutilisé pour :
 * l'affichage dans l'appli, l'export PDF et le texte « Préparer pour Claude ».
 */
import type { Entry } from '../db/types';
import { formatShort } from './dates';
import { CATEGORY_LABELS, RATING_LABELS, SKILL_LEVELS, STATUS_LABELS } from './objectives';
import { WORKLOAD_LABELS } from './meetingPrep';
import type { CollaboratorReview, CommitmentReport, Period, TeamYear } from './review';

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'h3'; text: string }
  | { kind: 'empty'; text: string };

export interface DocSection {
  title: string;
  blocks: Block[];
}

export interface ReviewDocument {
  title: string;
  subtitle: string;
  sections: DocSection[];
}

const fmt = (d: string) => formatShort(d.slice(0, 10), new Date(2000, 0, 1)); // toujours avec l'année
export const periodLabel = (p: Period) =>
  p.start.endsWith('-01-01') && p.end.endsWith('-12-31') && p.start.slice(0, 4) === p.end.slice(0, 4)
    ? `Année ${p.start.slice(0, 4)}`
    : `Du ${fmt(p.start)} au ${fmt(p.end)}`;

const dated = (e: Entry) => `${e.text} (${fmt(e.createdAt)})`;
const list = (items: string[], empty: string): Block => (items.length ? { kind: 'list', items } : { kind: 'empty', text: empty });

function commitmentBlocks(r: CommitmentReport, who: string): Block[] {
  const blocks: Block[] = [
    {
      kind: 'p',
      text: r.rate === null
        ? `${who} : aucun engagement évaluable sur la période.`
        : `${who} : ${r.kept.length} tenu${r.kept.length > 1 ? 's' : ''} (dont ${r.keptLate.length} en retard), ${r.notKept.length} non tenu${r.notKept.length > 1 ? 's' : ''}, ${r.open.length} en cours. Taux de tenue : ${r.rate} %.`,
    },
  ];
  if (r.kept.length) blocks.push({ kind: 'list', items: r.kept.map((e) => `Tenu : ${e.text}${r.keptLate.includes(e) ? ' (en retard)' : ''}`) });
  if (r.notKept.length) blocks.push({ kind: 'list', items: r.notKept.map((e) => `Non tenu : ${e.text}${e.dueDate ? ` (échéance ${fmt(e.dueDate)})` : ''}${e.status === 'dropped' ? ' (abandonné)' : ''}`) });
  if (r.open.length) blocks.push({ kind: 'list', items: r.open.map((e) => `En cours : ${e.text}${e.dueDate ? ` (échéance ${fmt(e.dueDate)})` : ''}`) });
  return blocks;
}

export function collaboratorDocument(r: CollaboratorReview, opts: { withLastName: boolean }): ReviewDocument {
  const c = r.collaborator;
  const name = opts.withLastName ? `${c.firstName} ${c.lastName}`.trim() : c.firstName;
  const workloadTotal = r.workload.ok + r.workload.tense + r.workload.overloaded;

  const sections: DocSection[] = [
    {
      title: 'Contexte',
      blocks: [
        { kind: 'list', items: [
          `Poste : ${c.role || 'non renseigné'}${c.site ? ` · site : ${c.site}` : ''}${c.activity ? ` · activité : ${c.activity}` : ''}`,
          ...(c.arrivalDate ? [`Arrivée : ${fmt(c.arrivalDate)}`] : []),
          `Points individuels réalisés sur la période : ${r.meetings.length}`,
          ...(r.onboarding ? [`Onboarding : arrivée le ${fmt(r.onboarding.arrivalDate)}, ${r.onboarding.completed ? 'clôturé' : `${r.onboarding.percent} % réalisé`}, fin de période d'essai le ${fmt(r.onboarding.trialEndDate)}`] : []),
        ] },
      ],
    },
    { title: 'Réussites', blocks: [list(r.successes.map(dated), 'Aucune réussite notée sur la période.')] },
    { title: "Points d'alerte", blocks: [list(r.alerts.map((e) => `${dated(e)}${e.status === 'done' ? ' — traité' : ' — encore ouvert'}`), "Aucun point d'alerte noté.")] },
    {
      title: 'Objectifs et progression',
      blocks: r.objectives.length
        ? r.objectives.flatMap((o): Block[] => [
            { kind: 'h3', text: `${CATEGORY_LABELS[o.category]} — ${o.title}` },
            { kind: 'list', items: [
              `${o.scope === 'collective' ? 'Objectif collectif' : 'Objectif individuel'}${o.dueDate ? `, échéance ${fmt(o.dueDate)}` : ''}${o.weight !== undefined ? `, pondération ${o.weight} %` : ''}`,
              `Statut : ${STATUS_LABELS[o.status]} · avancement ${o.progress} %${o.rating ? ` · appréciation : ${RATING_LABELS[o.rating]}` : ''}`,
              ...(o.description ? [`Éléments de mesure : ${o.description.replace(/\n+/g, ' ; ')}`] : []),
              ...o.notes.filter((n) => n.date >= r.period.start && n.date <= r.period.end).map((n) => `Suivi ${fmt(n.date)} : ${n.text}`),
            ] },
          ])
        : [{ kind: 'empty', text: 'Aucun objectif enregistré pour la période.' }],
    },
    { title: 'Engagements', blocks: [...commitmentBlocks(r.mine, 'Mes engagements (manager)'), ...commitmentBlocks(r.theirs, `Engagements de ${c.firstName}`)] },
    {
      title: 'Sujets abordés en points individuels',
      blocks: [
        list(r.topicsCovered.map((e) => e.text), 'Aucun sujet marqué comme abordé.'),
        ...(r.topicsPending.length ? [{ kind: 'p', text: `Encore en attente : ${r.topicsPending.map((e) => e.text).join(' ; ')}` } as Block] : []),
        ...(r.meetings.filter((m) => m.decisions).length
          ? [{ kind: 'h3', text: 'Décisions prises' } as Block, { kind: 'list', items: r.meetings.filter((m) => m.decisions).map((m) => `${fmt(m.date)} : ${m.decisions.replace(/\n+/g, ' ; ')}`) } as Block]
          : []),
      ],
    },
    {
      title: 'Charge de travail (ressenti noté aux points)',
      blocks: [workloadTotal
        ? { kind: 'p', text: `${WORKLOAD_LABELS.ok} : ${r.workload.ok} · ${WORKLOAD_LABELS.tense} : ${r.workload.tense} · ${WORKLOAD_LABELS.overloaded} : ${r.workload.overloaded} (sur ${workloadTotal} point${workloadTotal > 1 ? 's' : ''} renseigné${workloadTotal > 1 ? 's' : ''}).` }
        : { kind: 'empty', text: 'Non renseignée.' }],
    },
    {
      title: 'Compétences',
      blocks: [list(r.skills.map((s) => `${s.name} : ${SKILL_LEVELS[s.current]}${s.target ? ` (visé : ${SKILL_LEVELS[s.target]})` : ''}`), 'Aucune compétence évaluée.')],
    },
    {
      title: 'Évolution et formations',
      blocks: [
        { kind: 'list', items: [
          `Souhaits d'évolution : ${r.plan?.wishes?.trim() || 'non renseignés'}`,
          `Mobilité : ${r.plan?.mobility?.trim() || 'non renseignée'}`,
        ] },
        list((r.plan?.trainings ?? []).map((t) => `Formation ${({ wished: 'souhaitée', planned: 'programmée', done: 'réalisée' } as const)[t.status]} : ${t.label}`), 'Aucune formation notée.'),
        ...((r.plan?.actionPlan ?? []).length
          ? [{ kind: 'list', items: r.plan!.actionPlan.map((s) => `Plan d'action — ${s.label} : ${s.done ? 'fait' : 'à faire'}${s.dueDate ? ` (${fmt(s.dueDate)})` : ''}`) } as Block]
          : []),
      ],
    },
  ];
  return { title: `Bilan — ${name}`, subtitle: periodLabel(r.period), sections };
}

export function teamDocument(t: TeamYear, opts: { withLastName: boolean }): ReviewDocument {
  const nameOf = (id: string) => {
    const m = t.members.find((x) => x.collaborator.id === id)?.collaborator;
    return m ? (opts.withLastName ? `${m.firstName} ${m.lastName}`.trim() : m.firstName) : '';
  };
  const regularity = t.meetingsExpected ? Math.min(100, Math.round((t.meetingsDone / t.meetingsExpected) * 100)) : null;
  const wl = t.workload.ok + t.workload.tense + t.workload.overloaded;
  return {
    title: 'Année de mon équipe',
    subtitle: periodLabel(t.period),
    sections: [
      {
        title: 'Équipe',
        blocks: [{ kind: 'list', items: [
          `Collaborateurs suivis sur la période : ${t.members.length}`,
          `Arrivées : ${t.arrivals.length}${t.arrivals.length ? ` (${t.arrivals.map((c) => nameOf(c.id) || c.firstName).join(', ')})` : ''}`,
          `Départs ou archivages : ${t.departures.length}`,
          `Onboardings menés à terme : ${t.onboardingsCompleted} · en cours : ${t.onboardingsInProgress}`,
        ] }],
      },
      {
        title: 'Rituels managériaux',
        blocks: [{ kind: 'list', items: [
          `Points individuels réalisés : ${t.meetingsDone}${regularity !== null ? ` sur ${t.meetingsExpected} attendus selon les rythmes fixés (${regularity} %)` : ''}`,
          `Mes engagements envers l'équipe : ${t.mine.rate !== null ? `${t.mine.rate} % tenus (${t.mine.kept.length} tenus, ${t.mine.notKept.length} non tenus)` : 'non évaluable'}`,
          ...(wl ? [`Charge de travail ressentie : ${t.workload.ok} OK, ${t.workload.tense} tendue, ${t.workload.overloaded} surcharge (${wl} points)`] : []),
        ] }],
      },
      { title: 'Réussites collectives', blocks: [list(t.teamSuccesses.map(dated), 'Aucune réussite collective notée.')] },
      {
        title: 'Réussites individuelles',
        blocks: [list(t.individualSuccesses.map((e) => `${nameOf(e.collaboratorId)} : ${dated(e)}`), 'Aucune réussite individuelle notée.')],
      },
      {
        title: 'Développement des collaborateurs',
        blocks: [list(
          t.members.map((m) => {
            const parts = [
              `${m.meetingsDone} point${m.meetingsDone > 1 ? 's' : ''}`,
              m.objectivesTotal ? `objectifs atteints ${m.objectivesAchieved}/${m.objectivesTotal}` : null,
              m.skillsWithTarget ? `compétences au niveau visé ${m.skillsAtTarget}/${m.skillsWithTarget}` : null,
              m.trainingsDone.length ? `formations réalisées : ${m.trainingsDone.join(', ')}` : null,
              m.onboarded ? 'onboarding réussi' : null,
            ].filter(Boolean);
            return `${nameOf(m.collaborator.id)} : ${parts.join(' · ')}`;
          }),
          'Aucun collaborateur sur la période.',
        )],
      },
    ],
  };
}

/** Rendu texte (Markdown simple) d'un document : utilisé pour Claude. */
export function documentToMarkdown(doc: ReviewDocument): string {
  const out = [`# ${doc.title}`, doc.subtitle, ''];
  for (const s of doc.sections) {
    out.push(`## ${s.title}`);
    for (const b of s.blocks) {
      if (b.kind === 'p' || b.kind === 'empty') out.push(b.text);
      else if (b.kind === 'h3') out.push(`### ${b.text}`);
      else out.push(...b.items.map((i) => `- ${i}`));
    }
    out.push('');
  }
  return out.join('\n').trim();
}

const RULES = `Règles :
- Appuie-toi UNIQUEMENT sur les données ci-dessous ; n'invente aucun fait, chiffre ni exemple. Si une rubrique manque d'éléments, écris « À compléter » et indique quelle information il me faudrait.
- Ton factuel, bienveillant et professionnel, en français. Phrases courtes, prêtes à reprendre dans un formulaire.
- N'ajoute aucune donnée de santé ni d'ordre privé, même si elle semble se déduire du texte.`;

/** Consigne + données pour obtenir une synthèse d'entretien annuel (rubriques du formulaire). */
export function claudeReviewPrompt(doc: ReviewDocument, firstName: string): string {
  return `Je suis manager et je prépare l'entretien annuel (entretien d'appréciation et professionnel) de ${firstName}. Voici les éléments factuels que j'ai notés au fil de l'année dans mon carnet de manager.

${RULES}

Rédige une synthèse structurée selon les rubriques de mon formulaire d'entretien :
1. Bilan de l'année écoulée : événements marquants, points de satisfaction, obstacles rencontrés, plans d'action éventuels.
2. Évaluation des objectifs : pour chaque objectif, un commentaire manager et une proposition d'appréciation parmi « Ne répond pas aux attentes », « Répond partiellement aux attentes », « Répond aux attentes », « Dépasse les attentes », justifiée par les faits.
3. Pour aller plus loin : ma contribution de manager à l'atteinte de ses objectifs, et sa contribution aux objectifs de l'équipe.
4. Suivi de la charge de travail : synthèse à partir des ressentis notés.
5. Compétences : forces et axes de progrès, avec le niveau actuel et visé.
6. Appréciation globale : 3 à 4 phrases.
7. Objectifs proposés pour l'année suivante : au moins 3 objectifs SMART (catégories Sécurité, Qualité, Métier, Production), avec indicateurs mesurables et une pondération totale de 100 %.
8. Entretien professionnel : projet d'évolution, formations et dispositifs à envisager, mobilité.
9. Points à aborder pendant l'entretien : 3 à 5 questions ouvertes à poser à ${firstName}.

DONNÉES
-------
${documentToMarkdown(doc)}`;
}

/** Consigne + données pour le dossier de candidature au poste de chef de groupe. */
export function claudeTeamPrompt(doc: ReviewDocument): string {
  return `Je suis responsable d'activité et je prépare mon dossier de candidature au poste de chef de groupe. Voici le bilan factuel de l'année de mon équipe, tiré de mon carnet de manager.

${RULES}

Rédige :
1. Une synthèse de mon année de manager (10 lignes maximum) : résultats collectifs, développement des collaborateurs, intégration des nouveaux arrivants, régularité des rituels managériaux.
2. Des preuves concrètes pour chacune de ces compétences de management, uniquement quand les données le permettent : exemplarité, capacité à déléguer, donner et recevoir du feed-back, fédérer et faire preuve de leadership, piloter la performance, manager le changement, animer l'équipe, pilotage individuel (objectifs, carrière, compétences).
3. Mes points forts et mes axes de progrès de manager, appuyés sur les chiffres (taux de tenue de mes engagements, régularité des points, charge de travail ressentie).
4. Trois réalisations à mettre en avant à l'oral, formulées en situation / action / résultat.

DONNÉES
-------
${documentToMarkdown(doc)}`;
}
