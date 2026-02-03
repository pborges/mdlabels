// Label dimensions (from const.go)
export const ROWS_PER_SHEET = 4;
export const COLS_PER_SHEET = 5;
export const LABELS_PER_PAGE = ROWS_PER_SHEET * COLS_PER_SHEET; // 20

// Physical dimensions in mm
export const LABEL_WIDTH_MM = 38;
export const LABEL_HEIGHT_MM = 54;

// Canvas rendering at high DPI for quality
export const DPI = 300;
export const MM_TO_PX = DPI / 25.4;

// Canvas dimensions in pixels
export const LABEL_WIDTH_PX = LABEL_WIDTH_MM * MM_TO_PX;
export const LABEL_HEIGHT_PX = LABEL_HEIGHT_MM * MM_TO_PX;

// Label design specs
export const DOG_EAR_SIZE = 2.5; // mm
export const TOP_BANNER_HEIGHT = 5; // mm
export const BOTTOM_BANNER_HEIGHT = 11; // mm
export const ARTWORK_HEIGHT = LABEL_HEIGHT_MM - TOP_BANNER_HEIGHT - BOTTOM_BANNER_HEIGHT; // 38mm

// PDF layout (from const.go)
export const LEFT_MARGIN_MM = 8;
export const TOP_MARGIN_MM = 20;
export const TRANSLATE_WIDTH_MM = 40;
export const TRANSLATE_HEIGHT_MM = 60;
