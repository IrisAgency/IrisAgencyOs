import React, { useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { Video, Image as ImageIcon, Clapperboard, Calendar, ExternalLink, FileText, Check, X, ChevronLeft, ChevronRight, Maximize2, Download } from 'lucide-react';
import type { CreativeCalendarItem, CreativeRejectionReference } from '../../types';
import RejectionModal from './RejectionModal';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
const isImageUrl = (url: string): boolean => {
  const lower = url.toLowerCase().split('?')[0];
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};
const isImageFile = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

interface SwipeReviewCardProps {
  items: CreativeCalendarItem[];
  clientId: string;
  projectId: string;
  onApprove: (itemId: string) => void;
  onReject: (itemId: string, note: string, references: CreativeRejectionReference[]) => void;
  onComplete: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  VIDEO: Video,
  PHOTO: ImageIcon,
  MOTION: Clapperboard,
};

const TYPE_COLORS: Record<string, string> = {
  VIDEO: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  PHOTO: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  MOTION: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
};

const SwipeReviewCard: React.FC<SwipeReviewCardProps> = ({
  items,
  clientId,
  projectId,
  onApprove,
  onReject,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectingItem, setRejectingItem] = useState<CreativeCalendarItem | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [gone] = useState(new Set<number>());

  const SWIPE_THRESHOLD = 120;

  const [{ x, rot, scale }, api] = useSpring(() => ({
    x: 0,
    rot: 0,
    scale: 1,
    config: { friction: 50, tension: 500 },
  }));

  const currentItem = items[currentIndex];
  const isComplete = currentIndex >= items.length;

  const handleNext = useCallback((direction: 'left' | 'right') => {
    const item = items[currentIndex];
    if (!item) return;

    if (direction === 'right') {
      onApprove(item.id);
    } else {
      setRejectingItem(item);
      api.start({ x: 0, rot: 0, scale: 1 });
      return;
    }

    setReviewedIds(prev => new Set(prev).add(item.id));
    gone.add(currentIndex);

    // Animate out
    api.start({
      x: direction === 'right' ? 600 : -600,
      rot: direction === 'right' ? 15 : -15,
      config: { friction: 50, tension: 200 },
    });

    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) {
        onComplete();
      }
      setCurrentIndex(nextIndex);
      api.start({ x: 0, rot: 0, scale: 1, immediate: true });
    }, 300);
  }, [currentIndex, items, onApprove, api, gone, onComplete]);

  const bind = useDrag(({ active, movement: [mx], direction: [xDir], cancel }) => {
    if (rejectingItem) return;

    if (active && Math.abs(mx) > SWIPE_THRESHOLD) {
      const dir = xDir > 0 ? 'right' : 'left';
      cancel();
      handleNext(dir);
      return;
    }

    api.start({
      x: active ? mx : 0,
      rot: active ? mx / 20 : 0,
      scale: active ? 1.02 : 1,
      immediate: (name) => active && name === 'x',
    });
  }, {
    axis: 'x',
    filterTaps: true,
  });

  const handleRejectConfirm = (note: string, references: CreativeRejectionReference[]) => {
    if (!rejectingItem) return;
    onReject(rejectingItem.id, note, references);
    setReviewedIds(prev => new Set(prev).add(rejectingItem.id));
    gone.add(currentIndex);
    setRejectingItem(null);

    api.start({
      x: -600,
      rot: -15,
      config: { friction: 50, tension: 200 },
    });

    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) {
        onComplete();
      }
      setCurrentIndex(nextIndex);
      api.start({ x: 0, rot: 0, scale: 1, immediate: true });
    }, 300);
  };

  if (isComplete) {
    return null;
  }

  const TypeIcon = currentItem ? TYPE_ICONS[currentItem.type] || FileText : FileText;
  const typeColor = currentItem ? TYPE_COLORS[currentItem.type] || '' : '';

  // Compute glow color based on drag position
  const glowOpacity = x.to(v => Math.min(Math.abs(v) / SWIPE_THRESHOLD, 1) * 0.4);
  const approveGlow = x.to(v => v > 0 ? Math.min(v / SWIPE_THRESHOLD, 1) * 0.4 : 0);
  const rejectGlow = x.to(v => v < 0 ? Math.min(Math.abs(v) / SWIPE_THRESHOLD, 1) * 0.4 : 0);

  return (
    <div className="relative">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-iris-white/60">
          Item {currentIndex + 1} of {items.length}
        </span>
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < currentIndex
                  ? 'bg-iris-red'
                  : i === currentIndex
                  ? 'bg-iris-white'
                  : 'bg-iris-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Swipe hints */}
      <div className="flex justify-between mb-3 px-2">
        <div className="flex items-center gap-1.5 text-xs text-rose-400/60">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Swipe to Reject</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400/60">
          <span>Swipe to Approve</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Card Container - Fixed Height */}
      <div className="relative h-[500px] overflow-hidden touch-none">
        {/* Glow overlays */}
        <animated.div
          className="absolute inset-0 rounded-xl pointer-events-none z-10 border-2 border-emerald-400"
          style={{ opacity: approveGlow }}
        />
        <animated.div
          className="absolute inset-0 rounded-xl pointer-events-none z-10 border-2 border-rose-400"
          style={{ opacity: rejectGlow }}
        />

        {/* Swipeable Card */}
        <animated.div
          {...bind()}
          style={{
            x,
            rotateZ: rot.to(r => `${r}deg`),
            scale,
            touchAction: 'none',
          }}
          className="absolute inset-0 bg-iris-black/90 backdrop-blur-sm border border-iris-white/10 rounded-xl cursor-grab active:cursor-grabbing overflow-y-auto"
        >
          {currentItem && (
            <div className="p-5 space-y-4">
              {/* Type Badge + Title */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-iris-white truncate">{currentItem.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeColor}`}>
                      <TypeIcon className="w-3 h-3" />
                      {currentItem.type}
                    </span>
                    {currentItem.publishAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-iris-white/50">
                        <Calendar className="w-3 h-3" />
                        {new Date(currentItem.publishAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Idea */}
              {currentItem.mainIdea && (
                <div>
                  <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Main Idea</span>
                  <p className="mt-1 text-sm text-iris-white/90">{currentItem.mainIdea}</p>
                </div>
              )}

              {/* Brief Description */}
              {currentItem.briefDescription && (
                <div>
                  <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Brief</span>
                  <p className="mt-1 text-sm text-iris-white/80">{currentItem.briefDescription}</p>
                </div>
              )}

              {/* Notes */}
              {currentItem.notes && (
                <div>
                  <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Notes</span>
                  <p className="mt-1 text-sm text-iris-white/70">{currentItem.notes}</p>
                </div>
              )}

              {/* References — Image Previews + Links */}
              {((currentItem.referenceFiles?.length || 0) > 0 || (currentItem.referenceLinks?.length || 0) > 0) && (() => {
                const imageFiles = (currentItem.referenceFiles || []).filter(f => isImageFile(f.fileName));
                const imageLinks = (currentItem.referenceLinks || []).filter(l => isImageUrl(l.url));
                const nonImageFiles = (currentItem.referenceFiles || []).filter(f => !isImageFile(f.fileName));
                const nonImageLinks = (currentItem.referenceLinks || []).filter(l => !isImageUrl(l.url));

                return (
                  <div>
                    <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">References</span>

                    {/* Image thumbnails grid */}
                    {(imageFiles.length > 0 || imageLinks.length > 0) && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {imageFiles.map((file, i) => (
                          <button
                            key={`if${i}`}
                            type="button"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setLightboxUrl(file.downloadURL); }}
                            className="relative group aspect-square rounded-lg overflow-hidden border border-iris-white/10 hover:border-iris-red/50 transition-colors bg-iris-black/50"
                          >
                            <img
                              src={file.downloadURL}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/70 text-[10px] text-iris-white/80 truncate">
                              {file.fileName}
                            </span>
                          </button>
                        ))}
                        {imageLinks.map((link, i) => (
                          <button
                            key={`il${i}`}
                            type="button"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setLightboxUrl(link.url); }}
                            className="relative group aspect-square rounded-lg overflow-hidden border border-iris-white/10 hover:border-blue-400/50 transition-colors bg-iris-black/50"
                          >
                            <img
                              src={link.url}
                              alt={link.title || link.url}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/70 text-[10px] text-iris-white/80 truncate">
                              {link.title || 'Image'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Non-image files */}
                    {nonImageFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {nonImageFiles.map((file, i) => (
                          <button
                            key={`nf${i}`}
                            type="button"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); window.open(file.downloadURL, '_blank', 'noopener,noreferrer'); }}
                            className="flex items-center gap-1.5 text-sm text-iris-red hover:text-iris-red/80 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{file.fileName}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Non-image links */}
                    {nonImageLinks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {nonImageLinks.map((link, i) => (
                          <button
                            key={`nl${i}`}
                            type="button"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); window.open(link.url, '_blank', 'noopener,noreferrer'); }}
                            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{link.title || link.url}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </animated.div>
      </div>

      {/* Manual Approve/Reject buttons (accessibility fallback) */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => handleNext('left')}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
        >
          <X className="w-5 h-5" />
          Reject
        </button>
        <button
          onClick={() => handleNext('right')}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium"
        >
          <Check className="w-5 h-5" />
          Approve
        </button>
      </div>

      {/* Rejection Modal */}
      {rejectingItem && (
        <RejectionModal
          itemTitle={rejectingItem.title}
          clientId={clientId}
          projectId={projectId}
          onConfirm={handleRejectConfirm}
          onCancel={() => {
            setRejectingItem(null);
            api.start({ x: 0, rot: 0, scale: 1 });
          }}
        />
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full backdrop-blur-sm transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); window.open(lightboxUrl, '_blank', 'noopener,noreferrer'); }}
            className="absolute top-4 left-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full backdrop-blur-sm transition-colors z-10"
            title="Open in new tab"
          >
            <Download className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default SwipeReviewCard;
