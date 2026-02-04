import jsPDF from 'jspdf';
import type { Page } from '../types/label';
import { renderer } from './canvas-renderer';
import { blackBackground, paperSize, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor } from '../store/labels';
import {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  LEFT_MARGIN_MM,
  TOP_MARGIN_MM,
  TRANSLATE_WIDTH_MM,
  TRANSLATE_HEIGHT_MM,
  ROWS_PER_SHEET,
  COLS_PER_SHEET
} from './constants';

// Page dimensions in mm
const PAGE_DIMENSIONS = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 }
};

function drawCrosshairs(pdf: jsPDF): void {
  const CROSSHAIR_LENGTH = 3; // mm

  // Calculate printable area bounds
  const leftX = LEFT_MARGIN_MM;
  const rightX = LEFT_MARGIN_MM + (COLS_PER_SHEET * TRANSLATE_WIDTH_MM);
  const topY = TOP_MARGIN_MM;
  const bottomY = TOP_MARGIN_MM + (ROWS_PER_SHEET * TRANSLATE_HEIGHT_MM);

  // Set line properties for crosshairs
  pdf.setLineWidth(0.1);
  // Use white crosshairs on black background, black on white background
  pdf.setDrawColor(blackBackground() ? 255 : 0);

  // Top-left corner
  pdf.line(leftX - CROSSHAIR_LENGTH, topY, leftX + CROSSHAIR_LENGTH, topY);
  pdf.line(leftX, topY - CROSSHAIR_LENGTH, leftX, topY + CROSSHAIR_LENGTH);

  // Top-right corner
  pdf.line(rightX - CROSSHAIR_LENGTH, topY, rightX + CROSSHAIR_LENGTH, topY);
  pdf.line(rightX, topY - CROSSHAIR_LENGTH, rightX, topY + CROSSHAIR_LENGTH);

  // Bottom-left corner
  pdf.line(leftX - CROSSHAIR_LENGTH, bottomY, leftX + CROSSHAIR_LENGTH, bottomY);
  pdf.line(leftX, bottomY - CROSSHAIR_LENGTH, leftX, bottomY + CROSSHAIR_LENGTH);

  // Bottom-right corner
  pdf.line(rightX - CROSSHAIR_LENGTH, bottomY, rightX + CROSSHAIR_LENGTH, bottomY);
  pdf.line(rightX, bottomY - CROSSHAIR_LENGTH, rightX, bottomY + CROSSHAIR_LENGTH);
}

export async function generatePDF(pages: Page[]): Promise<void> {
  const format = paperSize();
  const dimensions = PAGE_DIMENSIONS[format];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: format
  });

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) pdf.addPage();

    const page = pages[pageIdx];

    // Fill entire page with black if black background is enabled
    if (blackBackground()) {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, dimensions.width, dimensions.height, 'F');
    }

    for (let row = 0; row < ROWS_PER_SHEET; row++) {
      for (let col = 0; col < COLS_PER_SHEET; col++) {
        const labelIndex = row * COLS_PER_SHEET + col;
        const label = page.labels[labelIndex];

        // Skip empty slots
        if (!label) continue;

        // Resolve per-label config overrides
        const effTemplate = (label.config?.labelTemplate ?? labelTemplate()) as 'original' | 'clean';
        const effBgColor = label.config?.cleanBgColor ?? cleanBgColor();
        const effTextColor = label.config?.cleanTextColor ?? cleanTextColor();
        const effShowInsert = label.config?.showInsertThisEnd ?? showInsertThisEnd();

        // Render label to temp canvas
        const canvas = document.createElement('canvas');
        await renderer.renderLabel(label, canvas, blackBackground(), effShowInsert, effTemplate, effBgColor, effTextColor);

        // Position on PDF page (offset +1mm right, +2mm down)
        const x = LEFT_MARGIN_MM + col * TRANSLATE_WIDTH_MM + 1;
        const y = TOP_MARGIN_MM + row * TRANSLATE_HEIGHT_MM + 2;

        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          x, y,
          LABEL_WIDTH_MM,
          LABEL_HEIGHT_MM
        );
      }
    }

    // Draw crosshairs at corners of printable area
    drawCrosshairs(pdf);
  }

  pdf.save('mdlabels.pdf');
}
