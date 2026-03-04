import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  CreativeProject, CreativeCalendar, CreativeCalendarItem,
  Client, User, CalendarContentType,
  CalendarReferenceLink, CalendarReferenceFile,
} from '../../types';

import {
  Video, Image, Clapperboard, Calendar, ExternalLink, FileText,
  ChevronLeft, ChevronRight, LayoutGrid, Presentation, Search,
  Copy, Check, X, Clock, User as UserIcon, Share2,
  ArrowLeft, Link as LinkIcon, Play,
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

/** Extract Google Drive file ID from common URL patterns */
function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // /file/d/{id}/
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  // open?id={id}
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  // /folders/{id}
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  return null;
}

/** Generate Google Drive thumbnail URL */
function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

/** Check if a URL is a direct image link */
function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/.test(lower);
}

/** Check if a filename or URL is an image */
function isImageFile(name: string): boolean {
  if (!name) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|tiff?)$/i.test(name);
}

/** Check if a filename or URL is a video */
function isVideoFile(name: string): boolean {
  if (!name) return false;
  return /\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv|3gp)$/i.test(name);
}

/** Check if a URL is a Google Drive link */
function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/** Check if a URL is a Firebase Storage link (has firebasestorage in it) */
function isFirebaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app');
}

/** Normalize URL to ensure it has a protocol */
function normalizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }
  return null;
}

/** Format an ISO date string into a readable date */
function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/** Render text with preserved line breaks and bidi support */
function BidiText({ text, className = '' }: { text: string; className?: string }) {
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

const TYPE_ICONS: Record<string, React.ElementType> = {
  VIDEO: Video,
  PHOTO: Image,
  MOTION: Clapperboard,
};

const TYPE_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  PHOTO: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  MOTION: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
};

