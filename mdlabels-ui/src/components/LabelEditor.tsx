import { Show, createSignal, createEffect, on } from 'solid-js';
import { isEditing, closeEditor, editingLabelIndex, pages, currentPageIndex, updateLabel, blackBackground, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor } from '../store/labels';
import type { Label, LabelConfig } from '../types/label';
import { searchMusicBrainz, getArtworkBase64 } from '../lib/api-client';
import type { MBRelease } from '../types/api';
import { renderer } from '../lib/canvas-renderer';

// Utility to convert a File to base64 data URL
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LabelEditor() {
  let previewCanvasRef: HTMLCanvasElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;

  const [searchQuery, setSearchQuery] = createSignal('');
  const [artistSearchQuery, setArtistSearchQuery] = createSignal('');
  const [mbidSearchQuery, setMbidSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<MBRelease[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [hasSearched, setHasSearched] = createSignal(false);
  const [selectedRelease, setSelectedRelease] = createSignal<MBRelease | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);

  // Form fields for manual editing
  const [artist, setArtist] = createSignal('');
  const [album, setAlbum] = createSignal('');
  const [year, setYear] = createSignal('');
  const [mbid, setMbid] = createSignal('');
  const [artworkData, setArtworkData] = createSignal('');
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);

  // Per-label config overrides (empty string = use global)
  const [labelConfigTemplate, setLabelConfigTemplate] = createSignal<string>('');
  const [labelConfigBgColor, setLabelConfigBgColor] = createSignal<string>('');
  const [labelConfigTextColor, setLabelConfigTextColor] = createSignal<string>('');
  const [labelConfigShowInsert, setLabelConfigShowInsert] = createSignal<string>('');

  // Load existing label data when editor opens
  createEffect(() => {
    if (isEditing() && editingLabelIndex() !== null) {
      // Clear search state every time editor opens
      setSearchQuery('');
      setArtistSearchQuery('');
      setMbidSearchQuery('');
      setSearchResults([]);
      setSelectedRelease(null);
      setHasSearched(false);

      const currentLabel = pages[currentPageIndex()].labels[editingLabelIndex()!];
      if (currentLabel) {
        setArtist(currentLabel.artist);
        setAlbum(currentLabel.album);
        setYear(currentLabel.year);
        setMbid(currentLabel.mbid);
        setArtworkData(currentLabel.artworkData);
        setZoom(currentLabel.transform.zoom);
        setPanX(currentLabel.transform.panX);
        setPanY(currentLabel.transform.panY);
        // Load per-label config overrides
        setLabelConfigTemplate(currentLabel.config?.labelTemplate ?? '');
        setLabelConfigBgColor(currentLabel.config?.cleanBgColor ?? '');
        setLabelConfigTextColor(currentLabel.config?.cleanTextColor ?? '');
        setLabelConfigShowInsert(currentLabel.config?.showInsertThisEnd !== undefined ? (currentLabel.config.showInsertThisEnd ? 'true' : 'false') : '');
      } else {
        // Reset for new label
        setArtist('');
        setAlbum('');
        setYear('');
        setMbid('');
        setArtworkData('');
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setLabelConfigTemplate('');
        setLabelConfigBgColor('');
        setLabelConfigTextColor('');
        setLabelConfigShowInsert('');
      }
    }
  });

  const handleSearch = async () => {
    // If MusicBrainz ID is provided, search by that directly
    if (mbidSearchQuery().trim()) {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const query = `mbid:${mbidSearchQuery().trim()}`;
        const results = await searchMusicBrainz(query, 10);
        setSearchResults(results.releases || []);
      } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // Otherwise require album name
    if (!searchQuery().trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Build MusicBrainz query with album and optional artist
      let query = `release:"${searchQuery().trim()}"`;
      if (artistSearchQuery().trim()) {
        query += ` AND artist:"${artistSearchQuery().trim()}"`;
      }

      const results = await searchMusicBrainz(query, 10);
      setSearchResults(results.releases || []);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRelease = async (release: MBRelease) => {
    setSelectedRelease(release);
    setArtist(release['artist-credit'][0]?.name || '');
    setAlbum(release.title);
    setMbid(release.id);

    // Extract year from date
    const date = release.date || release['release-events']?.[0]?.date || '';
    const yearMatch = date.match(/^\d{4}/);
    setYear(yearMatch ? yearMatch[0] : '');

    // Fetch artwork as base64 from backend
    try {
      const base64Data = await getArtworkBase64(release.id);
      setArtworkData(base64Data);
    } catch (error) {
      console.error('Failed to load artwork:', error);
      setArtworkData('');
    }
  };

  // Handle file drop for custom artwork
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
          const base64Data = await fileToBase64(file);
          setArtworkData(base64Data);
          // Set a custom mbid to indicate custom artwork
          if (!mbid()) {
            setMbid('custom-' + crypto.randomUUID());
          }
          console.log('Custom artwork uploaded');
        } catch (error) {
          console.error('Failed to load custom artwork:', error);
        }
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearArtwork = () => {
    setArtworkData('');
  };

  const handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
          const base64Data = await fileToBase64(file);
          setArtworkData(base64Data);
          if (!mbid()) {
            setMbid('custom-' + crypto.randomUUID());
          }
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
    }
    // Reset input so same file can be selected again
    input.value = '';
  };

  const openFilePicker = () => {
    fileInputRef?.click();
  };

  const handleSave = () => {
    if (!artist() || !album() || !year()) {
      alert('Please fill in Artist, Album, and Year');
      return;
    }

    if (!artworkData()) {
      alert('Please select an album or drop an image');
      return;
    }

    // Generate mbid if not set (for custom artwork)
    const labelMbid = mbid() || 'custom-' + crypto.randomUUID();

    // Build per-label config (only include fields that are set)
    const config: LabelConfig = {};
    if (labelConfigTemplate()) config.labelTemplate = labelConfigTemplate() as 'original' | 'clean';
    if (labelConfigBgColor()) config.cleanBgColor = labelConfigBgColor();
    if (labelConfigTextColor()) config.cleanTextColor = labelConfigTextColor();
    if (labelConfigShowInsert()) config.showInsertThisEnd = labelConfigShowInsert() === 'true';

    const newLabel: Label = {
      id: crypto.randomUUID(),
      artist: artist(),
      album: album(),
      year: year(),
      mbid: labelMbid,
      artworkData: artworkData(),
      transform: {
        zoom: zoom(),
        panX: panX(),
        panY: panY()
      },
      ...(Object.keys(config).length > 0 ? { config } : {})
    };

    updateLabel(currentPageIndex(), editingLabelIndex()!, newLabel);
    closeEditor();
  };

  const getArtistName = (release: MBRelease) => {
    return release['artist-credit']?.[0]?.name || 'Unknown Artist';
  };

  const getYear = (release: MBRelease) => {
    const date = release.date || release['release-events']?.[0]?.date || '';
    const yearMatch = date.match(/^\d{4}/);
    return yearMatch ? yearMatch[0] : '';
  };

  const getThumbnailUrl = (mbid: string) => {
    return `https://coverartarchive.org/release/${mbid}/front-250`;
  };

  // Resolve effective config values: per-label override or global default
  const effectiveTemplate = () => (labelConfigTemplate() || labelTemplate()) as 'original' | 'clean';
  const effectiveBgColor = () => labelConfigBgColor() || cleanBgColor();
  const effectiveTextColor = () => labelConfigTextColor() || cleanTextColor();
  const effectiveShowInsert = () => labelConfigShowInsert() ? labelConfigShowInsert() === 'true' : showInsertThisEnd();

  // Update preview when any value changes
  createEffect(
    on(
      [isEditing, artist, album, year, artworkData, zoom, panX, panY, blackBackground, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor, labelConfigTemplate, labelConfigBgColor, labelConfigTextColor, labelConfigShowInsert],
      () => {
        const artworkVal = artworkData();

        // Only require artwork to render preview
        if (!previewCanvasRef || !artworkVal) {
          return;
        }

        const previewLabel: Label = {
          id: 'preview',
          artist: artist(),
          album: album(),
          year: year(),
          mbid: mbid() || 'preview',
          artworkData: artworkVal,
          transform: {
            zoom: zoom(),
            panX: panX(),
            panY: panY()
          }
        };

        renderer.renderLabel(previewLabel, previewCanvasRef, blackBackground(), effectiveShowInsert(), effectiveTemplate(), effectiveBgColor(), effectiveTextColor())
          .catch((error) => console.error('Failed to render preview:', error));
      }
    )
  );

  return (
    <Show when={isEditing()}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
        <div class="bg-white md:rounded-lg shadow-xl max-w-6xl w-full h-[100vh] md:h-auto md:max-h-[90vh] flex flex-col">
          <div class="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div class="flex justify-between items-center p-2 md:p-4 border-b">
              <h2 class="text-lg md:text-2xl font-bold text-gray-800">Edit Label</h2>
              <button
                onClick={closeEditor}
                class="text-gray-500 hover:text-gray-700 text-2xl md:text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Two Column Layout */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 flex-1 overflow-y-auto p-2 md:p-4">
              {/* Left Column - Preview & Transform */}
              <div class="flex flex-col items-center justify-start">
                <div
                  class={`p-2 md:p-6 flex flex-col items-center justify-center min-h-[200px] md:min-h-[400px] relative ${
                    isDragging() ? 'bg-blue-50' : ''
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    class="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Placeholder when no artwork */}
                  <Show when={!artworkData()}>
                    <div
                      class={`text-gray-500 text-center border-2 border-dashed rounded-lg p-6 md:p-8 cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors ${
                        isDragging() ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={openFilePicker}
                    >
                      <p class="mb-1 md:mb-2 text-sm md:text-base">No preview available</p>
                      <p class="text-xs md:text-sm">Search and select an album</p>
                      <p class="text-xs md:text-sm mt-2 font-medium">or click/drop an image here</p>
                    </div>
                  </Show>

                  {/* Canvas preview - shown when artwork exists */}
                  <div
                    class="flex flex-col items-center"
                    style={{ display: artworkData() ? 'flex' : 'none' }}
                  >
                    <canvas
                      ref={previewCanvasRef}
                      class="shadow-lg bg-white"
                      style={{ width: '200px', height: 'auto' }}
                    />
                    <button
                      onClick={clearArtwork}
                      class="mt-3 px-4 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Clear Image
                    </button>
                  </div>

                  {/* Drop overlay when dragging */}
                  <Show when={isDragging()}>
                    <div class="absolute inset-0 bg-blue-100 bg-opacity-80 flex items-center justify-center rounded-lg pointer-events-none">
                      <p class="text-blue-600 font-semibold">Drop image here</p>
                    </div>
                  </Show>
                </div>

                {/* Transform Controls */}
                <div class="mb-3 md:mb-6 w-full px-2 md:px-6">
                  <h3 class="text-base md:text-lg font-semibold mb-2 md:mb-3">Artwork Transform</h3>
                  <div class="space-y-2 md:space-y-4">
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                        Zoom: {zoom().toFixed(2)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={zoom()}
                        onInput={(e) => setZoom(parseFloat(e.currentTarget.value))}
                        class="w-full"
                      />
                    </div>
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                        Pan X: {panX()}px
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={panX()}
                        onInput={(e) => setPanX(parseInt(e.currentTarget.value))}
                        class="w-full"
                      />
                    </div>
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                        Pan Y: {panY()}px
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={panY()}
                        onInput={(e) => setPanY(parseInt(e.currentTarget.value))}
                        class="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div class="p-1 md:p-2">
                {/* Search Section */}
                <div class="mb-3 md:mb-6">
                  <h3 class="text-base md:text-lg font-semibold mb-2 md:mb-3">Search MusicBrainz</h3>
                  <div class="space-y-2">
                    <input
                      type="text"
                      value={searchQuery()}
                      onInput={(e) => setSearchQuery(e.currentTarget.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Album name..."
                      class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={artistSearchQuery()}
                      onInput={(e) => setArtistSearchQuery(e.currentTarget.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Artist name (optional)..."
                      class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div class="flex gap-1 md:gap-2">
                      <input
                        type="text"
                        value={mbidSearchQuery()}
                        onInput={(e) => setMbidSearchQuery(e.currentTarget.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="MusicBrainz ID (optional)..."
                        class="flex-1 px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching()}
                        class="px-2 py-1 md:px-6 md:py-2 text-xs md:text-base bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {isSearching() ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  <Show when={searchResults().length > 0}>
                    <div class="mt-2 md:mt-4 border border-gray-300 rounded-lg max-h-40 md:max-h-48 overflow-y-auto overflow-x-hidden">
                      {searchResults().map((release) => (
                        <div
                          class={`p-2 md:p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex gap-2 md:gap-3 ${
                            selectedRelease()?.id === release.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleSelectRelease(release)}
                        >
                          <img
                            src={getThumbnailUrl(release.id)}
                            alt={release.title}
                            class="w-10 h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                            onError={(e) => {
                              // Hide image if it fails to load (no artwork available)
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div class="flex-1 min-w-0">
                            <div class="font-semibold truncate text-sm md:text-base">{release.title}</div>
                            <div class="text-xs md:text-sm text-gray-600 truncate">
                              {getArtistName(release)} • {getYear(release) || 'Unknown Year'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Show>

                  {/* No Results Message */}
                  <Show when={hasSearched() && !isSearching() && searchResults().length === 0}>
                    <div class="mt-2 md:mt-4 p-2 md:p-4 border border-gray-300 rounded-lg bg-gray-50 text-center text-gray-600 text-sm md:text-base">
                      No results found. Try a different search term.
                    </div>
                  </Show>
                </div>

                {/* Manual Edit Fields */}
                <div class="mb-3 md:mb-6">
                  <h3 class="text-base md:text-lg font-semibold mb-2 md:mb-3">Label Details</h3>
                  <div class="space-y-2 md:space-y-4">
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Artist</label>
                      <input
                        type="text"
                        value={artist()}
                        onInput={(e) => setArtist(e.currentTarget.value)}
                        class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Album</label>
                      <input
                        type="text"
                        value={album()}
                        onInput={(e) => setAlbum(e.currentTarget.value)}
                        class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="text"
                        value={year()}
                        onInput={(e) => setYear(e.currentTarget.value)}
                        class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Per-Label Configuration */}
                <div class="mb-3 md:mb-6">
                  <div class="flex items-center justify-between mb-2 md:mb-3">
                    <h3 class="text-base md:text-lg font-semibold">Label Configuration</h3>
                    <Show when={labelConfigTemplate() || labelConfigBgColor() || labelConfigTextColor() || labelConfigShowInsert()}>
                      <button
                        onClick={() => {
                          setLabelConfigTemplate('');
                          setLabelConfigBgColor('');
                          setLabelConfigTextColor('');
                          setLabelConfigShowInsert('');
                        }}
                        class="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Clear Individual Config
                      </button>
                    </Show>
                  </div>
                  <div class="space-y-2 md:space-y-3">
                    <div>
                      <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Template</label>
                      <select
                        value={labelConfigTemplate()}
                        onChange={(e) => setLabelConfigTemplate(e.currentTarget.value)}
                        class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Use Global ({labelTemplate() === 'original' ? 'Original Label' : 'Clean Label'})</option>
                        <option value="original">Original Label</option>
                        <option value="clean">Clean Label</option>
                      </select>
                    </div>

                    <Show when={effectiveTemplate() === 'clean'}>
                      <div class="flex gap-2 md:gap-4">
                        <div class="flex-1">
                          <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Background Color</label>
                          <div class="flex items-center gap-2">
                            <input
                              type="color"
                              value={labelConfigBgColor() || cleanBgColor()}
                              onInput={(e) => setLabelConfigBgColor(e.currentTarget.value)}
                              class="w-8 h-8 cursor-pointer border-0 p-0"
                            />
                            <Show when={labelConfigBgColor()}>
                              <button
                                onClick={() => setLabelConfigBgColor('')}
                                class="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                Use Global
                              </button>
                            </Show>
                          </div>
                        </div>
                        <div class="flex-1">
                          <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">Text Color</label>
                          <div class="flex items-center gap-2">
                            <input
                              type="color"
                              value={labelConfigTextColor() || cleanTextColor()}
                              onInput={(e) => setLabelConfigTextColor(e.currentTarget.value)}
                              class="w-8 h-8 cursor-pointer border-0 p-0"
                            />
                            <Show when={labelConfigTextColor()}>
                              <button
                                onClick={() => setLabelConfigTextColor('')}
                                class="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                Use Global
                              </button>
                            </Show>
                          </div>
                        </div>
                      </div>
                    </Show>

                    <Show when={effectiveTemplate() === 'original'}>
                      <div>
                        <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1">INSERT THIS END</label>
                        <select
                          value={labelConfigShowInsert()}
                          onChange={(e) => setLabelConfigShowInsert(e.currentTarget.value)}
                          class="w-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Use Global ({showInsertThisEnd() ? 'Shown' : 'Hidden'})</option>
                          <option value="true">Show</option>
                          <option value="false">Hide</option>
                        </select>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="flex gap-1 md:gap-4 justify-end p-2 md:p-4 border-t">
              <button
                onClick={closeEditor}
                class="px-2 py-1 md:px-6 md:py-2 text-xs md:text-base bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                class="px-2 py-1 md:px-6 md:py-2 text-xs md:text-base bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Label
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
