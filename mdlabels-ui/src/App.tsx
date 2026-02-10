import { onMount, createSignal, Show } from 'solid-js';
import { renderer } from './lib/canvas-renderer';
import { pages, currentPageIndex, initializeStore, storageReady } from './store/labels';
import LabelGrid from './components/LabelGrid';
import GlobalControls from './components/GlobalControls';
import LabelEditor from './components/LabelEditor';
import ChangelogModal from './components/ChangelogModal';

function App() {
  const [showChangelog, setShowChangelog] = createSignal(false);

  onMount(async () => {
    await Promise.all([
      renderer.init(),
      initializeStore()
    ]);
  });

  return (
    <div class="min-h-screen bg-gray-100 p-2 md:p-8 flex flex-col">
      <header class="mb-3 md:mb-8">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl md:text-4xl font-bold text-gray-800">MiniDisc Labels</h1>
          <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-mono">
            v{__APP_VERSION__}
          </span>
        </div>
      </header>

      <Show when={storageReady()} fallback={
        <div class="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      }>
        <GlobalControls />

        <div class="my-3 md:my-6 flex-1">
          <LabelGrid page={pages[currentPageIndex()]} pageIndex={currentPageIndex()} />
        </div>

        <LabelEditor />
      </Show>

      <ChangelogModal isOpen={showChangelog()} onClose={() => setShowChangelog(false)} />

      <footer class="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <a
          href={`https://github.com/pborges/mdlabels/releases/tag/v${__APP_VERSION__}`}
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-gray-700"
        >
          v{__APP_VERSION__}
        </a>
        {' | '}
        <button
          onClick={() => setShowChangelog(true)}
          class="hover:text-gray-700"
        >
          Changelog
        </button>
        {' | '}
        <a
          href="https://github.com/pborges/mdlabels"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-gray-700"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default App;
