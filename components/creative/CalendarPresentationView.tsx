import React, { useState, useMemo } from 'react';
import type {
  CreativeProject, CreativeCalendar, CreativeCalendarItem,
  CalendarMonth, CalendarItem,
  Client, User, CalendarContentType,
  CalendarReferenceLink, CalendarReferenceFile,
} from '../../types';

import {
  Video, Image, Clapperboard, Calendar, ExternalLink, FileText,
  Presentation, Search, X, ArrowLeft, Link as LinkIcon, Play,
  Printer, ChevronDown, Share2,
} from 'lucide-react';
import ShareLinkManager from './ShareLinkManager';
import { useAuth } from '../../contexts/AuthContext';

// ============================================================================
// HELPERS
// ============================================================================

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  return null;
}

function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

function isImageFile(name: string): boolean {
  if (!name) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|tiff?)$/i.test(name);
}

function isVideoFile(name: string): boolean {
  if (!name) return false;
  return /\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv|3gp)$/i.test(name);
}

function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

function isFirebaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app');
}

/** Get a website favicon via Google's favicon service */
function getWebsiteFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

/** Extract domain from URL for display */
function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function normalizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes('.') && !trimmed.includes(' ')) return `https://${trimmed}`;
  return null;
}

function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

function formatPublishDay(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

function BidiText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }} className={`whitespace-pre-wrap break-words ${className}`}>
      {text}
    </div>
  );
}

// ============================================================================
// TYPE CONSTANTS
// ============================================================================

const TYPE_ICONS: Record<string, React.ElementType> = { VIDEO: Video, PHOTO: Image, MOTION: Clapperboard };

const TYPE_DOT_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-500',
  PHOTO: 'bg-blue-500',
  MOTION: 'bg-amber-500',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-50 text-purple-700 border-purple-200',
  PHOTO: 'bg-blue-50 text-blue-700 border-blue-200',
  MOTION: 'bg-amber-50 text-amber-700 border-amber-200',
};

const TYPE_OPTIONS: { value: CalendarContentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'MOTION', label: 'Motion' },
];

// ============================================================================
// UNIFIED PRESENTATION ITEM
// ============================================================================

interface PresentationItem {
  id: string;
  type: CalendarContentType;
  title: string;
  mainIdea: string;
  brief: string;
  notes: string;
  publishAt: string;
  referenceLinks: CalendarReferenceLink[];
  referenceFiles: CalendarReferenceFile[];
  seqLabel: string; // e.g. "VIDEO-01" or "#3"
  source: 'activated' | 'creative';
}

/** Normalize a CalendarItem (activated/production) into PresentationItem */
function calItemToPres(item: CalendarItem): PresentationItem {
  return {
    id: item.id,
    type: item.type,
    title: item.autoName || `${item.type}-${String(item.seqNumber).padStart(2, '0')}`,
    mainIdea: '',
    brief: item.primaryBrief || '',
    notes: item.notes || '',
    publishAt: item.publishAt || '',
    referenceLinks: item.referenceLinks || [],
    referenceFiles: item.referenceFiles || [],
    seqLabel: `${item.type}-${String(item.seqNumber).padStart(2, '0')}`,
    source: 'activated',
  };
}

/** Normalize a CreativeCalendarItem into PresentationItem */
function creativeItemToPres(item: CreativeCalendarItem, idx: number): PresentationItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title || `${item.type} #${idx + 1}`,
    mainIdea: item.mainIdea || '',
    brief: item.briefDescription || '',
    notes: item.notes || '',
    publishAt: item.publishAt || '',
    referenceLinks: item.referenceLinks || [],
    referenceFiles: item.referenceFiles || [],
    seqLabel: `#${idx + 1}`,
    source: 'creative',
  };
}

// ============================================================================
// DRIVE PREVIEW MODAL
// ============================================================================

