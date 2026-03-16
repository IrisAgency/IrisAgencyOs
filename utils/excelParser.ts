import { read, utils } from 'xlsx';
import type { ExcelRawRow } from '../types/calendarImport';

/**
 * Convert an Excel date serial number to an ISO date string (YYYY-MM-DD).
 * Excel stores dates as the number of days since 1899-12-30.
 */
function excelSerialToISO(serial: number): string {
  // Excel epoch is 1899-12-30 (serial 0).  Excel incorrectly treats 1900 as
  // a leap year, so serials > 59 need a one-day correction.
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const corrected = serial > 59 ? serial - 1 : serial;
  const ms = epoch.getTime() + corrected * 86_400_000;
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

/**
 * Determine whether a value looks like an Excel date serial number.
 * Serials between ~1 and ~73_000 cover dates from 1900–2099.
 */
function looksLikeDateSerial(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 73_000 && !Number.isNaN(v);
}

/**
 * Read an Excel / CSV file (client-side) and return the headers + rows from the
 * first sheet.  Date serial numbers in columns whose header contains "date" or
 * "publish" are automatically converted to ISO strings.
 */
export async function parseExcelFile(file: File): Promise<{ headers: string[]; rows: ExcelRawRow[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  // header: 1 → returns an array-of-arrays; we'll handle header mapping ourselves
  const raw: unknown[][] = utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (raw.length === 0) return { headers: [], rows: [] };

  // First row is the header
  const headerRow = raw[0];
  const headers: string[] = headerRow.map((h) => (h == null ? '' : String(h).trim()));

  // Identify date-like columns so we can convert serials
  const dateCols = new Set<number>();
  headers.forEach((h, i) => {
    const lower = h.toLowerCase();
    if (lower.includes('date') || lower.includes('publish')) {
      dateCols.add(i);
    }
  });

  const rows: ExcelRawRow[] = [];

  for (let r = 1; r < raw.length; r++) {
    const values = raw[r];
    // Skip completely empty rows
    if (!values || values.every((v) => v == null || String(v).trim() === '')) {
      continue;
    }

    const row: ExcelRawRow = {};
    headers.forEach((header, i) => {
      if (!header) return; // skip unnamed columns
      let value = values[i] ?? null;

      // Auto-convert Excel date serials in date columns
      if (dateCols.has(i) && looksLikeDateSerial(value)) {
        value = excelSerialToISO(value as number);
      }

      row[header] = value as string | number | boolean | null;
    });

    rows.push(row);
  }

  return { headers, rows };
}
