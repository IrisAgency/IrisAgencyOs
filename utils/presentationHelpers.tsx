import React, { useState } from 'react';
import type { CalendarContentType, CalendarReferenceLink, CalendarReferenceFile, ContentComment } from '../types';

import { Video, Image, Clapperboard, ExternalLink, FileText, Link as LinkIcon, Play, X, Layers } from 'lucide-react';

// ============================================================================
// PURE HELPERS
// ============================================================================

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  return null;
}

export function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

export function isImageFile(name: string): boolean {
  if (!name) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|tiff?)$/i.test(name);
}

export function isVideoFile(name: string): boolean {
  if (!name) return false;
  return /\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv|3gp)$/i.test(name);
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

export function isFirebaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app');
}

export function getWebsiteFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Try to get a visual preview thumbnail for a website URL.
 * Uses YouTube/Vimeo native thumbnails where available,
 * falls back to thum.io screenshot service for other websites.
 */
export function getWebsitePreviewUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // YouTube
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
      let videoId: string | null = null;
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1).split('/')[0];
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Vimeo
    if (host === 'vimeo.com') {
      // Vimeo oEmbed needs async – use thum.io instead
    }

    // For all other websites, use thum.io free screenshot service
    return `https://image.thum.io/get/width/400/${url}`;
  } catch {
    return null;
  }
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function normalizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.') && !trimmed.includes(' ')) return `https://${trimmed}`;
  return null;
}

export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function formatPublishDay(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

// ============================================================================
// BIDI TEXT COMPONENT
// ============================================================================

export function BidiText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div
      dir="auto"
      style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
      className={`whitespace-pre-wrap break-words ${className}`}
    >
      {text}
    </div>
  );
}

// ============================================================================
// TYPE CONSTANTS
// ============================================================================

export const TYPE_ICONS: Record<string, React.ElementType> = { VIDEO: Video, PHOTO: Image, MOTION: Clapperboard };
export const TYPE_DOT_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-500',
  PHOTO: 'bg-blue-500',
  MOTION: 'bg-amber-500',
};
export const TYPE_BADGE_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-50 text-purple-700 border-purple-200',
  PHOTO: 'bg-blue-50 text-blue-700 border-blue-200',
  MOTION: 'bg-amber-50 text-amber-700 border-amber-200',
};
export const TYPE_OPTIONS: { value: CalendarContentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'MOTION', label: 'Motion' },
];

// ============================================================================
// PRINT STYLES
// ============================================================================

export const PRINT_STYLES = `
@media print {
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
}
`;

// ============================================================================
// INTERFACES
// ============================================================================

export interface PresentationItem {
  id: string;
  type: CalendarContentType;
  title: string;
  mainIdea?: string;
  brief: string;
  notes: string;
  publishAt: string;
  referenceLinks: CalendarReferenceLink[];
  referenceFiles: CalendarReferenceFile[];
  seqLabel: string;
  source?: 'activated' | 'creative';
  pinnedInGrid?: number | null;
  presentationNotes?: string;
  contentComments?: ContentComment[];
  isCarousel?: boolean;
}

export interface MediaEntry {
  url: string;
  name: string;
  isDrive: boolean;
  isFirebase: boolean;
  isImg: boolean;
  isVid: boolean;
  isWebsite: boolean;
  driveId: string | null;
  previewUrl?: string | null;
}

// ============================================================================
// COLLECT MEDIA ENTRIES FROM A PRESENTATION ITEM
// ============================================================================

export function collectMediaEntries(item: PresentationItem): MediaEntry[] {
  const allMedia: MediaEntry[] = [];

  for (const link of item.referenceLinks) {
    const norm = normalizeUrl(link.url);
    if (!norm) continue;
    const isDrive = isGoogleDriveUrl(norm);
    const isFirebase = isFirebaseStorageUrl(norm);
    const isImg = isDirectImageUrl(norm) || (isFirebase && isImageFile(link.title || ''));
    const isVid = isFirebase && isVideoFile(link.title || '');
    const isWeb = !isDrive && !isFirebase && !isImg && !isVid;
    allMedia.push({
      url: norm,
      name: link.title || 'Link',
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: isWeb,
      driveId: isDrive ? extractDriveFileId(norm) : null,
      previewUrl: isWeb ? getWebsitePreviewUrl(norm) : null,
    });
  }

  for (const file of item.referenceFiles) {
    const url = file.downloadURL;
    if (!url) continue;
    const isDrive = isGoogleDriveUrl(url);
    const isFirebase = isFirebaseStorageUrl(url);
    const isImg = isImageFile(file.fileName) || isDirectImageUrl(url);
    const isVid = isVideoFile(file.fileName);
    allMedia.push({
      url,
      name: file.fileName || 'File',
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: false,
      driveId: isDrive ? extractDriveFileId(url) : null,
    });
  }

  return allMedia;
}

