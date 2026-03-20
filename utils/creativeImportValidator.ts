import type { CreativeImportRow, CreativeImportValidation } from '../types/creativeImport';

const VALID_TYPES = new Set(['VIDEO', 'PHOTO', 'MOTION']);

function isValidISODate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function isValidURL(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an array of mapped creative import rows.
 * Returns an array of issues sorted by row → severity (errors first).
 */
export function validateCreativeImportRows(rows: CreativeImportRow[]): CreativeImportValidation[] {
  const issues: CreativeImportValidation[] = [];
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    // Type
    if (!row.type || !VALID_TYPES.has(row.type)) {
      issues.push({
        row: idx,
        field: 'type',
        message: `Type must be VIDEO, PHOTO, or MOTION (got "${row.type || '(empty)'}")`,
        severity: 'error',
      });
    }

    // Title
    if (!row.title) {
      issues.push({
        row: idx,
        field: 'title',
        message: 'Title is required',
        severity: 'error',
      });
    }

    // Publish Date
    if (!row.publishAt) {
      issues.push({
        row: idx,
        field: 'publishAt',
        message: 'Publish date is required',
        severity: 'error',
      });
    } else if (!isValidISODate(row.publishAt)) {
      issues.push({
        row: idx,
        field: 'publishAt',
        message: `Invalid date format "${row.publishAt}" — expected YYYY-MM-DD`,
        severity: 'error',
      });
    }

    // Reference Links (warnings only)
    row.referenceLinks.forEach((link) => {
      if (!isValidURL(link.url)) {
        issues.push({
          row: idx,
          field: 'referenceLinks',
          message: `Invalid URL: "${link.url}"`,
          severity: 'warning',
        });
      }
    });

    // Duplicate detection (warning)
    const key = `${row.type}|${row.title}|${row.publishAt}`;
    if (seen.has(key)) {
      issues.push({
        row: idx,
        field: '_duplicate',
        message: 'Duplicate row (same type, title, and date)',
        severity: 'warning',
      });
    }
    seen.add(key);
  });

  issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.row - b.row;
  });

  return issues;
}
