import { createStore, reconcile } from 'solid-js/store';
import { createSignal, createEffect } from 'solid-js';
import type { Page, Label } from '../types/label';
import { LABELS_PER_PAGE, type PaperSize } from '../lib/constants';
import { saveToStorage, loadFromStorage, saveConfigToStorage, loadConfigFromStorage } from '../lib/storage';
import { generateUUID } from '../lib/uuid';

// Create initial empty page
function createEmptyPage(): Page {
  return {
    id: generateUUID(),
    labels: Array(LABELS_PER_PAGE).fill(null)
  };
}

// Initialize config from localStorage or use defaults (sync, small data)
const initialConfig = loadConfigFromStorage() || {
  blackBackground: false,
  showInsertThisEnd: true,
  paperSize: 'letter' as const,
  labelTemplate: 'original' as const,
  cleanBgColor: '#000000',
  cleanTextColor: '#ffffff',
  oversized: false
};

// Start with an empty page; real data loaded async via initializeStore()
export const [pages, setPages] = createStore<Page[]>([createEmptyPage()]);
export const [currentPageIndex, setCurrentPageIndex] = createSignal(0);

// Storage readiness signal
const [_storageReady, _setStorageReady] = createSignal(false);
export const storageReady = _storageReady;

// Editor state
export const [isEditing, setIsEditing] = createSignal(false);
export const [editingLabelIndex, setEditingLabelIndex] = createSignal<number | null>(null);

// UI state
export const [blackBackground, setBlackBackground] = createSignal(initialConfig.blackBackground);
export const [paperSize, setPaperSize] = createSignal<PaperSize>(initialConfig.paperSize);
export const [showInsertThisEnd, setShowInsertThisEnd] = createSignal(initialConfig.showInsertThisEnd);
export const [labelTemplate, setLabelTemplate] = createSignal<'original' | 'clean'>(initialConfig.labelTemplate ?? 'original');
export const [cleanBgColor, setCleanBgColor] = createSignal(initialConfig.cleanBgColor ?? '#000000');
export const [cleanTextColor, setCleanTextColor] = createSignal(initialConfig.cleanTextColor ?? '#ffffff');
export const [oversized, setOversized] = createSignal(initialConfig.oversized ?? false);

// Async initialization — loads pages from IndexedDB
export async function initializeStore(): Promise<void> {
  const loaded = await loadFromStorage();
  if (loaded && loaded.length > 0) {
    setPages(reconcile(loaded));
  }
  _setStorageReady(true);
}

// Actions
export function addPage() {
  const newPageIndex = pages.length; // Index of the page we're about to add
  setPages([...pages, createEmptyPage()]);
  setCurrentPageIndex(newPageIndex); // Switch to new page
}

export function deletePage(index: number) {
  if (pages.length === 1) return; // Keep at least one page

  // Convert store to array, filter, then set back
  const pagesArray = [...pages];
  const newPages = pagesArray.filter((_, i) => i !== index);

  // Update current page index before setting pages
  const current = currentPageIndex();
  if (current > index) {
    // Deleted a page before current - shift index down by 1
    setCurrentPageIndex(current - 1);
  } else if (current === index) {
    // Deleted the current page - stay at same index unless it's now out of bounds
    if (current >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1);
    }
  }

  // Set the new pages array
  setPages(newPages);
}

export function clearAll() {
  setPages([createEmptyPage()]);
  setCurrentPageIndex(0);
}

export function clearPage(index: number) {
  setPages(index, 'labels', Array(LABELS_PER_PAGE).fill(null));
}

export function updateLabel(pageIndex: number, labelIndex: number, label: Label | null) {
  setPages(pageIndex, 'labels', labelIndex, label);
}

export function openEditor(labelIndex: number) {
  setEditingLabelIndex(labelIndex);
  setIsEditing(true);
}

export function closeEditor() {
  setIsEditing(false);
  setEditingLabelIndex(null);
}

// Auto-save to IndexedDB on changes (debounced, guarded by storageReady)
let saveTimer: ReturnType<typeof setTimeout> | undefined;
createEffect(() => {
  const serialized = JSON.stringify(pages);
  if (!storageReady()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToStorage(JSON.parse(serialized));
  }, 500);
});

// Auto-save config to localStorage on changes
createEffect(() => {
  saveConfigToStorage({
    blackBackground: blackBackground(),
    showInsertThisEnd: showInsertThisEnd(),
    paperSize: paperSize(),
    labelTemplate: labelTemplate(),
    cleanBgColor: cleanBgColor(),
    cleanTextColor: cleanTextColor(),
    oversized: oversized()
  });
});
