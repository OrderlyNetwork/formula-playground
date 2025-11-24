/**
 * Constants for FormulaDataSheet module
 */

/** Debounce delay in milliseconds for automatic calculation after cell updates */
export const DEBOUNCE_DELAY_MS = 300;

/** Delay before auto-triggering calculation for valid rows without results */
export const AUTO_TRIGGER_DELAY_MS = 100;

/** Time window in milliseconds to consider updates as "recent" */
export const RECENT_UPDATE_WINDOW_MS = 1000;

/** Minimum width for table columns (except index column) */
export const MIN_COLUMN_WIDTH = 200;
