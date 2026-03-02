/**
 * Google Drive URL Utilities
 * 
 * Extracts file IDs from various Google Drive URL formats and builds
 * thumbnail, preview, and direct-download URLs for in-app rendering.
 */

// ─── URL Patterns ────────────────────────────────────────────────────
// Covers: /file/d/ID/..., /open?id=ID, /uc?id=ID, /thumbnail?id=ID, 
//         drive.google.com/drive/folders/ID, docs.google.com/document/d/ID/...

const DRIVE_FILE_REGEX = /\/file\/d\/([a-zA-Z0-9_-]{10,})/;
const DRIVE_OPEN_REGEX = /[?&]id=([a-zA-Z0-9_-]{10,})/;
const DRIVE_FOLDERS_REGEX = /\/folders\/([a-zA-Z0-9_-]{10,})/;
const DOCS_FILE_REGEX = /\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]{10,})/;

const DRIVE_DOMAINS = [
  'drive.google.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
];

// ─── Core Helpers ────────────────────────────────────────────────────

/** Check whether a URL points to a Google Drive / Docs resource */
export function isDriveLink(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return DRIVE_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/** Check whether a URL is specifically a Google Drive folder (not a file) */
export function isDriveFolder(url: string): boolean {
  if (!isDriveLink(url)) return false;
  return DRIVE_FOLDERS_REGEX.test(url);
}

/**
 * Extract the FILE_ID from any Google Drive / Docs URL.
 * Returns `null` when the URL isn't recognised.
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  // Try /file/d/ID first (most common)
  let match = url.match(DRIVE_FILE_REGEX);
  if (match) return match[1];

  // Try Docs/Sheets/Slides /d/ID
  match = url.match(DOCS_FILE_REGEX);
  if (match) return match[1];

  // Try ?id= or &id= query param
  match = url.match(DRIVE_OPEN_REGEX);
  if (match) return match[1];

  // Try /folders/ID (for folder links)
  match = url.match(DRIVE_FOLDERS_REGEX);
  if (match) return match[1];

  return null;
}

// ─── URL Builders ────────────────────────────────────────────────────

/**
 * Build a Google Drive thumbnail URL.
 * Works for images & first-frame of videos.
 * @param fileId – Google Drive file ID
 * @param size   – Width in pixels (default 400)
 */
export function getDriveThumbnailUrl(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Build a Google Drive preview (embed) URL that renders inside an <iframe>.
 * Works for images, videos, and PDFs.
 */
export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Build a direct download / stream URL.
 * Useful as a <video src="..."> or <img src="..."> fallback for MP4 / images.
 * ⚠️ May be blocked by Drive depending on permissions or file size.
 */
export function getDriveDirectUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Build the original Google Drive "view" URL (opens in browser).
 */
export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// ─── File-type Heuristics ────────────────────────────────────────────

export type DriveFileHint = 'video' | 'image' | 'pdf' | 'document' | 'unknown';

/** Best-effort guess of content type from the URL or a label / filename. */
export function guessDriveFileType(url: string, label?: string): DriveFileHint {
  const lowerUrl = (url + ' ' + (label || '')).toLowerCase();

  // Docs / Sheets / Slides
  if (/docs\.google\.com\/document/.test(lowerUrl)) return 'document';
  if (/docs\.google\.com\/(spreadsheets|presentation)/.test(lowerUrl)) return 'document';

  // Explicit extensions in label or URL
  if (/\.(mp4|mov|avi|mkv|webm)(\b|$)/.test(lowerUrl)) return 'video';
  if (/\.(jpe?g|png|gif|webp|svg|bmp|heic)(\b|$)/.test(lowerUrl)) return 'image';
  if (/\.pdf(\b|$)/.test(lowerUrl)) return 'pdf';

  // Keywords in title
  if (/\b(video|reel|clip|footage|motion)\b/.test(lowerUrl)) return 'video';
  if (/\b(photo|image|poster|banner|design|thumbnail|cover)\b/.test(lowerUrl)) return 'image';
  if (/\b(pdf|document|brief|report)\b/.test(lowerUrl)) return 'pdf';

  return 'unknown';
}

// ─── Batch Helper ────────────────────────────────────────────────────

export interface DriveDeliverable {
  id: string;          // original referenceLink/attachment id
  label: string;       // human-readable label
  originalUrl: string; // the raw URL as entered by user
  fileId: string;      // extracted Drive file ID
  typeHint: DriveFileHint;
  thumbnailUrl: string;
  previewUrl: string;
  directUrl: string;
  viewUrl: string;
}

/**
 * Given a list of reference links, attachments, and delivery links, extract
 * all that are Google Drive links and return enriched deliverable objects.
 * Delivery links are prioritized first, then reference links, then attachments.
 */
export function extractDriveDeliverables(
  referenceLinks: { id: string; title: string; url: string }[] = [],
  attachments: { id: string; name: string; url: string }[] = [],
  deliveryLinks: { id: string; label: string; url: string; driveFileId?: string | null }[] = [],
): DriveDeliverable[] {
  const result: DriveDeliverable[] = [];
  const seenFileIds = new Set<string>();

  // Delivery links first (these are the primary deliverables)
  for (const dl of deliveryLinks) {
    const fileId = dl.driveFileId || extractDriveFileId(dl.url);
    if (!fileId || seenFileIds.has(fileId)) continue;
    if (!isDriveLink(dl.url) && !dl.driveFileId) continue;
    seenFileIds.add(fileId);

    result.push({
      id: dl.id,
      label: dl.label || 'Drive File',
      originalUrl: dl.url,
      fileId,
      typeHint: guessDriveFileType(dl.url, dl.label),
      thumbnailUrl: getDriveThumbnailUrl(fileId, 600),
      previewUrl: getDrivePreviewUrl(fileId),
      directUrl: getDriveDirectUrl(fileId),
      viewUrl: getDriveViewUrl(fileId),
    });
  }

  for (const link of referenceLinks) {
    if (!isDriveLink(link.url) || isDriveFolder(link.url)) continue;
    const fileId = extractDriveFileId(link.url);
    if (!fileId || seenFileIds.has(fileId)) continue;
    seenFileIds.add(fileId);

    result.push({
      id: link.id,
      label: link.title || 'Drive File',
      originalUrl: link.url,
      fileId,
      typeHint: guessDriveFileType(link.url, link.title),
      thumbnailUrl: getDriveThumbnailUrl(fileId, 600),
      previewUrl: getDrivePreviewUrl(fileId),
      directUrl: getDriveDirectUrl(fileId),
      viewUrl: getDriveViewUrl(fileId),
    });
  }

  for (const att of attachments) {
    if (!isDriveLink(att.url)) continue;
    const fileId = extractDriveFileId(att.url);
    if (!fileId || seenFileIds.has(fileId)) continue;
    seenFileIds.add(fileId);

    result.push({
      id: att.id,
      label: att.name || 'Drive File',
      originalUrl: att.url,
      fileId,
      typeHint: guessDriveFileType(att.url, att.name),
      thumbnailUrl: getDriveThumbnailUrl(fileId, 600),
      previewUrl: getDrivePreviewUrl(fileId),
      directUrl: getDriveDirectUrl(fileId),
      viewUrl: getDriveViewUrl(fileId),
    });
  }

  return result;
}