// ============================================================================
// RESOLVE BEST THUMBNAIL FOR AN ITEM (for grid view)
// ============================================================================

export function resolveItemThumbnail(item: PresentationItem): string | null {
  const media = collectMediaEntries(item);

  // 1. First image from reference files (Firebase storage images)
  for (const m of media) {
    if (m.isImg && m.isFirebase) return m.url;
  }

  // 2. First Drive file → thumbnail
  for (const m of media) {
    if (m.driveId) return getDriveThumbnailUrl(m.driveId);
  }

  // 3. First direct image URL from reference links
  for (const m of media) {
    if (m.isImg && !m.isFirebase) return m.url;
  }

  // 4. First video from Firebase storage (browsers can render a poster frame)
  for (const m of media) {
    if (m.isVid && m.isFirebase) return m.url;
  }

  // 5. Any Firebase storage file at all (could be a non-standard extension)
  for (const m of media) {
    if (m.isFirebase) return m.url;
  }

  return null;
}

/**
 * Return the first website/link URL suitable for LinkPreviewThumbnail OG fetch.
 * Only returns a URL when resolveItemThumbnail already returns null (no static thumb).
 */
export function resolveItemLinkPreviewUrl(item: PresentationItem): string | null {
  const media = collectMediaEntries(item);

  // Return first website link (not a direct image, not Drive, not Firebase)
  for (const m of media) {
    if (m.isWebsite) return m.url;
  }

  // Fallback: any reference link that isn't a file
  for (const link of item.referenceLinks) {
    const norm = normalizeUrl(link.url);
    if (norm) return norm;
  }

  return null;
}

// ============================================================================
// DRIVE PREVIEW MODAL
// ============================================================================

