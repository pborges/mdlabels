// MusicBrainz API response types
export interface MBSearchResult {
  releases: MBRelease[];
  count: number;
}

export interface MBRelease {
  id: string;
  title: string;
  'artist-credit': Array<{
    name: string;
    artist: { name: string };
  }>;
  date?: string;
  'release-events'?: Array<{
    date: string;
  }>;
  score: number;
}

// Cover Art Archive response
export interface CAAResponse {
  images: Array<{
    id: string;
    image: string;
    thumbnails: {
      small: string;
      large: string;
      '250': string;
      '500': string;
      '1200': string;
    };
    types: string[];
    front: boolean;
  }>;
}
