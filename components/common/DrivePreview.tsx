import React, { useState } from 'react';
import {
  ExternalLink, Play, Image as ImageIcon, FileText, File,
  AlertTriangle, RefreshCw, Loader2, Maximize2, Video
} from 'lucide-react';
import { DriveFileHint, getDrivePreviewUrl, getDriveThumbnailUrl, getDriveViewUrl } from '../../utils/driveUtils';

// ─── Props ───────────────────────────────────────────────────────────

interface DrivePreviewProps {
  fileId: string;
  typeHint?: DriveFileHint;
  label?: string;
  /** Show in compact mode (thumbnail only, no controls) */
  compact?: boolean;
  /** Custom class for the outer wrapper */
  className?: string;
}

// ─── Type Badge ──────────────────────────────────────────────────────

const typeBadgeConfig: Record<DriveFileHint, { icon: React.ReactNode; label: string; color: string }> = {
  video:    { icon: <Video className="w-3 h-3" />,     label: 'VIDEO',    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  image:    { icon: <ImageIcon className="w-3 h-3" />, label: 'PHOTO',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  pdf:      { icon: <FileText className="w-3 h-3" />,  label: 'PDF',      color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  document: { icon: <FileText className="w-3 h-3" />,  label: 'DOC',      color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  unknown:  { icon: <File className="w-3 h-3" />,      label: 'FILE',     color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export const DriveTypeBadge: React.FC<{ type: DriveFileHint; className?: string }> = ({ type, className = '' }) => {
  const cfg = typeBadgeConfig[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${cfg.color} ${className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Thumbnail (card-level) ──────────────────────────────────────────

interface DriveThumbnailProps {
  fileId: string;
  typeHint?: DriveFileHint;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const DriveThumbnail: React.FC<DriveThumbnailProps> = ({
  fileId,
  typeHint = 'unknown',
  size = 400,
  className = '',
  onClick,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const thumbUrl = getDriveThumbnailUrl(fileId, size);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--dash-surface)]">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[color:var(--dash-surface)] gap-1.5 p-2">
          <AlertTriangle className="w-5 h-5 text-slate-500" />
          <span className="text-[10px] text-slate-500 text-center leading-tight">Preview unavailable</span>
        </div>
      )}

      {/* Thumbnail image */}
      {!error && (
        <img
          src={thumbUrl}
          alt="Drive thumbnail"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Type badge overlay */}
      <div className="absolute top-1.5 left-1.5">
        <DriveTypeBadge type={typeHint} />
      </div>

      {/* Play icon overlay for video */}
      {typeHint === 'video' && loaded && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/60 rounded-full p-2.5 backdrop-blur-sm">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      {onClick && loaded && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
};

// ─── Full Preview (drawer-level) ─────────────────────────────────────

const DrivePreview: React.FC<DrivePreviewProps> = ({
  fileId,
  typeHint = 'unknown',
  label,
  compact = false,
  className = '',
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const previewUrl = getDrivePreviewUrl(fileId);
  const viewUrl = getDriveViewUrl(fileId);

  if (compact) {
    return <DriveThumbnail fileId={fileId} typeHint={typeHint} className={className} />;
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Preview label + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <DriveTypeBadge type={typeHint} />
          {label && (
            <span className="text-sm font-medium text-white truncate">{label}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {iframeError && (
            <button
              onClick={() => { setIframeError(false); setIframeLoading(true); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Retry preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-[color:var(--dash-glass-border)] text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Drive
          </a>
        </div>
      </div>

      {/* Preview area */}
      <div className="relative rounded-xl overflow-hidden border border-[color:var(--dash-glass-border)] bg-black/30" style={{ aspectRatio: '16/9', minHeight: '280px' }}>
        {/* Loading skeleton */}
        {iframeLoading && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--dash-surface)] z-10">
            <Loader2 className="w-8 h-8 text-[color:var(--dash-primary)] animate-spin" />
            <span className="text-xs text-slate-400">Loading preview…</span>
          </div>
        )}

        {/* Error / permissions fallback */}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[color:var(--dash-surface)] z-10 p-6">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-sm font-semibold text-white">Preview Unavailable</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                This file may require different sharing permissions. Make sure it&apos;s set to 
                &ldquo;Anyone with the link can view&rdquo;.
              </p>
            </div>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-primary)]/30 text-[color:var(--dash-primary)] text-sm font-medium hover:bg-[color:var(--dash-primary)]/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Drive
            </a>
          </div>
        )}

        {/* Iframe embed */}
        {!iframeError && (
          <iframe
            key={fileId}
            src={previewUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            onLoad={() => setIframeLoading(false)}
            onError={() => { setIframeLoading(false); setIframeError(true); }}
            style={{ border: 'none' }}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
};

export default DrivePreview;
