import type { Label } from '../types/label';
import {
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  LABEL_HEIGHT_MM,
  DOG_EAR_SIZE,
  TOP_BANNER_HEIGHT,
  BOTTOM_BANNER_HEIGHT,
  MM_TO_PX
} from './constants';

export class LabelRenderer {
  private font?: FontFace;
  private imageCache = new Map<string, HTMLImageElement>();
  private logoImage?: HTMLImageElement;
  async init() {
    try {
      // Load Roboto-Black font
      this.font = new FontFace('Roboto-Black', 'url(/Roboto-Black.ttf)');
      await this.font.load();
      document.fonts.add(this.font);
      console.log('Font loaded successfully');
    } catch (error) {
      console.error('Failed to load font:', error);
    }

    try {
      // Load MiniDisc logo
      this.logoImage = await this.loadImage('/mini-disc-logo.png');
      console.log('Logo loaded successfully');
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  }

  async renderLabel(label: Label, canvas: HTMLCanvasElement, useBlackBackground: boolean = false, showInsertThisEnd: boolean = true, labelTemplate: 'original' | 'clean' = 'original', cleanBgColor: string = '#000000', cleanTextColor: string = '#ffffff'): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Set canvas size to high DPI
    canvas.width = LABEL_WIDTH_PX;
    canvas.height = LABEL_HEIGHT_PX;

    // Clear canvas with white or black background
    ctx.fillStyle = useBlackBackground ? 'black' : 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (labelTemplate === 'clean') {
      // Clean template: no top banner, artwork at top, larger bottom banner
      const cleanBottomBannerHeight = 16; // mm
      await this.drawArtwork(ctx, label, 0, LABEL_HEIGHT_MM - cleanBottomBannerHeight);
      this.drawBottomBanner(ctx, label, cleanBottomBannerHeight, cleanBgColor, cleanTextColor, 2.2, 3.5);
      this.drawRoundedCorners(ctx, useBlackBackground);
      this.drawDogEar(ctx, useBlackBackground);
    } else {
      // Original template
      await this.drawArtwork(ctx, label);
      this.drawTopBanner(ctx, showInsertThisEnd);
      this.drawBottomBanner(ctx, label);
      this.drawDogEar(ctx, useBlackBackground);
    }
  }

  private async drawArtwork(ctx: CanvasRenderingContext2D, label: Label, artworkYMm?: number, artworkHeightMm?: number) {
    const artworkY = (artworkYMm ?? TOP_BANNER_HEIGHT) * MM_TO_PX;
    const artworkHeight = (artworkHeightMm ?? (LABEL_HEIGHT_MM - TOP_BANNER_HEIGHT - BOTTOM_BANNER_HEIGHT)) * MM_TO_PX;

    try {
      const img = await this.loadImage(label.artworkData);

      ctx.save();

      // Create clipping region for artwork area
      ctx.beginPath();
      ctx.rect(0, artworkY, LABEL_WIDTH_PX, artworkHeight);
      ctx.clip();

      // Apply zoom and pan transform
      const centerX = LABEL_WIDTH_PX / 2;
      const centerY = artworkY + artworkHeight / 2;

      ctx.translate(centerX, centerY);
      ctx.scale(label.transform.zoom, label.transform.zoom);
      ctx.translate(-centerX + label.transform.panX, -centerY + label.transform.panY);

      // Draw image to fill artwork area (maintain aspect ratio)
      this.drawImageCover(ctx, img, 0, artworkY, LABEL_WIDTH_PX, artworkHeight);

      ctx.restore();
    } catch (error) {
      console.error('Failed to draw artwork:', error);
      // Draw placeholder for missing artwork
      ctx.fillStyle = '#ddd';
      ctx.fillRect(0, artworkY, LABEL_WIDTH_PX, artworkHeight);
    }
  }

  private drawTopBanner(ctx: CanvasRenderingContext2D, showInsertThisEnd: boolean = true) {
    const bannerHeight = TOP_BANNER_HEIGHT * MM_TO_PX;

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LABEL_WIDTH_PX, bannerHeight);

    // Draw MiniDisc logo on right side (no padding - image has its own margin)
    if (this.logoImage) {
      const logoHeight = bannerHeight;
      const logoWidth = (this.logoImage.width / this.logoImage.height) * logoHeight;
      const logoX = LABEL_WIDTH_PX - logoWidth - 4; // Move 4px to the left
      const logoY = 0;

      ctx.drawImage(this.logoImage, logoX, logoY, logoWidth, logoHeight);
    }

    // Add triangle on left (always shown)
    ctx.save();
    ctx.fillStyle = '#fff';

    // Draw custom triangle with wider base
    const triangleX = 2 * MM_TO_PX;
    const triangleY = bannerHeight / 2;
    const triangleHeight = 2 * MM_TO_PX;
    const triangleBase = 3 * MM_TO_PX; // Wider base

