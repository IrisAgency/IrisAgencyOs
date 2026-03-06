import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc,
} from 'firebase/firestore';
import type { PresentationShare } from '../../types';

import {
  X, Copy, Check, Link2, RefreshCw, ToggleLeft, ToggleRight,
  Calendar, ExternalLink, Eye, Loader2, Trash2, Clock,
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function generateToken(): string {
  // Generate a URL-safe random token using crypto API
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getShareUrl(token: string): string {
  return `${window.location.origin}/presentation/share/${token}`;
}

// ============================================================================
// PROPS
// ============================================================================

interface ShareLinkManagerProps {
  creativeProjectId: string;
  creativeCalendarId: string;
  calendarMonthId: string | null; // from activated month, if any
  clientId: string;
  currentUserId: string;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ShareLinkManager: React.FC<ShareLinkManagerProps> = ({
  creativeProjectId,
  creativeCalendarId,
  calendarMonthId,
  clientId,
  currentUserId,
  onClose,
}) => {
  const [shares, setShares] = useState<PresentationShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');

  // ── Load existing shares for this calendar ──
  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const sharesRef = collection(db, 'presentation_shares');
      const q = query(sharesRef, where('creativeCalendarId', '==', creativeCalendarId));
      const snap = await getDocs(q);
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PresentationShare))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setShares(results);
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  }, [creativeCalendarId]);

  useEffect(() => { loadShares(); }, [loadShares]);

  // ── Create new share link ──
  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = generateToken();
      const now = new Date().toISOString();
      const newShare: Omit<PresentationShare, 'id'> = {
        token,
        creativeProjectId,
        creativeCalendarId,
        calendarMonthId,
        clientId,
        isActive: true,
        allowDownload: false,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
        createdBy: currentUserId,
        createdAt: now,
        updatedAt: now,
        accessCount: 0,
        lastOpenedAt: null,
      };

      await addDoc(collection(db, 'presentation_shares'), newShare);
      setExpiryDate('');
      await loadShares();
    } catch (err) {
      console.error('Failed to create share:', err);
    } finally {
      setCreating(false);
    }
  };

  // ── Toggle active state ──
  const handleToggleActive = async (share: PresentationShare) => {
    try {
      await updateDoc(doc(db, 'presentation_shares', share.id), {
        isActive: !share.isActive,
        updatedAt: new Date().toISOString(),
      });
      await loadShares();
    } catch (err) {
      console.error('Failed to toggle share:', err);
    }
  };

  // ── Regenerate (disable old + create new) ──
  const handleRegenerate = async (share: PresentationShare) => {
    try {
      // Disable old
      await updateDoc(doc(db, 'presentation_shares', share.id), {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      // Create new
      await handleCreate();
    } catch (err) {
      console.error('Failed to regenerate share:', err);
    }
  };

  // ── Copy link ──
  const handleCopy = async (share: PresentationShare) => {
    const url = getShareUrl(share.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Check expiry status ──
  const isExpired = (share: PresentationShare): boolean => {
    if (!share.expiresAt) return false;
    return new Date(share.expiresAt) < new Date();
  };

  const activeShares = shares.filter(s => s.isActive && !isExpired(s));
  const inactiveShares = shares.filter(s => !s.isActive || isExpired(s));

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Share Presentation</h2>
              <p className="text-xs text-gray-400">Create a public link for client viewing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Create new link */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Create New Link</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-400 mb-1 uppercase tracking-wider">
                  Expiry Date <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Generate Link
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 mx-auto text-gray-300 animate-spin mb-2" />
              <p className="text-xs text-gray-400">Loading share links…</p>
            </div>
          )}

          {/* Active Links */}
          {!loading && activeShares.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Links</h3>
              {activeShares.map(share => (
                <ShareCard
                  key={share.id}
                  share={share}
                  isCopied={copiedId === share.id}
                  onCopy={() => handleCopy(share)}
                  onToggle={() => handleToggleActive(share)}
                  onRegenerate={() => handleRegenerate(share)}
                />
              ))}
            </div>
          )}

          {/* Inactive Links */}
          {!loading && inactiveShares.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disabled / Expired Links</h3>
              {inactiveShares.map(share => (
                <ShareCard
                  key={share.id}
                  share={share}
                  isCopied={copiedId === share.id}
                  onCopy={() => handleCopy(share)}
                  onToggle={() => handleToggleActive(share)}
                  onRegenerate={() => handleRegenerate(share)}
                  isInactive
                />
              ))}
            </div>
          )}

          {/* No shares */}
          {!loading && shares.length === 0 && (
            <div className="py-8 text-center">
              <Link2 className="w-8 h-8 mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No share links created yet.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Generate Link" above to create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHARE CARD
// ============================================================================

interface ShareCardProps {
  share: PresentationShare;
  isCopied: boolean;
  onCopy: () => void;
  onToggle: () => void;
  onRegenerate: () => void;
  isInactive?: boolean;
}

const ShareCard: React.FC<ShareCardProps> = ({ share, isCopied, onCopy, onToggle, onRegenerate, isInactive }) => {
  const url = getShareUrl(share.token);
  const isExpiredNow = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;

  return (
    <div className={`p-3.5 rounded-xl border transition-colors ${isInactive ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
      {/* URL display */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-500 font-mono truncate border border-gray-100">
            {url}
          </div>
        </div>
        <button
          onClick={onCopy}
          className={`shrink-0 p-2 rounded-lg border transition-all ${
            isCopied
              ? 'bg-green-50 border-green-200 text-green-600'
              : 'bg-white border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400'
          }`}
          title="Copy link"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all"
          title="Open link"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {share.accessCount} view{share.accessCount !== 1 ? 's' : ''}
        </span>
        {share.lastOpenedAt && (
          <span>Last opened: {formatDateTime(share.lastOpenedAt)}</span>
        )}
        <span>Created: {formatDateTime(share.createdAt)}</span>
        {share.expiresAt && (
          <span className={`flex items-center gap-1 ${isExpiredNow ? 'text-red-400' : 'text-amber-500'}`}>
            <Clock className="w-3 h-3" />
            {isExpiredNow ? 'Expired' : `Expires: ${formatDateTime(share.expiresAt)}`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            share.isActive
              ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
              : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
          }`}
        >
          {share.isActive ? (
            <><ToggleRight className="w-3.5 h-3.5" /> Disable</>
          ) : (
            <><ToggleLeft className="w-3.5 h-3.5" /> Enable</>
          )}
        </button>
        {share.isActive && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
        )}
      </div>
    </div>
  );
};

export default ShareLinkManager;
