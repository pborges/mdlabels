import { For } from 'solid-js';
import type { Page } from '../types/label';
import { PAPER_CONFIGS } from '../lib/constants';
import { openEditor, blackBackground, paperSize } from '../store/labels';
import LabelCell from './LabelCell';

interface LabelGridProps {
  page: Page;
  pageIndex: number;
}

export default function LabelGrid(props: LabelGridProps) {
  const handleCellClick = (labelIndex: number) => {
    openEditor(labelIndex);
  };

  const config = () => PAPER_CONFIGS[paperSize()];
  const visibleCount = () => config().rows * config().cols;

  return (
    <div class={`${blackBackground() ? 'bg-black' : 'bg-white'} p-2 md:p-8 rounded-lg shadow-lg max-w-[850px] mx-auto`}>
      <div
        class="grid gap-2 md:gap-4"
        style={{
          "grid-template-columns": `repeat(${config().cols}, 1fr)`,
          "grid-template-rows": `repeat(${config().rows}, 1fr)`,
        }}
      >
        <For each={props.page.labels.slice(0, visibleCount())}>
          {(label, index) => (
            <LabelCell
              label={label}
              onClick={() => handleCellClick(index())}
            />
          )}
        </For>
      </div>
    </div>
  );
}