    ctx.beginPath();
    ctx.moveTo(triangleX + triangleBase / 2, triangleY - triangleHeight / 2); // Top point
    ctx.lineTo(triangleX, triangleY + triangleHeight / 2); // Bottom left
    ctx.lineTo(triangleX + triangleBase, triangleY + triangleHeight / 2); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Draw "INSERT THIS END" text (if enabled)
    if (showInsertThisEnd) {
      ctx.font = `${2.5 * MM_TO_PX}px 'Roboto-Black', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('INSERT THIS END', triangleX + triangleBase + 1 * MM_TO_PX, bannerHeight / 2);
    }
    ctx.restore();
  }

  private drawBottomBanner(ctx: CanvasRenderingContext2D, label: Label, bannerHeightMm?: number, bgColor: string = '#000', textColor: string = '#fff', textOffsetMm: number = 1.2, maxFontSizeMm: number = 2.8) {
    const bannerHeight = (bannerHeightMm ?? BOTTOM_BANNER_HEIGHT) * MM_TO_PX;
    const bannerY = LABEL_HEIGHT_PX - bannerHeight;

    // Banner background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, bannerY, LABEL_WIDTH_PX, bannerHeight);

    // Text (all caps, Roboto-Black)
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const textX = 2 * MM_TO_PX;
    const maxWidth = LABEL_WIDTH_PX - 4 * MM_TO_PX;

    const album = label.album.toUpperCase();
    const artist = label.artist.toUpperCase();
    const year = label.year;

    // Calculate individual font sizes for album and artist
    const albumFontSize = this.calculateOptimalFontSize(ctx, [album], maxWidth, maxFontSizeMm * MM_TO_PX, 1.5 * MM_TO_PX);
    const artistFontSize = this.calculateOptimalFontSize(ctx, [artist], maxWidth, maxFontSizeMm * MM_TO_PX, 1.5 * MM_TO_PX);
    const yearFontSize = maxFontSizeMm * MM_TO_PX; // Fixed size for year

    const startY = bannerY + textOffsetMm * MM_TO_PX - 5;

    // Draw album
    ctx.font = `${albumFontSize}px 'Roboto-Black', sans-serif`;
    ctx.fillText(album, textX, startY);

    // Draw artist
    const artistY = startY + albumFontSize * 1.1;
    ctx.font = `${artistFontSize}px 'Roboto-Black', sans-serif`;
    ctx.fillText(artist, textX, artistY);

    // Draw year (fixed size)
    const yearY = artistY + artistFontSize * 1.1;
    ctx.font = `${yearFontSize}px 'Roboto-Black', sans-serif`;
    ctx.fillText(year, textX, yearY);
  }

  private calculateOptimalFontSize(
    ctx: CanvasRenderingContext2D,
    texts: string[],
    maxWidth: number,
    maxFontSize: number,
    minFontSize: number
  ): number {
    let fontSize = maxFontSize;

    // Try decreasing font size until all texts fit
    while (fontSize >= minFontSize) {
      ctx.font = `${fontSize}px 'Roboto-Black', sans-serif`;

      // Check if all texts fit at this size
      const allFit = texts.every(text => {
        const metrics = ctx.measureText(text);
        return metrics.width <= maxWidth;
      });

      if (allFit) {
        return fontSize;
      }

      fontSize -= 0.5; // Decrease by 0.5px increments
    }

    return minFontSize;
  }

  private drawDogEar(ctx: CanvasRenderingContext2D, useBlackBackground: boolean = false) {
    const size = DOG_EAR_SIZE * MM_TO_PX;

    ctx.save();
    ctx.fillStyle = useBlackBackground ? '#000' : '#fff';

    // Draw a triangle to cut off the top-left corner (2.5mm on each axis)
    ctx.beginPath();
    ctx.moveTo(0, 0); // Top-left corner
    ctx.lineTo(size, 0); // 2.5mm to the right
    ctx.lineTo(0, size); // 2.5mm down
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawRoundedCorners(ctx: CanvasRenderingContext2D, useBlackBackground: boolean) {
    const r = (DOG_EAR_SIZE / 2) * MM_TO_PX; // 1.25mm radius

    ctx.save();
    ctx.fillStyle = useBlackBackground ? '#000' : '#fff';

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH_PX, 0);
    ctx.lineTo(LABEL_WIDTH_PX - r, 0);
    ctx.arc(LABEL_WIDTH_PX - r, r, r, -Math.PI / 2, 0, false);
    ctx.lineTo(LABEL_WIDTH_PX, 0);
    ctx.fill();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(0, LABEL_HEIGHT_PX);
    ctx.lineTo(0, LABEL_HEIGHT_PX - r);
    ctx.arc(r, LABEL_HEIGHT_PX - r, r, Math.PI, Math.PI / 2, true);
    ctx.lineTo(0, LABEL_HEIGHT_PX);
    ctx.fill();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    ctx.lineTo(LABEL_WIDTH_PX, LABEL_HEIGHT_PX - r);
    ctx.arc(LABEL_WIDTH_PX - r, LABEL_HEIGHT_PX - r, r, 0, Math.PI / 2, false);
    ctx.lineTo(LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    ctx.fill();

    ctx.restore();
  }

  // Utility: Draw image to cover area (like CSS object-fit: cover)
  private drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const imgRatio = img.width / img.height;
    const areaRatio = width / height;

    let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

    if (imgRatio > areaRatio) {
      // Image is wider than area
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      // Image is taller than area
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
  }

  // Utility: Load image with caching
  private async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      // Only set crossOrigin for external URLs
      if (url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = (e) => {
        console.error('Image load error:', e, 'URL:', url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }

  // Clear image cache
  clearCache() {
    this.imageCache.clear();
  }
}

// Singleton instance
export const renderer = new LabelRenderer();
