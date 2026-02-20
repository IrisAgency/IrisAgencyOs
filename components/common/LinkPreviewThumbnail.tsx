import React, { useState, useEffect, useRef } from 'react';

const PROXY_URL = 'https://rlp-proxy.herokuapp.com/v2?url=';

interface LinkPreviewThumbnailProps {
  url: string;
  alt?: string;
  className?: string;
  onImageFound?: (imageUrl: string) => void;
}

/**
 * Fetches Open Graph metadata for a URL and renders the OG image as a thumbnail.
 * Uses the same proxy as @dhaiwat10/react-link-preview to avoid CORS issues.
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

    // Normalize URL — add https:// if no protocol
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    fetch(PROXY_URL + normalizedUrl)
      .then((res) => res.json())
      .then((res) => {
        if (mountedRef.current && res?.metadata?.image) {
          const img = res.metadata.image;
          // Validate it's not a relative path or "null" string
          if (img && img !== 'null' && !img.startsWith('/')) {
            setImageUrl(img);
            onImageFound?.(img);
          }
        }
        if (mountedRef.current) setLoading(false);
      })
      .catch(() => {
        if (mountedRef.current) {
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
