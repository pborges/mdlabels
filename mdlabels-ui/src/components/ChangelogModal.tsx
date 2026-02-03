import { createSignal, createEffect, Show } from 'solid-js';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal(props: ChangelogModalProps) {
  const [changelog, setChangelog] = createSignal<string>('');
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    if (props.isOpen && !changelog()) {
      setLoading(true);
      fetch('/CHANGELOG.md')
        .then(res => res.text())
        .then(text => {
          setChangelog(text);
          setLoading(false);
        })
        .catch(() => {
          setChangelog('Failed to load changelog.');
          setLoading(false);
        });
    }
  });

  const renderMarkdown = (md: string) => {
    // Simple markdown to HTML conversion
    return md
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) {
          return `<h1 class="text-2xl font-bold mb-4">${line.slice(2)}</h1>`;
        }
        if (line.startsWith('## ')) {
          return `<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-800">${line.slice(3)}</h2>`;
        }
        if (line.startsWith('### ')) {
          return `<h3 class="text-lg font-medium mt-4 mb-2 text-gray-700">${line.slice(4)}</h3>`;
        }
        if (line.startsWith('- ')) {
          return `<li class="ml-4 text-gray-600">${line.slice(2)}</li>`;
        }
        if (line.trim() === '') {
          return '<br/>';
        }
        return `<p class="text-gray-600">${line}</p>`;
      })
      .join('');
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          <div class="flex justify-between items-center p-4 border-b">
            <h2 class="text-xl font-bold">Changelog</h2>
            <button
              onClick={props.onClose}
              class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
          <div class="p-4 overflow-y-auto flex-1">
            <Show when={!loading()} fallback={<p class="text-gray-500">Loading...</p>}>
              <div innerHTML={renderMarkdown(changelog())} />
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
