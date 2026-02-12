import jsPDF from 'jspdf';
import type { Page } from '../types/label';
import { renderer } from './canvas-renderer';
import { blackBackground, paperSize, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor, oversized } from '../store/labels';
import {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  PAPER_CONFIGS,
  type PaperConfig
} from './constants';

function drawCrosshairs(pdf: jsPDF, config: PaperConfig): void {
  const CROSSHAIR_LENGTH = 3; // mm

  // Calculate printable area bounds
  const leftX = config.leftMargin;
  const rightX = config.leftMargin + (config.cols * config.translateWidth);
  const topY = config.topMargin;
  const bottomY = config.topMargin + (config.rows * config.translateHeight);

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

function rotateCanvas(src: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rotated = document.createElement('canvas');
  const rad = (degrees * Math.PI) / 180;
  if (degrees === 90 || degrees === 270) {
    rotated.width = src.height;
    rotated.height = src.width;
  } else {
    rotated.width = src.width;
    rotated.height = src.height;
  }
  const ctx = rotated.getContext('2d')!;
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return rotated;
}

export async function generatePDF(pages: Page[]): Promise<void> {
  const format = paperSize();
  const config = PAPER_CONFIGS[format];

  // For standard sizes use the name, for custom sizes pass [width, height]
  const jsPDFFormat = (format === 'letter' || format === 'a4') ? format : [config.width, config.height];
  const orientation = config.width > config.height ? 'landscape' : 'portrait' as const;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: jsPDFFormat as any
  });

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) pdf.addPage();

    const page = pages[pageIdx];

    // Fill entire page with black if black background is enabled
    if (blackBackground()) {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, config.width, config.height, 'F');
    }

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const labelIndex = row * config.cols + col;
        const label = page.labels[labelIndex];

        // Skip empty slots
        if (!label) continue;

        // Resolve per-label config overrides
        const effTemplate = (label.config?.labelTemplate ?? labelTemplate()) as 'original' | 'clean';
        const effBgColor = label.config?.cleanBgColor ?? cleanBgColor();
        const effTextColor = label.config?.cleanTextColor ?? cleanTextColor();
        const effShowInsert = label.config?.showInsertThisEnd ?? showInsertThisEnd();

        // Render label to temp canvas
        let canvas = document.createElement('canvas');
        await renderer.renderLabel(label, canvas, blackBackground(), effShowInsert, effTemplate, effBgColor, effTextColor);

        // Rotate label if config requires it
        if (config.labelRotation) {
          canvas = rotateCanvas(canvas, config.labelRotation);
        }

        // Position on PDF page (offset +1mm right, +2mm down for standard sizes)
        const isCustomSize = format !== 'letter' && format !== 'a4';
        const xOffset = isCustomSize ? 0 : 1;
        const yOffset = isCustomSize ? 0 : 2;
        const x = config.leftMargin + col * config.translateWidth + xOffset;
        const y = config.topMargin + row * config.translateHeight + yOffset;

        // Label dimensions on page (swapped if rotated)
        const isRotatedSideways = config.labelRotation === 90 || config.labelRotation === 270;
        const placedWidth = isRotatedSideways ? LABEL_HEIGHT_MM : LABEL_WIDTH_MM;
        const placedHeight = isRotatedSideways ? LABEL_WIDTH_MM : LABEL_HEIGHT_MM;

        // When oversized, expand label by 1mm on each side for bleed tolerance
        const oversize = oversized() ? 1 : 0;
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          x - oversize, y - oversize,
          placedWidth + oversize * 2,
          placedHeight + oversize * 2
        );
      }
    }

    // Draw crosshairs at corners of printable area (skip for custom sizes)
    if (format === 'letter' || format === 'a4') {
      drawCrosshairs(pdf, config);
    }
  }

  pdf.save('mdlabels.pdf');
}
