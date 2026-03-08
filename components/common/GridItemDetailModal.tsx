import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Calendar, ExternalLink, FileText, ChevronLeft, ChevronRight,
  Play, Link as LinkIcon, Save, Loader2, StickyNote, Layers,
} from 'lucide-react';

import {
  PresentationItem,
  BidiText,
  formatPublishDay,
  formatDate,
  TYPE_ICONS,
  TYPE_BADGE_COLORS,
  TYPE_DOT_COLORS,
  collectMediaEntries,
  MediaEntry,
  getDriveThumbnailUrl,
  getWebsiteFavicon,
  getDomainFromUrl,
} from '../../utils/presentationHelpers';

// ============================================================================
// GRID ITEM DETAIL MODAL
// ============================================================================

interface GridItemDetailModalProps {
  item: PresentationItem;
  onClose: () => void;
  onDriveClick: (url: string, title: string) => void;
  onSaveNotes?: (itemId: string, notes: string) => Promise<void>;
}

const GridItemDetailModal: React.FC<GridItemDetailModalProps> = ({
  item,
  onClose,
  onDriveClick,
  onSaveNotes,
}) => {
  const TypeIcon = TYPE_ICONS[item.type] || FileText;
  const badgeColor = TYPE_BADGE_COLORS[item.type] || 'bg-gray-50 text-gray-600 border-gray-200';
  const dotColor = TYPE_DOT_COLORS[item.type] || 'bg-gray-400';

  // Collect all visual media (images + videos + drive) for the slider
  const allMedia = useMemo(() => collectMediaEntries(item), [item]);
  const visualMedia = useMemo(() => allMedia.filter(m => m.isImg || m.isVid || m.driveId), [allMedia]);
  const websiteLinks = useMemo(() => allMedia.filter(m => m.isWebsite), [allMedia]);

  // Slider state
  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = visualMedia.length;

  const goNext = useCallback(() => setSlideIndex(i => (i + 1) % slideCount), [slideCount]);
  const goPrev = useCallback(() => setSlideIndex(i => (i - 1 + slideCount) % slideCount), [slideCount]);

  // Notes state
  const [notesText, setNotesText] = useState(item.presentationNotes || '');
  const [saving, setSaving] = useState(false);
  const hasChanged = notesText !== (item.presentationNotes || '');

  const handleSaveNotes = async () => {
    if (!onSaveNotes || !hasChanged) return;
    setSaving(true);
    try {
      await onSaveNotes(item.id, notesText);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${badgeColor}`}>
              <TypeIcon className="w-3 h-3" />
              {item.type}
            </span>
            {item.isCarousel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 bg-indigo-50 text-indigo-600 border-indigo-200">
                <Layers className="w-3 h-3" />
                Carousel
              </span>
            )}
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
        <div className="flex-1 overflow-y-auto">

          {/* ── MEDIA SLIDER ────────────────────────────── */}
          {slideCount > 0 && (
            <div className="relative bg-gray-100">
              <div className="w-full aspect-[4/3] sm:aspect-video relative overflow-hidden">
                <SliderSlide
                  media={visualMedia[slideIndex]}
                  title={item.title}
                  onDriveClick={onDriveClick}
                />
              </div>

              {/* Arrows */}
              {slideCount > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {slideCount > 1 && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {visualMedia.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`rounded-full transition-all ${
                        i === slideIndex
                          ? 'w-5 h-1.5 bg-white shadow-md'
                          : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Counter badge */}
              {slideCount > 1 && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm z-10">
                  {slideIndex + 1} / {slideCount}
                </div>
              )}
            </div>
          )}

          {/* ── CONTENT AREA ────────────────────────────── */}
          <div className="p-5 space-y-5">

            {/* Date + Seq Label */}
            <div className="flex flex-wrap items-center gap-2">
              {item.publishAt && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{formatDate(item.publishAt)}</span>
                  <span className="text-[10px] text-gray-400 ml-0.5">
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

            {/* Main Idea */}
            {item.mainIdea && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                  Main Idea
                </h3>
                <BidiText text={item.mainIdea} className="text-sm text-gray-700 leading-relaxed" />
              </div>
            )}

            {/* Brief */}
            {item.brief && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Brief
                </h3>
                <BidiText text={item.brief} className="text-sm text-gray-600 leading-relaxed" />
              </div>
            )}

            {/* Original Notes */}
            {item.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Notes
                </h3>
                <BidiText text={item.notes} className="text-sm text-gray-500 leading-relaxed italic" />
              </div>
            )}

            {/* ── REFERENCE LINKS ────────────────────────── */}
            {websiteLinks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  Reference Links
                </h3>
                <div className="space-y-1.5">
                  {websiteLinks.map((link, idx) => {
                    const favicon = getWebsiteFavicon(link.url);
                    const domain = getDomainFromUrl(link.url);
                    return (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                          {favicon ? (
                            <img src={favicon} alt="" className="w-5 h-5" loading="lazy" />
                          ) : (
                            <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-medium text-gray-700 truncate group-hover:text-blue-700 transition-colors">
                            {link.name !== 'Link' ? link.name : domain}
                          </span>
                          <span className="block text-[10px] text-gray-400 truncate">{domain}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PRESENTATION NOTES (editable) ──────────── */}
            {onSaveNotes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Presentation Notes
                </h3>
                <div className="relative">
                  <textarea
                    dir="auto"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add notes for this content…"
                    className="w-full min-h-[80px] px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 placeholder:text-gray-400 transition-all"
                    rows={3}
                  />
                  {hasChanged && (
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
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

// ============================================================================
// SLIDER SLIDE — renders a single media entry
// ============================================================================

const SliderSlide: React.FC<{
  media: MediaEntry;
  title: string;
  onDriveClick: (url: string, title: string) => void;
}> = ({ media, title, onDriveClick }) => {
  const [imgErr, setImgErr] = useState(false);

  // Drive thumbnail
  if (media.driveId) {
    const thumbUrl = getDriveThumbnailUrl(media.driveId);
    return (
      <button
        onClick={() => onDriveClick(media.url, media.name)}
        className="w-full h-full relative group"
      >
        {!imgErr ? (
          <img
            src={thumbUrl}
            alt={media.name}
            className="w-full h-full object-contain bg-gray-100"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-gray-700 ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/90 shadow-sm flex items-center gap-1">
          <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
          <span className="text-[9px] font-semibold text-gray-500">Drive</span>
        </div>
      </button>
    );
  }

  // Video file
  if (media.isVid) {
    return (
      <video
        src={media.url}
        className="w-full h-full object-contain bg-black"
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  // Image file
  if (media.isImg && !imgErr) {
    return (
      <img
        src={media.url}
        alt={title}
        className="w-full h-full object-contain bg-gray-100"
        onError={() => setImgErr(true)}
        loading="lazy"
      />
    );
  }

  // Fallback
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-2">
      <FileText className="w-10 h-10 text-gray-300" />
      <span className="text-xs text-gray-400">{media.name}</span>
    </div>
  );
};

export default GridItemDetailModal;