const TYPE_OPTIONS: { value: CalendarContentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'MOTION', label: 'Motion' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Google Drive fast preview card */
function DrivePreviewCard({ url, title }: { url: string; title?: string }) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileId = extractDriveFileId(url);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
      {/* Thumbnail area */}
      {fileId && !imgError ? (
        <div className="relative w-full aspect-video bg-black/50 overflow-hidden">
          <img
            src={getDriveThumbnailUrl(fileId)}
            alt={title || 'Drive preview'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {/* Overlay with play icon for videos */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-24 flex items-center justify-center bg-white/5">
          <FileText className="w-8 h-8 text-white/30" />
        </div>
      )}
      {/* Actions */}
      <div className="flex items-center gap-2 p-2.5">
        <span className="flex-1 min-w-0 text-xs text-white/60 truncate">
          {title || 'Google Drive file'}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title="Open"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

/** Direct image preview */
function ImagePreviewCard({ url, title }: { url: string; title?: string }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors text-sm text-white/70 hover:text-white"
      >
        <LinkIcon className="w-4 h-4 shrink-0" />
        <span className="truncate">{title || url}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-auto" />
      </a>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
      <div className="relative w-full aspect-video bg-black/50 overflow-hidden">
        <img
          src={url}
          alt={title || 'Reference'}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
      <div className="flex items-center gap-2 p-2.5">
        <span className="flex-1 min-w-0 text-xs text-white/60 truncate">{title || 'Image'}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title="Open"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

/** Reference link renderer with smart preview */
const ReferenceLinkCard: React.FC<{ link: CalendarReferenceLink }> = ({ link }) => {
  const normalizedUrl = normalizeUrl(link.url);

  if (!normalizedUrl) {
    // Not a valid URL — just display as plain text
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-[#0a0a0a] text-sm text-white/60">
        <LinkIcon className="w-4 h-4 shrink-0" />
        <span className="break-words min-w-0">{link.title || link.url}</span>
      </div>
    );
  }

  if (isGoogleDriveUrl(normalizedUrl)) {
    return <DrivePreviewCard url={normalizedUrl} title={link.title} />;
  }

  if (isDirectImageUrl(normalizedUrl)) {
    return <ImagePreviewCard url={normalizedUrl} title={link.title} />;
  }

  // Generic link
  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors text-sm text-white/70 hover:text-white"
    >
      <LinkIcon className="w-4 h-4 shrink-0 text-iris-red" />
      <div className="flex-1 min-w-0">
        {link.title && <span className="block truncate font-medium">{link.title}</span>}
        <span className="block truncate text-xs text-white/40">{normalizedUrl}</span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
    </a>
  );
}

/** Reference file renderer with smart preview (images, videos, Drive files) */
const ReferenceFileCard: React.FC<{ file: CalendarReferenceFile }> = ({ file }) => {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = file.downloadURL;
  const name = file.fileName || '';

  const isDriveFile = url ? isGoogleDriveUrl(url) : false;
  const driveFileId = isDriveFile ? extractDriveFileId(url) : null;
  const isImage = isImageFile(name) || (url ? isDirectImageUrl(url) : false);
  const isVideo = isVideoFile(name);
  const isFirebase = url ? isFirebaseStorageUrl(url) : false;
  const showThumbnail = (isImage || isVideo || driveFileId) && !imgError;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Determine thumbnail source
  const thumbnailSrc = driveFileId
    ? getDriveThumbnailUrl(driveFileId)
    : isImage && url
    ? url
    : null;

  if (!showThumbnail || !thumbnailSrc) {
    // Fallback: simple file row with icon
    return (
      <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-3 p-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            {isVideo ? (
              <Video className="w-5 h-5 text-purple-400" />
            ) : (
              <FileText className="w-5 h-5 text-white/60" />
            )}
          </div>
          <span className="flex-1 min-w-0 text-sm text-white/80 truncate">{name || 'File'}</span>
          <div className="flex items-center gap-1.5">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                title="Open file"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {url && (
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Rich preview with thumbnail
  return (
    <div className="w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0a]">
      {/* Thumbnail area */}
      <div className="relative w-full aspect-video bg-black/50 overflow-hidden group">
        <img
          src={thumbnailSrc}
          alt={name || 'File preview'}
          className={`w-full h-full ${isImage ? 'object-contain' : 'object-cover'}`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
        {/* Video play overlay */}
        {(isVideo || (driveFileId && !isImage)) && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Play className="w-7 h-7 text-white ml-0.5" />
            </div>
          </a>
        )}
        {/* Image expand overlay */}
        {isImage && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
          </a>
        )}
      </div>
      {/* Actions row */}
      <div className="flex items-center gap-2 p-2.5">
        {isVideo && <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
        {isImage && <Image className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
        {!isVideo && !isImage && <FileText className="w-3.5 h-3.5 text-white/40 shrink-0" />}
        <span className="flex-1 min-w-0 text-xs text-white/60 truncate">{name || 'File'}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title="Open"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={handleCopy}
          className="shrink-0 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SLIDE CARD
// ============================================================================

interface SlideCardProps {
  item: CreativeCalendarItem;
  users: User[];
  isSlideMode: boolean;
}

const SlideCard: React.FC<SlideCardProps> = ({ item, users, isSlideMode }) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const typeColor = TYPE_COLORS[item.type] || 'bg-white/10 text-white/60 border-white/20';
  const createdByUser = users.find(u => u.id === item.createdAt); // fallback lookup

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-white/10 bg-[#0a0a0a] backdrop-blur-sm overflow-hidden ${
        isSlideMode ? 'max-w-[900px] mx-auto' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 lg:p-6 border-b border-white/10 bg-[#0f0f0f]">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2
              dir="auto"
              style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
              className="text-lg sm:text-xl font-bold text-white break-words"
            >
              {item.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${typeColor}`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {item.type}
              </span>
              {item.publishAt && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(item.publishAt)}
                </span>
              )}
              {/* Review status */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                item.reviewStatus === 'APPROVED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30'
                  : item.reviewStatus === 'REJECTED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                  : 'bg-slate-500/20 text-slate-400 border-slate-400/30'
              }`}>
                {item.reviewStatus === 'APPROVED' && <Check className="w-3 h-3" />}
                {item.reviewStatus === 'REJECTED' && <X className="w-3 h-3" />}
                {item.reviewStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                {item.reviewStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-5">
        {/* Main Idea */}
        {item.mainIdea && (
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Main Idea</h4>
            <BidiText text={item.mainIdea} className="text-sm text-white/90 leading-relaxed" />
          </div>
        )}

        {/* Brief Description */}
        {item.briefDescription && (
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Brief</h4>
            <BidiText text={item.briefDescription} className="text-sm text-white/80 leading-relaxed" />
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Notes</h4>
            <BidiText text={item.notes} className="text-sm text-white/70 leading-relaxed" />
          </div>
        )}

        {/* Reference Links */}
        {item.referenceLinks?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Reference Links</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.referenceLinks.map((link, i) => (
                <ReferenceLinkCard key={i} link={link} />
              ))}
            </div>
          </div>
        )}

        {/* Reference Files */}
        {item.referenceFiles?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Reference Files</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {item.referenceFiles.map((file, i) => (
                <ReferenceFileCard key={i} file={file} />
              ))}
            </div>
          </div>
        )}

        {/* Rejection note (if rejected) */}
        {item.reviewStatus === 'REJECTED' && item.rejectionNote && (
          <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
            <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Rejection Note</h4>
            <BidiText text={item.rejectionNote} className="text-sm text-rose-300/80" />
          </div>
        )}

        {/* Audit Info */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/40">
            {item.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created: {formatDate(item.createdAt)}
              </span>
            )}
            {item.updatedAt && item.updatedAt !== item.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated: {formatDate(item.updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CalendarPresentationViewProps {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  clients: Client[];
  users: User[];
  checkPermission: (permission: string) => boolean;
  onBack: () => void;
}

const CalendarPresentationView: React.FC<CalendarPresentationViewProps> = ({
  creativeProjects,
  creativeCalendars,
  creativeCalendarItems,
  clients,
  users,
  checkPermission,
  onBack,
}) => {
  // ── State ──
  const [viewMode, setViewMode] = useState<'slide' | 'grid'>('slide');
  const [slideIndex, setSlideIndex] = useState(0);
  const [filterType, setFilterType] = useState<CalendarContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derive approved projects & calendars ──
  const approvedCalendars = useMemo(() => {
    return creativeCalendars.filter(c => c.status === 'APPROVED');
  }, [creativeCalendars]);

  const approvedProjectIds = useMemo(() => {
    return new Set(approvedCalendars.map(c => c.creativeProjectId));
  }, [approvedCalendars]);

  const approvedProjects = useMemo(() => {
    return creativeProjects.filter(p =>
      approvedProjectIds.has(p.id) && (p.status === 'APPROVED' || approvedProjectIds.has(p.id))
    );
  }, [creativeProjects, approvedProjectIds]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && approvedProjects.length > 0) {
      setSelectedProjectId(approvedProjects[0].id);
    }
  }, [approvedProjects, selectedProjectId]);

  // ── Items for current selection ──
  const selectedCalendar = useMemo(() => {
    if (!selectedProjectId) return null;
    return approvedCalendars.find(c => c.creativeProjectId === selectedProjectId) ?? null;
  }, [selectedProjectId, approvedCalendars]);

  const allItems = useMemo(() => {
    if (!selectedCalendar) return [];
    return creativeCalendarItems
      .filter(i => i.creativeCalendarId === selectedCalendar.id)
      .sort((a, b) => {
        // Sort by publishAt, then by createdAt
        const dateA = a.publishAt || a.createdAt;
        const dateB = b.publishAt || b.createdAt;
        return dateA.localeCompare(dateB);
      });
  }, [selectedCalendar, creativeCalendarItems]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterType !== 'ALL') {
      items = items.filter(i => i.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.mainIdea?.toLowerCase().includes(q) ||
        i.briefDescription?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allItems, filterType, searchQuery]);

  // Reset slide index when items change
  useEffect(() => {
    setSlideIndex(0);
  }, [filteredItems.length, selectedProjectId, filterType, searchQuery]);

  // ── Keyboard Navigation ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewMode !== 'slide') return;
    if (e.key === 'ArrowRight') {
      setSlideIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setSlideIndex(prev => Math.max(prev - 1, 0));
    }
  }, [viewMode, filteredItems.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Client & Project info ──
  const selectedProject = approvedProjects.find(p => p.id === selectedProjectId);
  const selectedClient = selectedProject ? clients.find(c => c.id === selectedProject.clientId) : null;

  // ── Share link ──
  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // ── Content type counts ──
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allItems.length };
    for (const item of allItems) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  // ── Empty State ──
  if (approvedProjects.length === 0) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Creative Direction
        </button>
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-12 text-center">
            <Presentation className="w-12 h-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white/70">No Approved Calendars</h3>
            <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
              There are no calendars with an approved status yet. Once a calendar is approved through the review process, it will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSlideItem = filteredItems[slideIndex];

  return (
    <div ref={containerRef} className="space-y-4 overflow-x-hidden">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Creative Direction
        </button>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('slide')}
              className={`p-2 text-xs font-medium transition-colors ${
                viewMode === 'slide'
                  ? 'bg-iris-red text-white'
                  : 'bg-transparent text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Slide View"
            >
              <Presentation className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-iris-red text-white'
                  : 'bg-transparent text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Container */}
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Project Selector + Calendar Info */}
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-4 sm:p-5 mb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Project selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Approved Calendar
              </label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
              >
                {approvedProjects.map(project => {
                  const client = clients.find(c => c.id === project.clientId);
                  const cal = approvedCalendars.find(c => c.creativeProjectId === project.id);
                  return (
                    <option key={project.id} value={project.id}>
                      {client?.name || 'Unknown Client'} — {cal?.monthKey || ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Calendar meta */}
            {selectedCalendar && selectedClient && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  {selectedClient.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {selectedCalendar.monthKey}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Approved
                </span>
                {selectedCalendar.lastReviewedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Reviewed: {formatDate(selectedCalendar.lastReviewedAt)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {allItems.length} items
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  filterType === opt.value
                    ? 'bg-iris-red/20 text-iris-red border-iris-red/30'
                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
                {typeCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({typeCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0 sm:max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-10 text-center">
            <Search className="w-8 h-8 mx-auto text-white/20 mb-3" />
            <p className="text-sm text-white/50">
              {searchQuery || filterType !== 'ALL'
                ? 'No items match your filters.'
                : 'No items in this calendar.'}
            </p>
          </div>
        ) : viewMode === 'slide' ? (
          /* ── Slide Mode ── */
          <div className="space-y-4">
            {/* Slide navigation */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">
                Item {slideIndex + 1} of {filteredItems.length}
              </span>
              <div className="flex items-center gap-2">
                {/* Dots for small sets, or just count for large */}
                {filteredItems.length <= 20 && (
                  <div className="hidden sm:flex gap-1">
                    {filteredItems.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === slideIndex
                            ? 'bg-iris-red scale-125'
                            : 'bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Slide Card */}
            {currentSlideItem && (
              <SlideCard item={currentSlideItem} users={users} isSlideMode={true} />
            )}

            {/* Prev/Next Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setSlideIndex(prev => Math.max(prev - 1, 0))}
                disabled={slideIndex <= 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Keyboard hint */}
              <span className="hidden md:inline text-xs text-white/30">
                ← → Arrow keys to navigate
              </span>

              <button
                onClick={() => setSlideIndex(prev => Math.min(prev + 1, filteredItems.length - 1))}
                disabled={slideIndex >= filteredItems.length - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ── Grid Mode ── */
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {filteredItems.map((item) => (
              <SlideCard key={item.id} item={item} users={users} isSlideMode={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPresentationView;
