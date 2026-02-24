/**
 * Single source of truth for the comparison table grid template.
 * Used by ComparisonRow and every column-header row so columns
 * always line up perfectly.
 *
 * Columns:
 *   1. Label  — 240 px fixed
 *   2. Car A  — equal share of remaining space (min 0 prevents overflow)
 *   3. Car B  — equal share of remaining space (min 0 prevents overflow)
 */
export const TABLE_GRID = 'grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]';

/**
 * Padding applied to every cell in the table (header and data rows).
 * Must be identical in both places so text aligns across the dividers.
 */
export const TABLE_CELL_PAD = 'p-4';
