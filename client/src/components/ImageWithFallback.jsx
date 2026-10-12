import { useState } from 'react';

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`img-fallback ${className}`} role="img" aria-label={alt}><span>{(alt || '?').trim().charAt(0)}</span></div>;
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
