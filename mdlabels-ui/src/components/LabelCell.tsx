import { createEffect } from 'solid-js';
import type { Label } from '../types/label';
import { renderer } from '../lib/canvas-renderer';
import { blackBackground, showInsertThisEnd, labelTemplate, cleanBgColor, cleanTextColor } from '../store/labels';

interface LabelCellProps {
  label: Label | null;
  onClick: () => void;
}

export default function LabelCell(props: LabelCellProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(async () => {
    if (canvasRef && props.label) {
      // Access transform properties so SolidJS tracks them as dependencies
      const _zoom = props.label.transform?.zoom;
      const _panX = props.label.transform?.panX;
      const _panY = props.label.transform?.panY;
      try {
        const effTemplate = (props.label.config?.labelTemplate ?? labelTemplate()) as 'original' | 'clean';
        const effBgColor = props.label.config?.cleanBgColor ?? cleanBgColor();
        const effTextColor = props.label.config?.cleanTextColor ?? cleanTextColor();
        const effShowInsert = props.label.config?.showInsertThisEnd ?? showInsertThisEnd();
        await renderer.renderLabel(props.label, canvasRef, blackBackground(), effShowInsert, effTemplate, effBgColor, effTextColor);
      } catch (error) {
        console.error('Error rendering label:', error);
      }
    } else if (canvasRef && !props.label) {
      // Clear canvas if no label
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
      }
    }
  });

  return (
    <div
      class={`cursor-pointer transition-colors overflow-hidden aspect-[38/54] flex items-center justify-center ${
        props.label
          ? 'bg-white hover:opacity-90'
          : 'bg-gray-100 border-2 border-gray-300 hover:border-blue-500 rounded-lg'
      }`}
      onClick={props.onClick}
    >
      {props.label ? (
        <canvas
          ref={canvasRef}
          class="w-full h-full object-contain"
        />
      ) : (
        <div class="text-gray-400 text-xs md:text-sm text-center leading-tight">
          Click<br />to<br />add
        </div>
      )}
    </div>
  );
}