function DrivePreviewModal({ url, title, onClose }: { url: string; title?: string; onClose: () => void }) {
  const fileId = extractDriveFileId(url);
  const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
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
        {/* Iframe */}
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
// MEDIA PREVIEW (thumbnail inline)
// ============================================================================

interface MediaEntry {
  url: string;
  name: string;
  isDrive: boolean;
  isFirebase: boolean;
  isImg: boolean;
  isVid: boolean;
  isWebsite: boolean;
  driveId: string | null;
}

function MediaPreview({ item, onDriveClick }: { item: PresentationItem; onDriveClick: (url: string, title: string) => void }) {
  const allMedia: MediaEntry[] = [];

  // Collect reference links
  for (const link of item.referenceLinks) {
    const norm = normalizeUrl(link.url);
    if (!norm) continue;
    const isDrive = isGoogleDriveUrl(norm);
    const isFirebase = isFirebaseStorageUrl(norm);
    const isImg = isDirectImageUrl(norm) || (isFirebase && isImageFile(link.title || ''));
    const isVid = isFirebase && isVideoFile(link.title || '');
    allMedia.push({
      url: norm,
      name: link.title || 'Link',
      isDrive,
      isFirebase,
      isImg,
      isVid,
      isWebsite: !isDrive && !isFirebase && !isImg && !isVid,
      driveId: isDrive ? extractDriveFileId(norm) : null,
    });
  }

  // Collect reference files
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

const MediaThumb: React.FC<{
  media: MediaEntry;
  onDriveClick: (url: string, title: string) => void;
}> = ({ media, onDriveClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const [vidErr, setVidErr] = useState(false);

  // Determine thumbnail source
  const thumbSrc = media.driveId
    ? getDriveThumbnailUrl(media.driveId)
    : media.isImg
    ? media.url
    : null;

  // For videos on Firebase/direct URLs, we can use a <video> element for preview
  const canVideoPreview = media.isVid && !media.isDrive && !vidErr;

  const handleClick = () => {
    if (media.isDrive) {
      onDriveClick(media.url, media.name);
    } else {
      window.open(media.url, '_blank');
    }
  };

  // ── 1. Image thumbnail (Drive, direct images, Firebase images) ──
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

  // ── 2. Video preview (Firebase/direct video files — use <video> poster frame) ──
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

  // ── 3. Website link with favicon + domain ──
  if (media.isWebsite) {
    const favicon = getWebsiteFavicon(media.url);
    const domain = getDomainFromUrl(media.url);
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all text-left group"
        title={media.url}
      >
        <div className="shrink-0 w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
          {favicon ? (
            <img src={favicon} alt="" className="w-6 h-6" loading="lazy" />
          ) : (
            <LinkIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-gray-700 truncate">{media.name !== 'Link' ? media.name : domain}</span>
          <span className="block text-[10px] text-gray-400 truncate">{domain}</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
      </button>
    );
  }

  // ── 4. Generic fallback card ──
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all text-left group"
      title={media.name}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        {media.isVid ? <Video className="w-4.5 h-4.5 text-purple-500" /> :
         media.isImg ? <Image className="w-4.5 h-4.5 text-blue-400" /> :
         <FileText className="w-4.5 h-4.5 text-gray-400" />}
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
}

// ============================================================================
// EDITORIAL ROW
// ============================================================================

const EditorialRow: React.FC<{ item: PresentationItem; index: number; onDriveClick: (url: string, title: string) => void }> = ({ item, index, onDriveClick }) => {
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
        {/* Type badge */}
        <span className={`sm:mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
          <TypeIcon className="w-3 h-3" />
          {item.type}
        </span>
      </div>

      {/* CONTENT column */}
      <div className="py-3 px-4 sm:py-4 sm:px-5 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <div className="flex-1 min-w-0">
            <h3 dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }} className="text-sm font-semibold text-gray-900 leading-snug break-words">
              {item.title}
            </h3>
            {item.mainIdea && (
              <BidiText text={item.mainIdea} className="mt-1 text-xs text-gray-600 leading-relaxed" />
            )}
            {item.brief && (
              <BidiText text={item.brief} className="mt-1 text-xs text-gray-500 leading-relaxed" />
            )}
            {item.notes && (
              <BidiText text={item.notes} className="mt-1 text-[11px] text-gray-400 italic" />
            )}
          </div>
        </div>
      </div>

      {/* MEDIA column */}
      <div className="py-3 px-4 sm:py-4 border-t sm:border-t-0 sm:border-l border-gray-100 flex items-start">
        <MediaPreview item={item} onDriveClick={onDriveClick} />
      </div>
    </div>
  );
}

// ============================================================================
// PRINT STYLES (injected once)
// ============================================================================

const PRINT_STYLES = `
@media print {
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
}
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CalendarPresentationViewProps {
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  creativeCalendarItems: CreativeCalendarItem[];
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  clients: Client[];
  users: User[];
  checkPermission: (permission: string) => boolean;
  onBack: () => void;
}

const CalendarPresentationView: React.FC<CalendarPresentationViewProps> = ({
  creativeProjects,
  creativeCalendars,
  creativeCalendarItems,
  calendarMonths,
  calendarItems,
  clients,
  users,
  onBack,
}) => {
  // ── State ──
  const { user: currentUser } = useAuth();
  const [filterType, setFilterType] = useState<CalendarContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [driveModal, setDriveModal] = useState<{ url: string; title: string } | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);

  // ── Inject print styles ──
  useMemo(() => {
    const id = 'presentation-print-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = PRINT_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // ── Derive approved projects & calendars ──
  const approvedCalendars = useMemo(() => creativeCalendars.filter(c => c.status === 'APPROVED'), [creativeCalendars]);
  const approvedProjectIds = useMemo(() => new Set(approvedCalendars.map(c => c.creativeProjectId)), [approvedCalendars]);
  const approvedProjects = useMemo(() => creativeProjects.filter(p => approvedProjectIds.has(p.id) && !p.isArchived), [creativeProjects, approvedProjectIds]);

  // Auto-select first
  useMemo(() => {
    if (!selectedProjectId && approvedProjects.length > 0) {
      setSelectedProjectId(approvedProjects[0].id);
    }
  }, [approvedProjects, selectedProjectId]);

  // ── Selected calendar + items ──
  const selectedCalendar = useMemo(() => {
    if (!selectedProjectId) return null;
    return approvedCalendars.find(c => c.creativeProjectId === selectedProjectId) ?? null;
  }, [selectedProjectId, approvedCalendars]);

  const selectedProject = approvedProjects.find(p => p.id === selectedProjectId);
  const selectedClient = selectedProject ? clients.find(c => c.id === selectedProject.clientId) : null;

  // ── Build presentation items: prefer activated CalendarItems, fallback to CreativeCalendarItems ──
  const presentationItems = useMemo((): PresentationItem[] => {
    if (!selectedCalendar || !selectedProject) return [];

    // Try activated (production) items first
    const activatedMonth = calendarMonths.find(
      m => m.clientId === selectedCalendar.clientId && m.monthKey === selectedCalendar.monthKey
    );

    if (activatedMonth) {
      const items = calendarItems
        .filter(i => i.calendarMonthId === activatedMonth.id)
        .sort((a, b) => (a.publishAt || a.createdAt).localeCompare(b.publishAt || b.createdAt));
      if (items.length > 0) return items.map(calItemToPres);
    }

    // Fallback: creative calendar items
    const items = creativeCalendarItems
      .filter(i => i.creativeCalendarId === selectedCalendar.id)
      .sort((a, b) => (a.publishAt || a.createdAt).localeCompare(b.publishAt || b.createdAt));
    return items.map((item, idx) => creativeItemToPres(item, idx));
  }, [selectedCalendar, selectedProject, calendarMonths, calendarItems, creativeCalendarItems]);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    let items = presentationItems;
    if (filterType !== 'ALL') items = items.filter(i => i.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.mainIdea?.toLowerCase().includes(q) ||
        i.brief?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [presentationItems, filterType, searchQuery]);

  // ── Type counts ──
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: presentationItems.length };
    for (const item of presentationItems) c[item.type] = (c[item.type] || 0) + 1;
    return c;
  }, [presentationItems]);

  // ── Group by date ──
  const dateGroups = useMemo(() => {
    const groups: { dateKey: string; label: string; items: PresentationItem[] }[] = [];
    const map = new Map<string, PresentationItem[]>();
    for (const item of filteredItems) {
      const key = item.publishAt ? item.publishAt.slice(0, 10) : 'no-date';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    for (const [key, items] of map) {
      groups.push({
        dateKey: key,
        label: key === 'no-date' ? 'Unscheduled' : formatDate(key),
        items,
      });
    }
    return groups;
  }, [filteredItems]);

  const handleDriveClick = (url: string, title: string) => setDriveModal({ url, title });

  // ── Empty State ──
  if (approvedProjects.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <button onClick={onBack} className="no-print inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Creative Direction
          </button>
          <div className="text-center py-20">
            <Presentation className="w-12 h-12 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No Approved Calendars</h3>
            <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
              Once a calendar is approved through the review process, it will appear here as an editorial schedule.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {driveModal && (
        <DrivePreviewModal url={driveModal.url} title={driveModal.title} onClose={() => setDriveModal(null)} />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ── HEADER BAR ── */}
        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors self-start">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareManager(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Share Link Manager Modal */}
        {showShareManager && selectedCalendar && selectedProject && (
          <ShareLinkManager
            creativeProjectId={selectedProject.id}
            creativeCalendarId={selectedCalendar.id}
            calendarMonthId={
              calendarMonths.find(
                m => m.clientId === selectedCalendar.clientId && m.monthKey === selectedCalendar.monthKey
              )?.id || null
            }
            clientId={selectedProject.clientId}
            currentUserId={currentUser?.id || ''}
            onClose={() => setShowShareManager(false)}
          />
        )}

        {/* ── MAGAZINE MASTHEAD ── */}
        <header className="mb-10 border-b-2 border-gray-900 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 uppercase">
                {selectedClient?.name || 'Client'}
              </h1>
              <p className="text-sm text-gray-400 mt-1 font-medium tracking-wide uppercase">
                Content Calendar · {selectedCalendar?.monthKey || ''}
              </p>
            </div>

            {/* Calendar selector */}
            {approvedProjects.length > 1 && (
              <div className="relative no-print">
                <button
                  onClick={() => setSelectorOpen(!selectorOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {selectedCalendar?.monthKey || 'Select'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                </button>
                {selectorOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                    {approvedProjects.map(proj => {
                      const client = clients.find(c => c.id === proj.clientId);
                      const cal = approvedCalendars.find(c => c.creativeProjectId === proj.id);
                      const isActive = proj.id === selectedProjectId;
                      return (
                        <button
                          key={proj.id}
                          onClick={() => { setSelectedProjectId(proj.id); setSelectorOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {client?.name || 'Client'} — {cal?.monthKey || ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <span>{presentationItems.length} Items</span>
            {typeCounts['VIDEO'] && <span>{typeCounts['VIDEO']} Video</span>}
            {typeCounts['PHOTO'] && <span>{typeCounts['PHOTO']} Photo</span>}
            {typeCounts['MOTION'] && <span>{typeCounts['MOTION']} Motion</span>}
          </div>
        </header>

        {/* ── FILTERS ── */}
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border ${
                  filterType === opt.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-400 border-gray-200 hover:text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
                {typeCounts[opt.value] !== undefined && <span className="ml-1 opacity-60">({typeCounts[opt.value]})</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0 sm:max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── EDITORIAL TABLE ── */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Search className="w-8 h-8 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">
              {searchQuery || filterType !== 'ALL' ? 'No items match your filters.' : 'No items in this calendar.'}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[120px_1fr_300px] gap-0 bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <div className="py-3 px-4">Date</div>
              <div className="py-3 px-5">Content</div>
              <div className="py-3 px-4 border-l border-gray-200">Media</div>
            </div>

            {/* Rows */}
            {filteredItems.map((item, i) => (
              <EditorialRow key={item.id} item={item} index={i} onDriveClick={handleDriveClick} />
            ))}
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-gray-300 uppercase tracking-wider">
          <span>Editorial Schedule · {selectedClient?.name}</span>
          <span>{selectedCalendar?.monthKey} · {presentationItems.length} Items</span>
        </footer>
      </div>
    </div>
  );
};

export default CalendarPresentationView;
