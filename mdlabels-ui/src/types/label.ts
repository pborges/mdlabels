export interface LabelTransform {
  zoom: number;  // 1.0 = 100%
  panX: number;  // pixels
  panY: number;  // pixels
}

export interface Label {
  id: string;
  artist: string;
  album: string;
  year: string;
  mbid: string;
  artworkData: string; // Base64 data URL of the artwork image
  transform: LabelTransform;
}

export interface Page {
  id: string;
  labels: (Label | null)[]; // 20 slots (5x4 grid)
}
