import type { Page, Label } from '../types/label';
import type { PaperSize } from './constants';

const STORAGE_KEY = 'mdlabels_data';
const CONFIG_STORAGE_KEY = 'mdlabels_config';
const STORAGE_VERSION = 2; // Bumped to 2 for artworkData migration

const DB_NAME = 'mdlabels';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

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
      return {
        id: label.id,
        artist: label.artist,
        album: label.album,
        year: label.year,
        mbid: label.mbid,
        artworkData: '',
        transform: label.transform
      } as Label;
    })
  }));
}

// --- IndexedDB helpers ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function idbDelete(key: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// --- Public API (async, IndexedDB-backed) ---

export async function saveToStorage(pages: Page[]): Promise<void> {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      pages,
      savedAt: new Date().toISOString()
    };
    await idbSet(STORAGE_KEY, data);
  } catch (e) {
    console.error('Failed to save to IndexedDB:', e);
  }
}

export async function loadFromStorage(): Promise<Page[] | null> {
  try {
    // Try IndexedDB first
    const idbData = await idbGet<StorageData>(STORAGE_KEY);
    if (idbData) {
      if (idbData.version === 1) {
        const migratedPages = migrateV1ToV2(idbData.pages as any);
        await saveToStorage(migratedPages);
        return migratedPages;
      }
      if (idbData.version !== STORAGE_VERSION) return null;
      return idbData.pages;
    }

    // Fall back to localStorage for migration
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    let pages: Page[];

    if (data.version === 1) {
      pages = migrateV1ToV2(data.pages);
    } else if (data.version === STORAGE_VERSION) {
      pages = data.pages;
    } else {
      return null;
    }

    // Migrate to IndexedDB and remove localStorage copy
    await saveToStorage(pages);
    localStorage.removeItem(STORAGE_KEY);
    console.log('Migrated page data from localStorage to IndexedDB');
    return pages;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

export async function clearStorage(): Promise<void> {
  await idbDelete(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

// --- Config stays in localStorage (tiny, sync) ---

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
