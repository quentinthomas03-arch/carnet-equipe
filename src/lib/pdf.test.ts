import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import { pdfSafe, renderPdf } from './pdf';

describe('export PDF', () => {
  it('remplace les caractères hors Latin-1 sans perdre les accents', () => {
    expect(pdfSafe('L’équipe — cœur… « ok » 🎯')).toBe("L'équipe - coeur... « ok » ");
  });
  it('produit un PDF multipage lisible', async () => {
    const items = Array.from({ length: 80 }, (_, i) => `Élément ${i} : réussite notée à l’atelier`);
    const blob = renderPdf({ title: 'Bilan — Camille', subtitle: 'Année 2026', sections: [{ title: 'Réussites', blocks: [{ kind: 'list', items }] }] }, '10 nov. 2026', jsPDF);
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('/Count 2');
  });
});