export function DrivePreviewModal({ url, title, onClose }: { url: string; title?: string; onClose: () => void }) {
  const fileId = extractDriveFileId(url);
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-800 truncate">{title || 'Drive Preview'}</span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Open in Drive <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="w-full aspect-video bg-gray-100">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={title || 'Drive preview'}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MEDIA PREVIEW (EDITORIAL TABLE — full list)
// ============================================================================

export function MediaPreview({
  item,
  onDriveClick,
}: {
  item: PresentationItem;
  onDriveClick: (url: string, title: string) => void;
}) {
  const allMedia = collectMediaEntries(item);

  if (allMedia.length === 0) {
    return <span className="text-[11px] text-gray-300 italic">No media</span>;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {allMedia.map((m, i) => (
        <MediaThumb key={i} media={m} onDriveClick={onDriveClick} />
      ))}
    </div>
  );
}

// ============================================================================
// MEDIA THUMB
// ============================================================================

export const MediaThumb: React.FC<{
  media: MediaEntry;
  onDriveClick: (url: string, title: string) => void;
}> = ({ media, onDriveClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const [vidErr, setVidErr] = useState(false);
  const [previewErr, setPreviewErr] = useState(false);

  const thumbSrc = media.driveId ? getDriveThumbnailUrl(media.driveId) : media.isImg ? media.url : null;

  const canVideoPreview = media.isVid && !media.isDrive && !vidErr;

  const handleClick = () => {
    if (media.isDrive) {
      onDriveClick(media.url, media.name);
    } else {
      window.open(media.url, '_blank');
    }
  };

  // 1. Image thumbnail (Drive, direct images, Firebase images)
  if (thumbSrc && !imgErr) {
    return (
      <button
        onClick={handleClick}
        className="relative w-full rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group bg-gray-50"
        title={media.name}
      >
        <div className="w-full aspect-[16/10] bg-gray-100 overflow-hidden">
          <img
            src={thumbSrc}
            alt={media.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        </div>
        {(media.isVid || (media.isDrive && !media.isImg)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
              <Play className="w-4 h-4 text-gray-700 ml-0.5" />
            </div>
          </div>
        )}
        {media.isImg && !media.isDrive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
            </div>
          </div>
        )}
        {media.isDrive && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 shadow-sm flex items-center gap-1">
            <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
            <span className="text-[9px] font-semibold text-gray-500">Drive</span>
          </div>
        )}
      </button>
    );
  }

  // 2. Video preview (Firebase/direct video files)
  if (canVideoPreview) {
    return (
      <button
        onClick={handleClick}
        className="relative w-full rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group bg-gray-50"
        title={media.name}
      >
        <div className="w-full aspect-[16/10] bg-black overflow-hidden">
          <video
            src={media.url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            onError={() => setVidErr(true)}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
            <Play className="w-4 h-4 text-gray-700 ml-0.5" />
          </div>
        </div>
        {media.isFirebase && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 shadow-sm">
            <span className="text-[9px] font-semibold text-purple-600">Video</span>
          </div>
        )}
      </button>
    );
  }

  // 3. Website link with preview thumbnail
  if (media.isWebsite) {
    const favicon = getWebsiteFavicon(media.url);
    const domain = getDomainFromUrl(media.url);
    const preview = media.previewUrl;
    return (
      <button
        onClick={handleClick}
        className="relative w-full rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group bg-gray-50"
        title={media.url}
      >
        <div className="w-full aspect-[16/10] bg-gray-100 overflow-hidden relative">
          {preview && !previewErr ? (
            <img
              src={preview}
              alt={media.name}
              className="w-full h-full object-cover"
              onError={() => setPreviewErr(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {favicon ? (
                <img src={favicon} alt="" className="w-10 h-10 opacity-30" loading="lazy" />
              ) : (
                <LinkIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5">
            <div className="flex items-center gap-1.5">
              {favicon && <img src={favicon} alt="" className="w-3.5 h-3.5 shrink-0" loading="lazy" />}
              <span className="text-[10px] font-medium text-white/90 truncate">
                {media.name !== 'Link' ? media.name : domain}
              </span>
            </div>
            <span className="text-[9px] text-white/50 truncate block">{domain}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
            </div>
          </div>
        </div>
      </button>
    );
  }

  // 4. Generic fallback
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all text-left group"
      title={media.name}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        {media.isVid ? (
          <Video className="w-4 h-4 text-purple-500" />
        ) : media.isImg ? (
          <Image className="w-4 h-4 text-blue-400" />
        ) : (
          <FileText className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-gray-700 truncate">{media.name}</span>
        <span className="block text-[10px] text-gray-400 truncate">
          {media.isVid ? 'Video file' : media.isImg ? 'Image file' : 'File'}
        </span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </button>
  );
};

// ============================================================================
// EDITORIAL ROW (used in both presentation views)
// ============================================================================

/**
 * Dark-theme MediaThumb — styled for dark backgrounds.
 * Used in Cal Revisions (ManagerView), SwipeReviewCard, etc.
 *
 * Non-Drive items render as native <a> tags. The parent gesture handler
 * (useDrag with filterTaps:true) allows taps through to these links.
 */
export const DarkMediaThumb: React.FC<{
  media: MediaEntry;
  onDriveClick: (url: string, title: string) => void;
}> = ({ media, onDriveClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const [vidErr, setVidErr] = useState(false);

  const thumbSrc = media.driveId ? getDriveThumbnailUrl(media.driveId) : media.isImg ? media.url : null;

  const canVideoPreview = media.isVid && !media.isDrive && !vidErr;

  const imgThumbContent = (
    <>
      <div className="w-full aspect-[16/10] bg-black/30 overflow-hidden">
        <img
          src={thumbSrc || ''}
          alt={media.name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
      </div>
      {(media.isVid || (media.isDrive && !media.isImg)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
            <Play className="w-4 h-4 text-gray-700 ml-0.5" />
          </div>
        </div>
      )}
      {media.isDrive && (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm flex items-center gap-1">
          <ExternalLink className="w-2.5 h-2.5 text-white/70" />
          <span className="text-[9px] font-semibold text-white/70">Drive</span>
        </div>
      )}
    </>
  );

  // ── 1. Image thumbnail ──
  if (thumbSrc && !imgErr) {
    const cls =
      'relative w-full block rounded-lg overflow-hidden border border-white/10 hover:border-white/25 transition-all group bg-white/5';
    if (media.isDrive) {
      return (
        <button type="button" onClick={() => onDriveClick(media.url, media.name)} className={cls} title={media.name}>
          {imgThumbContent}
        </button>
      );
    }
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer" className={cls} title={media.name}>
        {imgThumbContent}
      </a>
    );
  }

  // ── 2. Video preview ──
  if (canVideoPreview) {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-full block rounded-lg overflow-hidden border border-white/10 hover:border-white/25 transition-all group bg-white/5"
        title={media.name}
      >
        <div className="w-full aspect-[16/10] bg-black overflow-hidden">
          <video
            src={media.url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            onError={() => setVidErr(true)}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
            <Play className="w-4 h-4 text-gray-700 ml-0.5" />
          </div>
        </div>
      </a>
    );
  }

  // ── 3. Website link (card with favicon) ──
  if (media.isWebsite) {
    const favicon = getWebsiteFavicon(media.url);
    const domain = getDomainFromUrl(media.url);
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-full block rounded-lg overflow-hidden border border-white/10 hover:border-white/25 transition-all group bg-white/5 no-underline"
        title={media.url}
      >
        <div className="w-full aspect-[16/10] bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center">
          {favicon ? (
            <img src={favicon} alt="" className="w-12 h-12 opacity-60" loading="lazy" />
          ) : (
            <LinkIcon className="w-10 h-10 text-white/20" />
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2.5 pb-2 pt-6">
          <span className="block text-[11px] font-medium text-white/90 truncate">
            {media.name !== 'Link' ? media.name : domain}
          </span>
          <span className="block text-[9px] text-white/40 truncate">{domain}</span>
        </div>
      </a>
    );
  }

  // ── 4. Generic fallback ──
  const fallbackCls =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all text-left group no-underline';
  const fallbackContent = (
    <>
      <div className="shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
        {media.isVid ? (
          <Video className="w-4 h-4 text-purple-400" />
        ) : media.isImg ? (
          <Image className="w-4 h-4 text-blue-400" />
        ) : (
          <FileText className="w-4 h-4 text-white/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-white/80 truncate">{media.name}</span>
        <span className="block text-[10px] text-white/40 truncate">
          {media.isVid ? 'Video file' : media.isImg ? 'Image file' : 'File'}
        </span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-white/20 shrink-0" />
    </>
  );
  if (media.isDrive) {
    return (
      <button
        type="button"
        onClick={() => onDriveClick(media.url, media.name)}
        className={fallbackCls}
        title={media.name}
      >
        {fallbackContent}
      </button>
    );
  }
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" className={fallbackCls} title={media.name}>
      {fallbackContent}
    </a>
  );
};

/**
 * Build MediaEntry[] from CalendarRevisionReference[] (the request attachments).
 * Adapts the simpler { type, value, fileName } shape to MediaEntry.
 */
export function collectRevisionRefMedia(
  refs: Array<{ type: 'link' | 'file'; value: string; fileName?: string }>,
): MediaEntry[] {
  const entries: MediaEntry[] = [];
  for (const r of refs) {
    const url = r.value;
    if (!url) continue;
    const isDrive = isGoogleDriveUrl(url);
    const isFirebase = isFirebaseStorageUrl(url);
    const name = r.fileName || (r.type === 'file' ? 'File' : 'Link');
    const isImg =
      isDirectImageUrl(url) || (isFirebase && isImageFile(name)) || (r.type === 'file' && isImageFile(name));
    const isVid = (isFirebase && isVideoFile(name)) || (r.type === 'file' && isVideoFile(name));
    const isWeb = !isDrive && !isFirebase && !isImg && !isVid && r.type === 'link';
    entries.push({
      url,
      name,
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: isWeb,
      driveId: isDrive ? extractDriveFileId(url) : null,
      previewUrl: isWeb ? getWebsitePreviewUrl(url) : null,
    });
  }
  return entries;
}

/**
 * Build MediaEntry[] from CalendarReferenceLink[] + CalendarReferenceFile[].
 * Same as collectMediaEntries but accepts them separately (for revision responses).
 */
export function collectRevisionResponseMedia(
  links: Array<{ title: string; url: string }>,
  files: Array<{ fileName: string; downloadURL: string; [k: string]: any }>,
): MediaEntry[] {
  const entries: MediaEntry[] = [];
  for (const link of links) {
    const norm = normalizeUrl(link.url);
    if (!norm) continue;
    const isDrive = isGoogleDriveUrl(norm);
    const isFirebase = isFirebaseStorageUrl(norm);
    const isImg = isDirectImageUrl(norm) || (isFirebase && isImageFile(link.title || ''));
    const isVid = isFirebase && isVideoFile(link.title || '');
    const isWeb = !isDrive && !isFirebase && !isImg && !isVid;
    entries.push({
      url: norm,
      name: link.title || 'Link',
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: isWeb,
      driveId: isDrive ? extractDriveFileId(norm) : null,
      previewUrl: isWeb ? getWebsitePreviewUrl(norm) : null,
    });
  }
  for (const file of files) {
    const url = file.downloadURL;
    if (!url) continue;
    const isDrive = isGoogleDriveUrl(url);
    const isFirebase = isFirebaseStorageUrl(url);
    const isImg = isImageFile(file.fileName) || isDirectImageUrl(url);
    const isVid = isVideoFile(file.fileName);
    entries.push({
      url,
      name: file.fileName || 'File',
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: false,
      driveId: isDrive ? extractDriveFileId(url) : null,
    });
  }
  return entries;
}

export const EditorialRow: React.FC<{
  item: PresentationItem;
  index?: number;
  onDriveClick: (url: string, title: string) => void;
}> = ({ item, onDriveClick }) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const dotColor = TYPE_DOT_COLORS[item.type] || 'bg-gray-400';
  const badgeColor = TYPE_BADGE_COLORS[item.type] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="group flex flex-col sm:grid sm:grid-cols-[120px_1fr_300px] gap-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors print:break-inside-avoid">
      {/* DATE column */}
      <div className="py-3 px-4 sm:py-4 flex flex-row sm:flex-col items-center sm:items-start justify-start gap-3 sm:gap-0 sm:border-r border-b sm:border-b-0 border-gray-100">
        <div className="flex sm:flex-col items-baseline sm:items-start gap-1.5 sm:gap-0">
          {item.publishAt ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {formatPublishDay(item.publishAt).split(',')[0]}
              </span>
              <span className="text-lg font-bold text-gray-800 leading-tight">
                {new Date(item.publishAt).getDate()}
              </span>
              <span className="text-[11px] text-gray-400">
                {new Date(item.publishAt).toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">No date</span>
          )}
        </div>
        <span
          className={`sm:mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
        >
          <TypeIcon className="w-3 h-3" />
          {item.type}
        </span>
        {item.isCarousel && (
          <span className="sm:mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-600 border-indigo-200">
            <Layers className="w-3 h-3" />
            Carousel
          </span>
        )}
      </div>

      {/* CONTENT column */}
      <div className="py-3 px-4 sm:py-4 sm:px-5 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <div className="flex-1 min-w-0">
            <h3
              dir="auto"
              style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
              className="text-sm font-semibold text-gray-900 leading-snug break-words"
            >
              {item.title}
            </h3>
            {item.mainIdea && <BidiText text={item.mainIdea} className="mt-1 text-xs text-gray-600 leading-relaxed" />}
            {item.brief && <BidiText text={item.brief} className="mt-1 text-xs text-gray-500 leading-relaxed" />}
            {item.notes && <BidiText text={item.notes} className="mt-1 text-[11px] text-gray-400 italic" />}
          </div>
        </div>
      </div>

      {/* MEDIA column */}
      <div className="py-3 px-4 sm:py-4 border-t sm:border-t-0 sm:border-l border-gray-100 flex items-start">
        <MediaPreview item={item} onDriveClick={onDriveClick} />
      </div>
    </div>
  );
};
