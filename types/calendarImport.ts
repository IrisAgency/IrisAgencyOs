import type { CalendarContentType, CalendarReferenceLink } from '../types';

/** Raw row as parsed from the Excel sheet — all values are primitives or null. */
export type ExcelRawRow = Record<string, string | number | boolean | null>;

/** A single calendar-item row after mapping from raw Excel data. */
export interface CalendarImportRow {
  type: CalendarContentType;
  primaryBrief: string;
  notes: string;
  publishAt: string; // ISO date string (YYYY-MM-DD)
  referenceLinks: CalendarReferenceLink[];
  isCarousel: boolean;
}

/** A validation issue for a specific row+field. */
export interface CalendarImportValidation {
  row: number; // 0-based index into the rows array
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Full result of parsing + mapping + validating an Excel file. */
export interface CalendarImportPreview {
  rows: CalendarImportRow[];
  validations: CalendarImportValidation[];
  hasErrors: boolean;
  rawHeaders: string[];
}
