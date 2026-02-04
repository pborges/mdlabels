import { addPage, clearPage, deletePage, currentPageIndex, setCurrentPageIndex, pages, blackBackground, setBlackBackground, paperSize, setPaperSize, setPages, showInsertThisEnd, setShowInsertThisEnd, labelTemplate, setLabelTemplate, cleanBgColor, setCleanBgColor, cleanTextColor, setCleanTextColor, oversized, setOversized } from '../store/labels';
import { createSignal, For, Show } from 'solid-js';
import { generatePDF } from '../lib/pdf-generator';
import { generateCutSVG } from '../lib/svg-generator';

export default function GlobalControls() {
  const [isGenerating, setIsGenerating] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const handleClearPage = () => {
    if (confirm('Are you sure you want to clear this page? This cannot be undone.')) {
      clearPage(currentPageIndex());
    }
  };

  const handleDeletePage = () => {
    if (pages.length === 1) {
      alert('Cannot delete the last page');
      return;
    }
    if (confirm('Are you sure you want to delete this page?')) {
      deletePage(currentPageIndex());
    }
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      await generatePDF(pages);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSVG = () => {
    try {
      generateCutSVG();
    } catch (error) {
      console.error('Failed to generate SVG:', error);
      alert('Failed to generate SVG. Please try again.');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(pages, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mdlabels-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export. Please try again.');
    }
  };

  const handleImport = () => {
    fileInputRef?.click();
  };

  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedPages = JSON.parse(content);

        // Basic validation
        if (!Array.isArray(importedPages)) {
          throw new Error('Invalid file format');
        }

        if (confirm('This will replace all current pages. Continue?')) {
          setPages(importedPages);
        }
      } catch (error) {
        console.error('Failed to import:', error);
        alert('Failed to import file. Please make sure it is a valid mdlabels export file.');
      } finally {
        // Reset file input
        input.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div class="flex flex-col gap-2">
      {/* Page Actions */}
      <div class="flex flex-wrap gap-1 md:gap-2 items-center">
        <button
          onClick={addPage}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Page
        </button>
        <button
          onClick={handleDeletePage}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          disabled={pages.length === 1}
        >
          Delete Page
        </button>
        <button
          onClick={handleClearPage}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Clear Page
        </button>
      </div>

      {/* Download & Export */}
      <div class="flex flex-wrap gap-1 md:gap-2 items-center">
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating()}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {isGenerating() ? 'Generating...' : 'Download PDF'}
        </button>
        <button
          onClick={handleDownloadSVG}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Download Cut SVG
        </button>
        <button
          onClick={handleImport}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Import
        </button>
        <button
          onClick={handleExport}
          class="px-2 py-1 md:px-4 md:py-2 text-xs md:text-base bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Export
        </button>
      </div>

      {/* Global Configuration */}
      <div class="flex flex-wrap gap-1 md:gap-2 items-center bg-gray-200 rounded p-2">
        <span class="text-xs md:text-sm font-semibold text-gray-700 mr-2">Global Configuration:</span>
        <select
          value={labelTemplate()}
          onChange={(e) => setLabelTemplate(e.currentTarget.value as 'original' | 'clean')}
          class="px-2 md:px-3 h-6 md:h-8 text-xs md:text-base bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="original">Original</option>
          <option value="clean">Clean</option>
        </select>
        <select
          value={paperSize()}
          onChange={(e) => setPaperSize(e.currentTarget.value as 'letter' | 'a4')}
          class="px-2 md:px-3 h-6 md:h-8 text-xs md:text-base bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="letter">US Letter</option>
          <option value="a4">A4</option>
        </select>
        <label class="flex items-center gap-2 px-2 md:px-3 h-6 md:h-8 bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={blackBackground()}
            onChange={(e) => setBlackBackground(e.currentTarget.checked)}
            class="w-4 h-4 cursor-pointer"
          />
          <span class="text-xs md:text-base">Black Background</span>
        </label>
        <label class="flex items-center gap-2 px-2 md:px-3 h-6 md:h-8 bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={oversized()}
            onChange={(e) => setOversized(e.currentTarget.checked)}
            class="w-4 h-4 cursor-pointer"
          />
          <span class="text-xs md:text-base">Slightly Oversized</span>
        </label>
      </div>

      {/* Label Configuration */}
      <div class="flex flex-wrap gap-1 md:gap-2 items-center bg-gray-200 rounded p-2">
        <span class="text-xs md:text-sm font-semibold text-gray-700 mr-2">Label Configuration:</span>
        <Show when={labelTemplate() === 'original'}>
          <label class="flex items-center gap-2 px-2 md:px-3 h-6 md:h-8 bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={showInsertThisEnd()}
              onChange={(e) => setShowInsertThisEnd(e.currentTarget.checked)}
              class="w-4 h-4 cursor-pointer"
            />
            <span class="text-xs md:text-base">INSERT THIS END</span>
          </label>
        </Show>
        <Show when={labelTemplate() === 'clean'}>
          <label class="flex items-center gap-2 px-2 md:px-3 h-6 md:h-8 bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="color"
              value={cleanBgColor()}
              onInput={(e) => setCleanBgColor(e.currentTarget.value)}
              class="w-5 h-5 cursor-pointer border-0 p-0"
            />
            <span class="text-xs md:text-base">Background</span>
          </label>
          <label class="flex items-center gap-2 px-2 md:px-3 h-6 md:h-8 bg-white rounded cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="color"
              value={cleanTextColor()}
              onInput={(e) => setCleanTextColor(e.currentTarget.value)}
              class="w-5 h-5 cursor-pointer border-0 p-0"
            />
            <span class="text-xs md:text-base">Text</span>
          </label>
        </Show>
      </div>

      {/* Page Numbers */}
      <div class="flex gap-1 md:gap-2 flex-wrap">
        <For each={pages}>
          {(_, index) => (
            <button
              onClick={() => setCurrentPageIndex(index())}
              class={`px-2 py-1 md:px-4 md:py-2 text-xs md:text-base rounded transition-colors ${
                currentPageIndex() === index()
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Page {index() + 1}
            </button>
          )}
        </For>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        class="hidden"
      />
    </div>
  );
}
