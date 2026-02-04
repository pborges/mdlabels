export interface LabelTransform {
  zoom: number;  // 1.0 = 100%
  panX: number;  // pixels
  panY: number;  // pixels
}

export interface LabelConfig {
  labelTemplate?: 'original' | 'clean';
  cleanBgColor?: string;
  cleanTextColor?: string;
  showInsertThisEnd?: boolean;
}

export interface Label {
  id: string;
  artist: string;
  album: string;
  year: string;
  mbid: string;
  artworkData: string; // Base64 data URL of the artwork image
  transform: LabelTransform;
  config?: LabelConfig;
}

export interface Page {
  id: string;
  labels: (Label | null)[]; // 20 slots (5x4 grid)
}
