/**
 * Export PDF d'un bilan (jsPDF, chargé uniquement quand on en a besoin).
 * Mise en page A4 sobre : titre, sections, listes, pied de page « confidentiel ».
 */
import type { jsPDF as JsPDF } from 'jspdf';
import type { ReviewDocument } from '../domain/reviewDoc';

type JsPDFCtor = typeof import('jspdf').jsPDF;
let ctor: JsPDFCtor | null = null;

/** Précharge la bibliothèque (à appeler à l'ouverture de l'écran : le partage iOS exige un tap immédiat). */
export async function preloadPdf(): Promise<void> {
  if (!ctor) ctor = (await import('jspdf')).jsPDF;
}

export const isPdfReady = () => ctor !== null;

/**
 * Les polices standard des PDF ne couvrent que l'alphabet latin de base (Latin-1) :
 * on remplace les quelques caractères typographiques qui en sortent.
 */
export function pdfSafe(s: string): string {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[  ]/g, ' ')
    .replace(/[^\u0000-ÿ]/g, '');
}

const ACCENT: [number, number, number] = [14, 94, 111];
const MUTED: [number, number, number] = [91, 100, 112];
const INK: [number, number, number] = [21, 25, 30];

export function renderPdf(doc: ReviewDocument, generatedOn: string, Ctor: JsPDFCtor | null = ctor): Blob {
  if (!Ctor) throw new Error('Bibliothèque PDF non chargée');
  const pdf: JsPDF = new Ctor({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 18;
  const width = W - 2 * M;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - M - 8) {
      pdf.addPage();
      y = M;
    }
  };
  const text = (t: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...(opts.color ?? INK));
    const lines = pdf.splitTextToSize(pdfSafe(t), width - (opts.indent ?? 0)) as string[];
    const lh = size * 0.42;
    for (const line of lines) {
      ensure(lh);
      pdf.text(line, M + (opts.indent ?? 0), y);
      y += lh;
    }
    y += opts.gap ?? 1.5;
  };

  text(doc.title, 18, { bold: true, gap: 1 });
  text(doc.subtitle, 11, { color: MUTED, gap: 4 });
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.6);
  pdf.line(M, y - 2, W - M, y - 2);
  y += 3;

  for (const s of doc.sections) {
    ensure(14);
    y += 2;
    text(s.title, 13, { bold: true, color: ACCENT, gap: 1.5 });
    for (const b of s.blocks) {
      if (b.kind === 'h3') text(b.text, 11, { bold: true, gap: 1 });
      else if (b.kind === 'p') text(b.text, 10.5);
      else if (b.kind === 'empty') text(b.text, 10.5, { color: MUTED });
      else {
        for (const item of b.items) {
          pdf.setFillColor(...MUTED);
          ensure(5);
          pdf.circle(M + 1.2, y - 1.2, 0.6, 'F');
          text(item, 10.5, { indent: 4, gap: 0.8 });
        }
        y += 1;
      }
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED);
    pdf.text(pdfSafe(`Document personnel et confidentiel - Carnet d'équipe - ${generatedOn}`), M, H - 10);
    pdf.text(`${i} / ${pages}`, W - M, H - 10, { align: 'right' });
  }
  return pdf.output('blob');
}
