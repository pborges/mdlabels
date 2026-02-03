import { pages, currentPageIndex, setCurrentPageIndex } from '../store/labels';
import { For } from 'solid-js';

export default function PageControls() {
  return (
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
  );
}
