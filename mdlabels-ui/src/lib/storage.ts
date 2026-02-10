import type { Page, Label } from '../types/label';
import type { PaperSize } from './constants';

const STORAGE_KEY = 'mdlabels_data';
const CONFIG_STORAGE_KEY = 'mdlabels_config';
const STORAGE_VERSION = 2; // Bumped to 2 for artworkData migration

interface StorageData {
  version: number;
  pages: Page[];
  savedAt: string;
}

export interface GlobalConfig {
  blackBackground: boolean;
  showInsertThisEnd: boolean;
  paperSize: PaperSize;
  labelTemplate: 'original' | 'clean';
  cleanBgColor: string;
  cleanTextColor: string;
}

// Old label type for migration
interface OldLabel {
  id: string;
  artist: string;
  album: string;
  year: string;
  mbid: string;
  artworkUrl: string;
  transform: { zoom: number; panX: number; panY: number };
}

function migrateV1ToV2(pages: { id: string; labels: (OldLabel | null)[] }[]): Page[] {
  return pages.map(page => ({
    id: page.id,
    labels: page.labels.map(label => {
      if (!label) return null;
      // Convert old artworkUrl to artworkData (will be empty, user needs to re-select)
      return {
        id: label.id,
        artist: label.artist,
        album: label.album,
        year: label.year,
        mbid: label.mbid,
        artworkData: '', // Old URLs won't work, user needs to re-select album
        transform: label.transform
      } as Label;
    })
  }));
}

export function saveToStorage(pages: Page[]): void {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      pages,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function loadFromStorage(): Page[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);

    // Handle migration from v1 to v2
    if (data.version === 1) {
      console.log('Migrating storage from v1 to v2...');
      const migratedPages = migrateV1ToV2(data.pages);
      // Save migrated data
      saveToStorage(migratedPages);
      return migratedPages;
    }

    if (data.version !== STORAGE_VERSION) {
      // Unknown version, start fresh
      return null;
    }

    return data.pages;
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveConfigToStorage(config: GlobalConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config to localStorage:', e);
  }
}

export function loadConfigFromStorage(): GlobalConfig | null {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load config from localStorage:', e);
    return null;
  }
}
