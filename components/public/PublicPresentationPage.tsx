import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp,
} from 'firebase/firestore';
import type {
  CalendarMonth, CalendarItem, CreativeCalendar, CreativeCalendarItem,
  Client, CalendarContentType, CalendarReferenceLink, CalendarReferenceFile,
  PresentationShare,
} from '../../types';

import {
  Video, Image, Clapperboard, Calendar, ExternalLink, FileText,
  Search, X, Link as LinkIcon, Play, Loader2, ShieldX, Clock,
  AlertTriangle, Layers,
} from 'lucide-react';

// ============================================================================
// HELPERS  (copied from CalendarPresentationView — keeping standalone)
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

function getWebsiteFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

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
const TYPE_DOT_COLORS: Record<string, string> = { VIDEO: 'bg-purple-500', PHOTO: 'bg-blue-500', MOTION: 'bg-amber-500' };
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
  seqLabel: string;
  isCarousel?: boolean;
}

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
    presentationNotes: item.presentationNotes || '',
    isCarousel: item.isCarousel || false,
  };
}

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
    presentationNotes: item.presentationNotes || '',
    isCarousel: item.isCarousel || false,
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-800 truncate">{title || 'Drive Preview'}</span>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Open in Drive <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="w-full aspect-video bg-gray-100">
          <iframe src={embedUrl} className="w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen title={title || 'Drive preview'} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MEDIA PREVIEW
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

  for (const link of item.referenceLinks) {
    const norm = normalizeUrl(link.url);
    if (!norm) continue;
    const isDrive = isGoogleDriveUrl(norm);
    const isFirebase = isFirebaseStorageUrl(norm);
    const isImg = isDirectImageUrl(norm) || (isFirebase && isImageFile(link.title || ''));
    const isVid = isFirebase && isVideoFile(link.title || '');
    allMedia.push({
      url: norm, name: link.title || 'Link', isDrive, isFirebase, isImg, isVid,
      isWebsite: !isDrive && !isFirebase && !isImg && !isVid,
      driveId: isDrive ? extractDriveFileId(norm) : null,
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
      url, name: file.fileName || 'File', isDrive, isFirebase, isImg, isVid,
      isWebsite: false, driveId: isDrive ? extractDriveFileId(url) : null,
    });
  }

  if (allMedia.length === 0) return <span className="text-[11px] text-gray-300 italic">No media</span>;

  return (
    <div className="flex flex-col gap-2 w-full">
      {allMedia.map((m, i) => <MediaThumb key={i} media={m} onDriveClick={onDriveClick} />)}
    </div>
  );
}

