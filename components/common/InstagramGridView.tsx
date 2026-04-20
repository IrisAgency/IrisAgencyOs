import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Calendar, Play, Pin, Layers, Users } from 'lucide-react';

import {
  PresentationItem,
  resolveItemThumbnail,
  resolveItemLinkPreviewUrl,
  formatPublishDay,
  TYPE_ICONS,
  TYPE_BADGE_COLORS,
} from '../../utils/presentationHelpers';
import LinkPreviewThumbnail from './LinkPreviewThumbnail';

// ============================================================================
// INSTAGRAM GRID VIEW
// ============================================================================

interface InstagramGridViewProps {
  items: PresentationItem[];
  sortDirection: 'asc' | 'desc';
  onSortToggle: () => void;
  onItemClick: (item: PresentationItem) => void;
}

const InstagramGridView: React.FC<InstagramGridViewProps> = ({ items, sortDirection, onSortToggle, onItemClick }) => {
  const sortedItems = useMemo(() => {
    // Separate pinned items from the rest
    const pinned = items
      .filter((i) => i.pinnedInGrid && i.pinnedInGrid > 0)
      .sort((a, b) => (a.pinnedInGrid || 0) - (b.pinnedInGrid || 0));
    const unpinned = items.filter((i) => !i.pinnedInGrid || i.pinnedInGrid <= 0);

    // Sort unpinned by date
    unpinned.sort((a, b) => {
      const dateA = a.publishAt ? new Date(a.publishAt).getTime() : Infinity;
      const dateB = b.publishAt ? new Date(b.publishAt).getTime() : Infinity;
      if (dateA === Infinity && dateB === Infinity) return 0;
      if (dateA === Infinity) return 1;
      if (dateB === Infinity) return 1;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // Pinned items always appear first
    return [...pinned, ...unpinned];
  }, [items, sortDirection]);

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
        </span>
        <button
          onClick={onSortToggle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors font-medium"
        >
          {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          {sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      {/* Instagram-style Grid — always 3 columns, tight gap */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
        }}
      >
        {sortedItems.map((item) => (
          <GridCard key={item.id} item={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// GRID CARD — Instagram-style square thumbnail
// ============================================================================

const GridCard: React.FC<{
  item: PresentationItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const thumbnailUrl = useMemo(() => resolveItemThumbnail(item), [item]);
  const linkPreviewUrl = useMemo(() => (!thumbnailUrl ? resolveItemLinkPreviewUrl(item) : null), [item, thumbnailUrl]);

  const TypeIcon = TYPE_ICONS[item.type] || Calendar;
  const badgeColor = TYPE_BADGE_COLORS[item.type] || 'bg-gray-50 text-gray-600 border-gray-200';
  const isVideo = item.type === 'VIDEO';
  const isMotion = item.type === 'MOTION';

  // Check if the thumbnail URL is actually a video file
  const isVideoThumb = useMemo(() => {
    if (!thumbnailUrl) return false;
    return /\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv|3gp)(\?.*)?$/i.test(thumbnailUrl);
  }, [thumbnailUrl]);

  return (
    /*
     * Outer wrapper: a plain <div> with padding-bottom: 100% creates
     * a perfect square. Using a <div> instead of <button> avoids
     * browser-specific quirks with percentage padding on form elements.
     */
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className="relative w-full overflow-hidden bg-gray-100 cursor-pointer group"
      style={{ paddingBottom: '100%' }}
    >
      {/* Thumbnail — fills the entire square */}
      {thumbnailUrl && !imgErr && isVideoThumb ? (
        /* Video file → use <video> element to show first frame */
        <video
          src={thumbnailUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          onError={() => setImgErr(true)}
        />
      ) : thumbnailUrl && !imgErr ? (
        <img
          src={thumbnailUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
      ) : linkPreviewUrl ? (
        /* Fallback: OG image from link preview */
        <div className="absolute inset-0 w-full h-full">
          <LinkPreviewThumbnail url={linkPreviewUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        /* Placeholder when no image */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          <TypeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300 mb-1" />
          <span className="text-[8px] sm:text-[10px] text-gray-400 font-medium text-center line-clamp-2 leading-tight px-1">
            {item.title}
          </span>
        </div>
      )}

      {/* Subtle gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none" />

      {/* Type badge — top-left, tiny on mobile */}
      <div
        className={`absolute top-1 left-1 sm:top-1.5 sm:left-1.5 inline-flex items-center gap-0.5 px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[7px] sm:text-[9px] font-bold uppercase tracking-wider border backdrop-blur-sm ${badgeColor}`}
      >
        <TypeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </div>

      {/* Pin badge for pinned items */}
      {item.pinnedInGrid && item.pinnedInGrid > 0 && (
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
          <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#DF1E3C] rotate-45" />
        </div>
      )}

      {/* Carousel badge */}
      {item.isCarousel && (
        <div
          className={`absolute ${item.pinnedInGrid && item.pinnedInGrid > 0 ? 'top-7 sm:top-8' : 'top-1 sm:top-1.5'} right-1 sm:right-1.5 z-10 flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-600/90 backdrop-blur-sm shadow-md`}
        >
          <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
        </div>
      )}

      {/* Team notes indicator */}
      {item.teamNotes && item.teamNotes.length > 0 && (
        <div className="absolute bottom-5 sm:bottom-6 right-1 sm:right-1.5 z-10 flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-600/90 backdrop-blur-sm shadow-md">
          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          <span className="text-[7px] sm:text-[9px] font-bold text-white">{item.teamNotes.length}</span>
        </div>
      )}

      {/* Play icon for video/motion — centered in card */}
      {(isVideo || isMotion) && thumbnailUrl && !imgErr && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Play className="w-3 h-3 sm:w-4 sm:h-4 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}

      {/* Bottom label — very compact, only title, clipped to 1 line */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1 sm:px-2 sm:pb-1.5 pointer-events-none">
        <div
          dir="auto"
          style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
          className="text-[8px] sm:text-[10px] font-semibold text-white leading-tight line-clamp-1 drop-shadow-md"
        >
          {item.title}
        </div>
      </div>
    </div>
  );
};

export default InstagramGridView;
