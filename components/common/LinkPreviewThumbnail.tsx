import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { cloudFunctions } from '../../lib/firebase';

interface LinkPreviewMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  hostname: string | null;
}

interface LinkPreviewThumbnailProps {
  url: string;
  alt?: string;
  className?: string;
  onImageFound?: (imageUrl: string) => void;
}

// Simple in-memory cache to avoid re-fetching the same URL
const previewCache = new Map<string, string | null>();

/**
 * Fetches Open Graph metadata for a URL via our own Firebase Cloud Function
 * and renders the OG image as a thumbnail.
 */
const LinkPreviewThumbnail: React.FC<LinkPreviewThumbnailProps> = ({
  url,
  alt = '',
  className = '',
  onImageFound,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(false);
    setImageUrl(null);

    if (!url) {
      setLoading(false);
      return;
    }

    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // Check cache first
    if (previewCache.has(normalizedUrl)) {
      const cached = previewCache.get(normalizedUrl) || null;
      setImageUrl(cached);
      if (cached) onImageFound?.(cached);
      setLoading(false);
      return;
    }

    const fetchPreview = httpsCallable<{ url: string }, LinkPreviewMetadata>(cloudFunctions, 'fetchLinkPreview');

    fetchPreview({ url: normalizedUrl })
      .then((result) => {
        if (mountedRef.current) {
          const img = result.data?.image;
          if (img && img !== 'null' && !img.startsWith('/')) {
            setImageUrl(img);
            previewCache.set(normalizedUrl, img);
            onImageFound?.(img);
          } else {
            previewCache.set(normalizedUrl, null);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          previewCache.set(normalizedUrl, null);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-800 ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!imageUrl || error) {
    return null; // Parent will handle fallback
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
      onError={() => setError(true)}
    />
  );
};

export default LinkPreviewThumbnail;
