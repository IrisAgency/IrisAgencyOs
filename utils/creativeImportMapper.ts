import type { CalendarContentType, CalendarReferenceLink } from '../types';
import type { ExcelRawRow } from '../types/calendarImport';
import type { CreativeImportRow } from '../types/creativeImport';

// ── Column aliases (all lowercase, trimmed) ──────────────────────────────────
const TYPE_ALIASES = ['type', 'content type', 'contenttype'];
const TITLE_ALIASES = ['title', 'name', 'content title'];
const MAIN_IDEA_ALIASES = ['main idea', 'mainidea', 'idea', 'main_idea', 'concept'];
const BRIEF_ALIASES = [
  'brief description',
  'briefdescription',
  'brief',
  'description',
  'primary brief',
  'primarybrief',
];
const NOTES_ALIASES = ['notes', 'note', 'comments', 'comment'];
const DATE_ALIASES = ['publish date', 'publishdate', 'publishat', 'publish at', 'date', 'publish_date'];
const LINKS_ALIASES = ['reference links', 'referencelinks', 'links', 'reference', 'refs', 'reference_links'];
const CAROUSEL_ALIASES = ['carousel', 'is carousel', 'iscarousel', 'is_carousel'];

function findHeader(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

function normaliseType(raw: unknown): CalendarContentType {
  const str = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (str === 'VIDEO' || str === 'V') return 'VIDEO';
  if (str === 'PHOTO' || str === 'P' || str === 'IMAGE') return 'PHOTO';
  if (str === 'MOTION' || str === 'M' || str === 'GIF' || str === 'ANIMATION') return 'MOTION';
  return str as CalendarContentType;
}

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

function parseDate(raw: unknown): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

function parseBool(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'boolean') return raw;
  const str = String(raw).trim().toLowerCase();
  return str === 'true' || str === 'yes' || str === '1' || str === 'y';
}

/**
 * Map raw Excel rows to CreativeImportRow[].
 * Uses fuzzy column-name matching so users don't need exact header names.
 */
export function mapCreativeImportRows(headers: string[], rows: ExcelRawRow[]): CreativeImportRow[] {
  const typeCol = findHeader(headers, TYPE_ALIASES);
  const titleCol = findHeader(headers, TITLE_ALIASES);
  const mainIdeaCol = findHeader(headers, MAIN_IDEA_ALIASES);
  const briefCol = findHeader(headers, BRIEF_ALIASES);
  const notesCol = findHeader(headers, NOTES_ALIASES);
  const dateCol = findHeader(headers, DATE_ALIASES);
  const linksCol = findHeader(headers, LINKS_ALIASES);
  const carouselCol = findHeader(headers, CAROUSEL_ALIASES);

  // First pass: map raw values
  const mapped = rows.map((raw) => ({
    type: normaliseType(typeCol ? raw[typeCol] : null),
    title: String(titleCol ? (raw[titleCol] ?? '') : '').trim(),
    mainIdea: String(mainIdeaCol ? (raw[mainIdeaCol] ?? '') : '').trim(),
    briefDescription: String(briefCol ? (raw[briefCol] ?? '') : '').trim(),
    notes: String(notesCol ? (raw[notesCol] ?? '') : '').trim(),
    publishAt: parseDate(dateCol ? raw[dateCol] : null),
    referenceLinks: parseLinks(linksCol ? raw[linksCol] : null),
    isCarousel: parseBool(carouselCol ? raw[carouselCol] : null),
  }));

  // Second pass: auto-generate titles for rows without one, using per-type sequence numbers
  const typeCounters: Record<string, number> = {};
  const TYPE_LABELS: Record<string, string> = { VIDEO: 'Video', PHOTO: 'Photo', MOTION: 'Motion' };

  for (const row of mapped) {
    const key = row.type || 'UNKNOWN';
    typeCounters[key] = (typeCounters[key] || 0) + 1;
    if (!row.title) {
      const label = TYPE_LABELS[key] || key;
      row.title = `${label} ${typeCounters[key]}`;
    }
  }

  return mapped;
}
