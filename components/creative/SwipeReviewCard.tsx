import React, { useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { Video, Image, Clapperboard, Calendar, ExternalLink, FileText, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CreativeCalendarItem, CreativeRejectionReference } from '../../types';
import RejectionModal from './RejectionModal';

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
  PHOTO: Image,
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

              {/* Reference Links */}
              {currentItem.referenceLinks?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Reference Links</span>
                  <div className="mt-1 space-y-1">
                    {currentItem.referenceLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{link.title || link.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference Files */}
              {currentItem.referenceFiles?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Reference Files</span>
                  <div className="mt-1 space-y-1">
                    {currentItem.referenceFiles.map((file, i) => (
                      <a
                        key={i}
                        href={file.downloadURL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-iris-red hover:text-iris-red/80 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">{file.fileName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default SwipeReviewCard;
