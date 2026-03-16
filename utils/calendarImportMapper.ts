import type { CalendarContentType, CalendarReferenceLink } from '../types';
import type { ExcelRawRow, CalendarImportRow } from '../types/calendarImport';

// ── Column aliases (all lowercase, trimmed) ──────────────────────────────────
const TYPE_ALIASES = ['type', 'content type', 'contenttype'];
const BRIEF_ALIASES = ['brief', 'primary brief', 'primarybrief', 'description'];
const NOTES_ALIASES = ['notes', 'note', 'comments', 'comment'];
const DATE_ALIASES = ['publish date', 'publishdate', 'publishat', 'publish at', 'date', 'publish_date'];
const LINKS_ALIASES = ['reference links', 'referencelinks', 'links', 'reference', 'refs', 'reference_links'];
const CAROUSEL_ALIASES = ['carousel', 'is carousel', 'iscarousel', 'is_carousel'];

/**
 * Find the header that best matches a set of aliases.
 * Returns the original header string or undefined.
 */
function findHeader(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/**
 * Normalise the "type" cell value to a valid CalendarContentType.
 * Accepts common variations like "video", "Video", "VIDEO", "photo", "motion", etc.
 */
function normaliseType(raw: unknown): CalendarContentType {
  const str = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (str === 'VIDEO' || str === 'V') return 'VIDEO';
  if (str === 'PHOTO' || str === 'P' || str === 'IMAGE') return 'PHOTO';
  if (str === 'MOTION' || str === 'M' || str === 'GIF' || str === 'ANIMATION') return 'MOTION';
  // Fallback — will be caught by validation
  return str as CalendarContentType;
}

/**
 * Parse a comma- or newline-separated list of URLs into CalendarReferenceLink[].
 */
function parseLinks(raw: unknown): CalendarReferenceLink[] {
  if (raw == null) return [];
  const str = String(raw).trim();
  if (!str) return [];

  return str
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ title: url, url }));
}

/**
 * Parse a cell value into an ISO date string (YYYY-MM-DD).
 * Handles: ISO strings, "MM/DD/YYYY", "DD/MM/YYYY" (heuristic), Date objects,
 * and Excel serial numbers (already converted by excelParser).
 */
function parseDate(raw: unknown): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // Already ISO-ish (YYYY-MM-DD…)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  // Try native Date parse (handles "Mar 15, 2026", "2026/03/15", etc.)
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return str; // return raw — validator will flag it
}

/**
 * Parse a truthy / falsy cell into a boolean.
 */
function parseBool(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'boolean') return raw;
  const str = String(raw).trim().toLowerCase();
  return str === 'true' || str === 'yes' || str === '1' || str === 'y';
}

/**
 * Map raw Excel rows (keyed by original header strings) to CalendarImportRow[].
 * Uses fuzzy column-name matching so users don't need exact header names.
 */
export function mapImportRows(headers: string[], rows: ExcelRawRow[]): CalendarImportRow[] {
  const typeCol = findHeader(headers, TYPE_ALIASES);
  const briefCol = findHeader(headers, BRIEF_ALIASES);
  const notesCol = findHeader(headers, NOTES_ALIASES);
  const dateCol = findHeader(headers, DATE_ALIASES);
  const linksCol = findHeader(headers, LINKS_ALIASES);
  const carouselCol = findHeader(headers, CAROUSEL_ALIASES);

  return rows.map((raw) => ({
    type: normaliseType(typeCol ? raw[typeCol] : null),
    primaryBrief: String(briefCol ? (raw[briefCol] ?? '') : '').trim(),
    notes: String(notesCol ? (raw[notesCol] ?? '') : '').trim(),
    publishAt: parseDate(dateCol ? raw[dateCol] : null),
    referenceLinks: parseLinks(linksCol ? raw[linksCol] : null),
    isCarousel: parseBool(carouselCol ? raw[carouselCol] : null),
  }));
}
