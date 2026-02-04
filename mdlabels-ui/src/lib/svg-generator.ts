import {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  LEFT_MARGIN_MM,
  TOP_MARGIN_MM,
  TRANSLATE_WIDTH_MM,
  TRANSLATE_HEIGHT_MM,
  ROWS_PER_SHEET,
  COLS_PER_SHEET,
  DOG_EAR_SIZE
} from './constants';
import { paperSize, labelTemplate } from '../store/labels';

// Page dimensions in mm
const PAGE_DIMENSIONS = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 }
};

export function generateCutSVG(): void {
  const dimensions = PAGE_DIMENSIONS[paperSize()];
  const PAGE_WIDTH_MM = dimensions.width;
  const PAGE_HEIGHT_MM = dimensions.height;

  let svgContent = '';

  // Only generate for a single page worth of labels
  for (let row = 0; row < ROWS_PER_SHEET; row++) {
    for (let col = 0; col < COLS_PER_SHEET; col++) {
      // Position on page (with 1mm right, 2mm down offset to match PDF)
      const x = LEFT_MARGIN_MM + col * TRANSLATE_WIDTH_MM + 1;
      const y = TOP_MARGIN_MM + row * TRANSLATE_HEIGHT_MM + 2;

      // Draw label outline with appropriate template shape
      if (labelTemplate() === 'clean') {
        svgContent += drawCleanLabelCutPath(x, y);
      } else {
        svgContent += drawLabelCutPath(x, y);
      }
    }
  }

  // Add crosshairs
  const crosshairs = drawCrosshairs();

  // Create complete SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${PAGE_WIDTH_MM}mm" height="${PAGE_HEIGHT_MM}mm" viewBox="0 0 ${PAGE_WIDTH_MM} ${PAGE_HEIGHT_MM}" xmlns="http://www.w3.org/2000/svg">
  <g stroke="black" stroke-width="0.1" fill="none">
${svgContent}${crosshairs}
  </g>
</svg>`;

  // Download the SVG
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mdlabels-cut.svg';
  link.click();
  URL.revokeObjectURL(url);
}

function drawLabelCutPath(x: number, y: number): string {
  // Create path for label outline with dog ear in top-left corner
  const dogEar = DOG_EAR_SIZE;

  // Start from dog ear point, go clockwise
  const path = `    <path d="
      M ${x + dogEar},${y}
      L ${x + LABEL_WIDTH_MM},${y}
      L ${x + LABEL_WIDTH_MM},${y + LABEL_HEIGHT_MM}
      L ${x},${y + LABEL_HEIGHT_MM}
      L ${x},${y + dogEar}
      Z
    " />
`;

  return path;
}

function drawCleanLabelCutPath(x: number, y: number): string {
  const dogEar = DOG_EAR_SIZE;
  const r = DOG_EAR_SIZE / 2; // 1.25mm radius matching canvas renderer

  // Start from dog ear point, go clockwise with rounded corners on
  // top-right, bottom-right, and bottom-left
  const path = `    <path d="
      M ${x + dogEar},${y}
      L ${x + LABEL_WIDTH_MM - r},${y}
      A ${r} ${r} 0 0 1 ${x + LABEL_WIDTH_MM},${y + r}
      L ${x + LABEL_WIDTH_MM},${y + LABEL_HEIGHT_MM - r}
      A ${r} ${r} 0 0 1 ${x + LABEL_WIDTH_MM - r},${y + LABEL_HEIGHT_MM}
      L ${x + r},${y + LABEL_HEIGHT_MM}
      A ${r} ${r} 0 0 1 ${x},${y + LABEL_HEIGHT_MM - r}
      L ${x},${y + dogEar}
      Z
    " />
`;

  return path;
}

function drawCrosshairs(): string {
  const CROSSHAIR_LENGTH = 3; // mm

  // Calculate printable area bounds (no offset - crosshairs at reference points)
  const leftX = LEFT_MARGIN_MM;
  const rightX = LEFT_MARGIN_MM + (COLS_PER_SHEET * TRANSLATE_WIDTH_MM);
  const topY = TOP_MARGIN_MM;
  const bottomY = TOP_MARGIN_MM + (ROWS_PER_SHEET * TRANSLATE_HEIGHT_MM);

  let crosshairs = '';

  // Top-left corner
  crosshairs += `    <line x1="${leftX - CROSSHAIR_LENGTH}" y1="${topY}" x2="${leftX + CROSSHAIR_LENGTH}" y2="${topY}" />
`;
  crosshairs += `    <line x1="${leftX}" y1="${topY - CROSSHAIR_LENGTH}" x2="${leftX}" y2="${topY + CROSSHAIR_LENGTH}" />
`;

  // Top-right corner
  crosshairs += `    <line x1="${rightX - CROSSHAIR_LENGTH}" y1="${topY}" x2="${rightX + CROSSHAIR_LENGTH}" y2="${topY}" />
`;
  crosshairs += `    <line x1="${rightX}" y1="${topY - CROSSHAIR_LENGTH}" x2="${rightX}" y2="${topY + CROSSHAIR_LENGTH}" />
`;

  // Bottom-left corner
  crosshairs += `    <line x1="${leftX - CROSSHAIR_LENGTH}" y1="${bottomY}" x2="${leftX + CROSSHAIR_LENGTH}" y2="${bottomY}" />
`;
  crosshairs += `    <line x1="${leftX}" y1="${bottomY - CROSSHAIR_LENGTH}" x2="${leftX}" y2="${bottomY + CROSSHAIR_LENGTH}" />
`;

  // Bottom-right corner
  crosshairs += `    <line x1="${rightX - CROSSHAIR_LENGTH}" y1="${bottomY}" x2="${rightX + CROSSHAIR_LENGTH}" y2="${bottomY}" />
`;
  crosshairs += `    <line x1="${rightX}" y1="${bottomY - CROSSHAIR_LENGTH}" x2="${rightX}" y2="${bottomY + CROSSHAIR_LENGTH}" />
`;

  return crosshairs;
}
