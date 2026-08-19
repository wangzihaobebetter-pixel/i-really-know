import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

/** Download a rendered teacher document as a multi-page PDF, including CJK glyphs as pixels. */
export async function exportElementPdf(element: HTMLElement, filename: string): Promise<void> {
  await document.fonts?.ready;
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(element.scrollWidth, element.clientWidth);
  const height = Math.max(element.scrollHeight, element.clientHeight);
  const MAX_RENDER_PIXELS = 40_000_000;
  if (!width || !height || width * height * pixelRatio * pixelRatio > MAX_RENDER_PIXELS) {
    throw new Error('This document is too large for direct PDF rendering.');
  }
  const canvas = await toCanvas(element, {
    backgroundColor: '#ffffff',
    pixelRatio,
    cacheBust: true,
    filter: (node) => !(node instanceof HTMLElement && node.classList.contains('no-print')),
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 10;
  const pageWidth = 210 - margin * 2;
  const pageHeight = 297 - margin * 2;
  const pxPerMm = canvas.width / pageWidth;
  const sliceHeight = Math.floor(pageHeight * pxPerMm);
  let top = 0;
  let page = 0;
  while (top < canvas.height) {
    const height = Math.min(sliceHeight, canvas.height - top);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = height;
    const context = slice.getContext('2d');
    if (!context) throw new Error('PDF canvas is unavailable.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, pageWidth, height / pxPerMm, undefined, 'FAST');
    top += height;
    page += 1;
  }
  pdf.save(filename.replace(/[^a-z0-9._-]+/gi, '-'));
}
