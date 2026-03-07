import React from 'react';
import {
  X, Calendar, ExternalLink, FileText,
} from 'lucide-react';

import {
  PresentationItem,
  BidiText,
  formatPublishDay,
  formatDate,
  TYPE_ICONS,
  TYPE_BADGE_COLORS,
  TYPE_DOT_COLORS,
  MediaPreview,
  resolveItemThumbnail,
  resolveItemLinkPreviewUrl,
} from '../../utils/presentationHelpers';
import LinkPreviewThumbnail from './LinkPreviewThumbnail';

// ============================================================================
// GRID ITEM DETAIL MODAL
// ============================================================================

interface GridItemDetailModalProps {
  item: PresentationItem;
  onClose: () => void;
  onDriveClick: (url: string, title: string) => void;
}

const GridItemDetailModal: React.FC<GridItemDetailModalProps> = ({
  item,
  onClose,
  onDriveClick,
}) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const badgeColor = TYPE_BADGE_COLORS[item.type] || 'bg-gray-50 text-gray-600 border-gray-200';
  const dotColor = TYPE_DOT_COLORS[item.type] || 'bg-gray-400';
  const thumbnailUrl = resolveItemThumbnail(item);
  const linkPreviewUrl = !thumbnailUrl ? resolveItemLinkPreviewUrl(item) : null;
  const isVideoThumb = thumbnailUrl ? /\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv|3gp)(\?.*)?$/i.test(thumbnailUrl) : false;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeColor}`}>
              <TypeIcon className="w-3 h-3" />
              {item.type}
            </span>
            <h2
              dir="auto"
              style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
              className="text-sm sm:text-base font-bold text-gray-900 truncate"
            >
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Thumbnail Preview */}
          {thumbnailUrl && isVideoThumb ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <div className="w-full aspect-video relative">
                <video
                  src={thumbnailUrl}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
          ) : thumbnailUrl ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <div className="w-full aspect-video relative">
                <img
                  src={thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          ) : linkPreviewUrl ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <div className="w-full aspect-video relative">
                <LinkPreviewThumbnail
                  url={linkPreviewUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* Date + Seq Label */}
          <div className="flex flex-wrap items-center gap-3">
            {item.publishAt && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">{formatDate(item.publishAt)}</span>
                <span className="text-[10px] text-gray-400 ml-1">
                  ({formatPublishDay(item.publishAt)})
                </span>
              </div>
            )}
            {item.seqLabel && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 bg-gray-50 border border-gray-100 rounded-md">
                {item.seqLabel}
              </span>
            )}
            {item.source && (
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 py-1 bg-gray-50 border border-gray-100 rounded-md">
                {item.source === 'activated' ? 'Production' : 'Creative'}
              </span>
            )}
          </div>

          {/* Main Idea (Creative items) */}
          {item.mainIdea && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                Main Idea
              </h3>
              <BidiText text={item.mainIdea} className="text-sm text-gray-700 leading-relaxed" />
            </div>
          )}

          {/* Primary Brief */}
          {item.brief && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Brief
              </h3>
              <BidiText text={item.brief} className="text-sm text-gray-600 leading-relaxed" />
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Notes
              </h3>
              <BidiText text={item.notes} className="text-sm text-gray-500 leading-relaxed italic" />
            </div>
          )}

          {/* Reference Links */}
          {item.referenceLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Reference Links
              </h3>
              <div className="space-y-1.5">
                {item.referenceLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors group"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    <span className="truncate">{link.title || link.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Media Files */}
          {(item.referenceFiles.length > 0 || item.referenceLinks.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Media
              </h3>
              <MediaPreview item={item} onDriveClick={onDriveClick} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GridItemDetailModal;
