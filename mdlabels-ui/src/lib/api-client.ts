import type { MBSearchResult } from '../types/api';

// In dev mode, Vite proxy handles routing to localhost:8080
// In production, API is served from same origin
const API_BASE = '';

export async function searchMusicBrainz(query: string, limit = 10): Promise<MBSearchResult> {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getArtworkBase64(mbid: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/artwork/${mbid}/base64`);
  if (!res.ok) throw new Error('Failed to fetch artwork');
  const data = await res.json();
  return data.artworkData || '';
}
