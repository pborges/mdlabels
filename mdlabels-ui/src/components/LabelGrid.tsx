import { For } from 'solid-js';
import type { Page } from '../types/label';
import { ROWS_PER_SHEET, COLS_PER_SHEET } from '../lib/constants';
import { openEditor, blackBackground } from '../store/labels';
import LabelCell from './LabelCell';

interface LabelGridProps {
  page: Page;
  pageIndex: number;
}

export default function LabelGrid(props: LabelGridProps) {
  const handleCellClick = (labelIndex: number) => {
    openEditor(labelIndex);
  };

  return (
    <div class={`${blackBackground() ? 'bg-black' : 'bg-white'} p-2 md:p-8 rounded-lg shadow-lg max-w-[850px] mx-auto`}>
      <div
        class="grid gap-2 md:gap-4"
        style={{
          "grid-template-columns": `repeat(${COLS_PER_SHEET}, 1fr)`,
          "grid-template-rows": `repeat(${ROWS_PER_SHEET}, 1fr)`,
        }}
      >
        <For each={props.page.labels}>
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
