/**
 * Spreadsheet Component Exports
 *
 * Provides both the stateless Spreadsheet component and the SpreadsheetContainer
 * for different usage patterns.
 */

// Export stateless component
export { default as Spreadsheet } from "./Spreadsheet";
export type { SpreadsheetProps } from "./Spreadsheet";

// Export container component (for datasheet mode)
export { default as SpreadsheetContainer } from "./SpreadsheetContainer";

// Export related hooks for custom implementations
export { useSpreadsheetVirtualization } from "./hooks/useSpreadsheetVirtualization";
