import type { CalendarContentType, CalendarReferenceLink } from '../types';
import type { ExcelRawRow } from './calendarImport';

export type { ExcelRawRow };

/** A single creative-item row after mapping from raw Excel data. */
export interface CreativeImportRow {
  type: CalendarContentType;
  title: string;
  mainIdea: string;
  briefDescription: string;
  notes: string;
  publishAt: string; // ISO date string (YYYY-MM-DD)
  referenceLinks: CalendarReferenceLink[];
  isCarousel: boolean;
}

/** A validation issue for a specific row+field. */
export interface CreativeImportValidation {
  row: number; // 0-based index into the rows array
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
