import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentModel, PAGE_DIMENSIONS } from '@/types/document';

export async function exportToPDF(document: DocumentModel): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageElements = window.document.querySelectorAll('[data-page-export]');

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i] as HTMLElement;
    const page = document.pages[i];
    if (!page) continue;

    const dims = PAGE_DIMENSIONS[page.size];
    const isLandscape = page.size.includes('landscape');

    if (i > 0) {
      pdf.addPage(
        isLandscape ? [dims.height, dims.width] : [dims.width, dims.height],
        isLandscape ? 'landscape' : 'portrait'
      );
    } else {
      // Reconfigure first page if needed
      if (isLandscape) {
        pdf.deletePage(1);
        pdf.addPage([dims.height, dims.width], 'landscape');
      }
    }

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: page.backgroundColor || '#ffffff',
      width: dims.width,
      height: dims.height,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = isLandscape ? dims.height : dims.width;
    const pdfHeight = isLandscape ? dims.width : dims.height;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  }

  pdf.save(`${document.title || 'document'}.pdf`);
}
