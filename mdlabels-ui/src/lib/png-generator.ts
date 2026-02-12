import type { Page } from '../types/label';
import { renderer } from './canvas-renderer';
import { blackBackground, paperSize, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor, oversized } from '../store/labels';
import {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  DPI,
  MM_TO_PX,
  PAPER_CONFIGS,
} from './constants';

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// On mobile, we must open windows synchronously during the user gesture
// before any async work, or iOS Safari will block them.
export function preOpenWindows(pages: Page[]): (Window | null)[] {
  if (!isMobile) return [];
  return pages.map(() => window.open('', '_blank'));
}

export async function generatePNG(pages: Page[], preOpenedWindows: (Window | null)[] = []): Promise<void> {
  const format = paperSize();
  const config = PAPER_CONFIGS[format];

  const isLandscape = config.width > config.height;

  // Convert page dimensions to pixels at 300 DPI
  const pageWidthPx = Math.round(config.width * MM_TO_PX);
  const pageHeightPx = Math.round(config.height * MM_TO_PX);

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];

    const canvas = document.createElement('canvas');
    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;
    const ctx = canvas.getContext('2d')!;

    // Fill background
    if (blackBackground()) {
      ctx.fillStyle = '#000000';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const labelIndex = row * config.cols + col;
        const label = page.labels[labelIndex];
        if (!label) continue;

        // Resolve per-label config overrides
        const effTemplate = (label.config?.labelTemplate ?? labelTemplate()) as 'original' | 'clean';
        const effBgColor = label.config?.cleanBgColor ?? cleanBgColor();
        const effTextColor = label.config?.cleanTextColor ?? cleanTextColor();
        const effShowInsert = label.config?.showInsertThisEnd ?? showInsertThisEnd();

        // Render label to temp canvas
        let labelCanvas = document.createElement('canvas');
        await renderer.renderLabel(label, labelCanvas, blackBackground(), effShowInsert, effTemplate, effBgColor, effTextColor);

        // Rotate label if config requires it
        if (config.labelRotation) {
          const rad = (config.labelRotation * Math.PI) / 180;
          const rotated = document.createElement('canvas');
          if (config.labelRotation === 90 || config.labelRotation === 270) {
            rotated.width = labelCanvas.height;
            rotated.height = labelCanvas.width;
          } else {
            rotated.width = labelCanvas.width;
            rotated.height = labelCanvas.height;
          }
          const rCtx = rotated.getContext('2d')!;
          rCtx.translate(rotated.width / 2, rotated.height / 2);
          rCtx.rotate(rad);
          rCtx.drawImage(labelCanvas, -labelCanvas.width / 2, -labelCanvas.height / 2);
          labelCanvas = rotated;
        }

        // Position matching the PDF layout
        const isCustomSize = format !== 'letter' && format !== 'a4';
        const xOffset = isCustomSize ? 0 : 1;
        const yOffset = isCustomSize ? 0 : 2;
        const xMM = config.leftMargin + col * config.translateWidth + xOffset;
        const yMM = config.topMargin + row * config.translateHeight + yOffset;

        const isRotatedSideways = config.labelRotation === 90 || config.labelRotation === 270;
        const placedWidth = isRotatedSideways ? LABEL_HEIGHT_MM : LABEL_WIDTH_MM;
        const placedHeight = isRotatedSideways ? LABEL_WIDTH_MM : LABEL_HEIGHT_MM;

        const oversize = oversized() ? 1 : 0;
        const drawX = Math.round((xMM - oversize) * MM_TO_PX);
        const drawY = Math.round((yMM - oversize) * MM_TO_PX);
        const drawW = Math.round((placedWidth + oversize * 2) * MM_TO_PX);
        const drawH = Math.round((placedHeight + oversize * 2) * MM_TO_PX);

        ctx.drawImage(labelCanvas, drawX, drawY, drawW, drawH);
      }
    }

    // For landscape (credit-card), rotate the canvas 90° clockwise
    let outputCanvas = canvas;
    if (isLandscape) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = pageHeightPx;
      outputCanvas.height = pageWidthPx;
      const outCtx = outputCanvas.getContext('2d')!;
      outCtx.translate(pageHeightPx, 0);
      outCtx.rotate(Math.PI / 2);
      outCtx.drawImage(canvas, 0, 0);
    }

    // Export as PNG
    const dataUrl = outputCanvas.toDataURL('image/png');

    if (isMobile && preOpenedWindows[pageIdx]) {
      // Write image into the pre-opened tab so user can long-press to save to Photos
      const w = preOpenedWindows[pageIdx]!;
      w.document.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>mdlabels</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#222}img{max-width:100%;height:auto}</style></head><body><img src="${dataUrl}"></body></html>`);
      w.document.close();
    } else {
      // Desktop: direct download
      const fileName = pages.length > 1 ? `mdlabels-page${pageIdx + 1}.png` : 'mdlabels.png';
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    }
  }
}