const MediaThumb: React.FC<{ media: MediaEntry; onDriveClick: (url: string, title: string) => void }> = ({ media, onDriveClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const [vidErr, setVidErr] = useState(false);

  const thumbSrc = media.driveId ? getDriveThumbnailUrl(media.driveId) : media.isImg ? media.url : null;
  const canVideoPreview = media.isVid && !media.isDrive && !vidErr;

  const handleClick = () => {
    if (media.isDrive) onDriveClick(media.url, media.name);
    else window.open(media.url, '_blank');
  };

  if (thumbSrc && !imgErr) {
    return (
      <button onClick={handleClick} className="relative w-full rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group bg-gray-50" title={media.name}>
        <div className="w-full aspect-[16/10] bg-gray-100 overflow-hidden">
          <img src={thumbSrc} alt={media.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} loading="lazy" />
        </div>
        {(media.isVid || (media.isDrive && !media.isImg)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm"><Play className="w-4 h-4 text-gray-700 ml-0.5" /></div>
          </div>
        )}
        {media.isImg && !media.isDrive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink className="w-3.5 h-3.5 text-gray-600" /></div>
          </div>
        )}
        {media.isDrive && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 shadow-sm flex items-center gap-1">
            <ExternalLink className="w-2.5 h-2.5 text-gray-500" /><span className="text-[9px] font-semibold text-gray-500">Drive</span>
          </div>
        )}
      </button>
    );
  }

  if (canVideoPreview) {
    return (
      <button onClick={handleClick} className="relative w-full rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all group bg-gray-50" title={media.name}>
        <div className="w-full aspect-[16/10] bg-black overflow-hidden">
          <video src={media.url} className="w-full h-full object-cover" muted preload="metadata" onError={() => setVidErr(true)} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm"><Play className="w-4 h-4 text-gray-700 ml-0.5" /></div>
        </div>
      </button>
    );
  }

  if (media.isWebsite) {
    const favicon = getWebsiteFavicon(media.url);
    const domain = getDomainFromUrl(media.url);
    return (
      <button onClick={handleClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all text-left group" title={media.url}>
        <div className="shrink-0 w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
          {favicon ? <img src={favicon} alt="" className="w-6 h-6" loading="lazy" /> : <LinkIcon className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-xs font-medium text-gray-700 truncate">{media.name !== 'Link' ? media.name : domain}</span>
          <span className="block text-[10px] text-gray-400 truncate">{domain}</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
      </button>
    );
  }

  return (
    <button onClick={handleClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 hover:shadow-sm transition-all text-left group" title={media.name}>
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        {media.isVid ? <Video className="w-4 h-4 text-purple-500" /> : media.isImg ? <Image className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-gray-700 truncate">{media.name}</span>
        <span className="block text-[10px] text-gray-400 truncate">{media.isVid ? 'Video file' : media.isImg ? 'Image file' : 'File'}</span>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </button>
  );
};

// ============================================================================
// EDITORIAL ROW
// ============================================================================

const EditorialRow: React.FC<{ item: PresentationItem; onDriveClick: (url: string, title: string) => void }> = ({ item, onDriveClick }) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const dotColor = TYPE_DOT_COLORS[item.type] || 'bg-gray-400';
  const badgeColor = TYPE_BADGE_COLORS[item.type] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="group flex flex-col sm:grid sm:grid-cols-[120px_1fr_300px] gap-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors print:break-inside-avoid">
      <div className="py-3 px-4 sm:py-4 flex flex-row sm:flex-col items-center sm:items-start justify-start gap-3 sm:gap-0 sm:border-r border-b sm:border-b-0 border-gray-100">
        <div className="flex sm:flex-col items-baseline sm:items-start gap-1.5 sm:gap-0">
          {item.publishAt ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{formatPublishDay(item.publishAt).split(',')[0]}</span>
              <span className="text-lg font-bold text-gray-800 leading-tight">{new Date(item.publishAt).getDate()}</span>
              <span className="text-[11px] text-gray-400">{new Date(item.publishAt).toLocaleDateString('en-US', { month: 'short' })}</span>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">No date</span>
          )}
        </div>
        <span className={`sm:mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
          <TypeIcon className="w-3 h-3" />{item.type}
        </span>
        {item.isCarousel && (
          <span className="sm:mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-600 border-indigo-200">
            <Layers className="w-3 h-3" />
            Carousel
          </span>
        )}
      </div>

      <div className="py-3 px-4 sm:py-4 sm:px-5 min-w-0">
        <div className="flex items-start gap-2.5">
          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <div className="flex-1 min-w-0">
            <h3 dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }} className="text-sm font-semibold text-gray-900 leading-snug break-words">{item.title}</h3>
            {item.mainIdea && <BidiText text={item.mainIdea} className="mt-1 text-xs text-gray-600 leading-relaxed" />}
            {item.brief && <BidiText text={item.brief} className="mt-1 text-xs text-gray-500 leading-relaxed" />}
            {item.notes && <BidiText text={item.notes} className="mt-1 text-[11px] text-gray-400 italic" />}
          </div>
        </div>
      </div>

      <div className="py-3 px-4 sm:py-4 border-t sm:border-t-0 sm:border-l border-gray-100 flex items-start">
        <MediaPreview item={item} onDriveClick={onDriveClick} />
      </div>
    </div>
  );
};

// ============================================================================
// PRINT STYLES
// ============================================================================

const PRINT_STYLES = `
@media print {
  body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
}
`;

// ============================================================================
// STATUS PAGES
// ============================================================================

function StatusPage({ icon: Icon, title, message, color = 'gray' }: { icon: React.ElementType; title: string; message: string; color?: string }) {
  const iconColors: Record<string, string> = {
    gray: 'text-gray-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
  };
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Icon className={`w-16 h-16 mx-auto mb-4 ${iconColors[color] || iconColors.gray}`} />
        <h1 className="text-xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-gray-300 animate-spin" />
        <p className="text-sm text-gray-400">Loading presentation…</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PUBLIC PAGE
// ============================================================================

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'disabled' }
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      share: PresentationShare;
      clientName: string;
      monthKey: string;
      items: PresentationItem[];
    };

const PublicPresentationPage: React.FC = () => {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [filterType, setFilterType] = useState<CalendarContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveModal, setDriveModal] = useState<{ url: string; title: string } | null>(null);

  // Inject print styles
  useMemo(() => {
    const id = 'public-presentation-print-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = PRINT_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // Extract token from URL: /presentation/share/:token
  const token = useMemo(() => {
    const parts = window.location.pathname.split('/');
    // Expected: ['', 'presentation', 'share', '<token>']
    if (parts.length >= 4 && parts[1] === 'presentation' && parts[2] === 'share') {
      return parts[3];
    }
    return null;
  }, []);

  // Load all data
  useEffect(() => {
    if (!token) {
      setState({ status: 'not-found' });
      return;
    }

    let cancelled = false;

    async function loadPresentation() {
      try {
        // 1. Find the share doc by token
        const sharesRef = collection(db, 'presentation_shares');
        const shareQuery = query(sharesRef, where('token', '==', token));
        const shareSnap = await getDocs(shareQuery);

        if (shareSnap.empty) {
          if (!cancelled) setState({ status: 'not-found' });
          return;
        }

        const shareDoc = shareSnap.docs[0];
        const share = { id: shareDoc.id, ...shareDoc.data() } as PresentationShare;

        // 2. Check active
        if (!share.isActive) {
          if (!cancelled) setState({ status: 'disabled' });
          return;
        }

        // 3. Check expiry
        if (share.expiresAt) {
          const expiryDate = new Date(share.expiresAt);
          if (expiryDate < new Date()) {
            if (!cancelled) setState({ status: 'expired' });
            return;
          }
        }

        // 4. Increment access count (fire-and-forget)
        updateDoc(doc(db, 'presentation_shares', shareDoc.id), {
          accessCount: increment(1),
          lastOpenedAt: new Date().toISOString(),
        }).catch(() => {});

        // 5. Load client name
        let clientName = 'Client';
        try {
          const clientDoc = await getDoc(doc(db, 'clients', share.clientId));
          if (clientDoc.exists()) {
            clientName = (clientDoc.data() as Client).name || 'Client';
          }
        } catch {}

        // 6. Load calendar items — prefer activated CalendarItems, fallback to CreativeCalendarItems
        let items: PresentationItem[] = [];
        let monthKey = '';

        // Try activated calendar month first
        if (share.calendarMonthId) {
          try {
            const monthDoc = await getDoc(doc(db, 'calendar_months', share.calendarMonthId));
            if (monthDoc.exists()) {
              const month = { id: monthDoc.id, ...monthDoc.data() } as CalendarMonth;
              monthKey = month.monthKey;

              const itemsQuery = query(
                collection(db, 'calendar_items'),
                where('calendarMonthId', '==', month.id)
              );
              const itemsSnap = await getDocs(itemsQuery);
              const calItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarItem));
              calItems.sort((a, b) => (a.publishAt || a.createdAt).localeCompare(b.publishAt || b.createdAt));
              if (calItems.length > 0) {
                items = calItems.map(calItemToPres);
              }
            }
          } catch {}
        }

        // Fallback to creative calendar items
        if (items.length === 0 && share.creativeCalendarId) {
          try {
            const calDoc = await getDoc(doc(db, 'creative_calendars', share.creativeCalendarId));
            if (calDoc.exists()) {
              const cal = { id: calDoc.id, ...calDoc.data() } as CreativeCalendar;
              if (!monthKey) monthKey = cal.monthKey;

              const itemsQuery = query(
                collection(db, 'creative_calendar_items'),
                where('creativeCalendarId', '==', cal.id)
              );
              const itemsSnap = await getDocs(itemsQuery);
              const creativeItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CreativeCalendarItem));
              creativeItems.sort((a, b) => (a.publishAt || a.createdAt).localeCompare(b.publishAt || b.createdAt));
              items = creativeItems.map((item, idx) => creativeItemToPres(item, idx));
            }
          } catch {}
        }

        if (!cancelled) {
          setState({
            status: 'ready',
            share,
            clientName,
            monthKey,
            items,
          });
        }
      } catch (err: any) {
        console.error('Failed to load shared presentation:', err);
        if (!cancelled) {
          setState({ status: 'error', message: 'Something went wrong. Please try again later.' });
        }
      }
    }

    loadPresentation();
    return () => { cancelled = true; };
  }, [token]);

  // ── Render status pages ──
  if (state.status === 'loading') return <LoadingPage />;
  if (state.status === 'not-found') return <StatusPage icon={AlertTriangle} title="Presentation Not Found" message="This link is invalid or has been removed." color="gray" />;
  if (state.status === 'disabled') return <StatusPage icon={ShieldX} title="Link Disabled" message="This presentation link has been disabled by the team." color="red" />;
  if (state.status === 'expired') return <StatusPage icon={Clock} title="Link Expired" message="This presentation link has expired. Contact the team for a new link." color="amber" />;
  if (state.status === 'error') return <StatusPage icon={AlertTriangle} title="Error" message={state.message} color="red" />;

  // ── Ready — render the editorial layout ──
  const { clientName, monthKey, items } = state;

  return (
    <ReadOnlyPresentation
      clientName={clientName}
      monthKey={monthKey}
      items={items}
      filterType={filterType}
      setFilterType={setFilterType}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      driveModal={driveModal}
      setDriveModal={setDriveModal}
    />
  );
};

// ============================================================================
// READ-ONLY PRESENTATION RENDERER
// ============================================================================

interface ReadOnlyPresentationProps {
  clientName: string;
  monthKey: string;
  items: PresentationItem[];
  filterType: CalendarContentType | 'ALL';
  setFilterType: (v: CalendarContentType | 'ALL') => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  driveModal: { url: string; title: string } | null;
  setDriveModal: (v: { url: string; title: string } | null) => void;
}

const ReadOnlyPresentation: React.FC<ReadOnlyPresentationProps> = ({
  clientName, monthKey, items, filterType, setFilterType, searchQuery, setSearchQuery, driveModal, setDriveModal,
}) => {
  const filteredItems = useMemo(() => {
    let out = items;
    if (filterType !== 'ALL') out = out.filter(i => i.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      out = out.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.mainIdea?.toLowerCase().includes(q) ||
        i.brief?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, filterType, searchQuery]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length };
    for (const item of items) c[item.type] = (c[item.type] || 0) + 1;
    return c;
  }, [items]);

  const handleDriveClick = (url: string, title: string) => setDriveModal({ url, title });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {driveModal && <DrivePreviewModal url={driveModal.url} title={driveModal.title} onClose={() => setDriveModal(null)} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* MASTHEAD */}
        <header className="mb-10 border-b-2 border-gray-900 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 uppercase">
              {clientName}
            </h1>
            <p className="text-sm text-gray-400 mt-1 font-medium tracking-wide uppercase">
              Content Calendar · {monthKey}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <span>{items.length} Items</span>
            {typeCounts['VIDEO'] ? <span>{typeCounts['VIDEO']} Video</span> : null}
            {typeCounts['PHOTO'] ? <span>{typeCounts['PHOTO']} Photo</span> : null}
            {typeCounts['MOTION'] ? <span>{typeCounts['MOTION']} Motion</span> : null}
          </div>
        </header>

        {/* FILTERS */}
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

        {/* EDITORIAL TABLE */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Search className="w-8 h-8 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">
              {searchQuery || filterType !== 'ALL' ? 'No items match your filters.' : 'No items in this calendar.'}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="hidden sm:grid sm:grid-cols-[120px_1fr_300px] gap-0 bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <div className="py-3 px-4">Date</div>
              <div className="py-3 px-5">Content</div>
              <div className="py-3 px-4 border-l border-gray-200">Media</div>
            </div>
            {filteredItems.map(item => (
              <EditorialRow key={item.id} item={item} onDriveClick={handleDriveClick} />
            ))}
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-gray-300 uppercase tracking-wider">
          <span>Editorial Schedule · {clientName}</span>
          <span>{monthKey} · {items.length} Items</span>
        </footer>

        {/* Powered by */}
        <div className="mt-4 text-center">
          <span className="text-[10px] text-gray-200 tracking-wide">Powered by IRIS Agency OS</span>
        </div>
      </div>
    </div>
  );
};

export default PublicPresentationPage;
