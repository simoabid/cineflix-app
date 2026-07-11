import { useEffect, useState } from 'react';

// Route through server-side TMDB proxy — no client-exposed API key
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || '/api';
const TMDB_PROXY_URL = `${API_BASE_URL}/tmdb`;

/** Module-level session cache: key = `{type}-{id}`, value = certification string */
const certificationCache = new Map<string, string>();

/** Preferred regions in priority order */
const REGION_PRIORITY = ['US', 'GB', 'AU', 'CA'];

/** Fallback when no certification is found for the target regions */
const FALLBACK: Record<'movie' | 'tv', string> = {
  movie: 'NR',
  tv: 'NR',
};

async function fetchCertification(
  id: number,
  mediaType: 'movie' | 'tv',
): Promise<string> {
  const cacheKey = `${mediaType}-${id}`;
  if (certificationCache.has(cacheKey)) {
    return certificationCache.get(cacheKey)!;
  }

  const endpoint =
    mediaType === 'movie'
      ? `${TMDB_PROXY_URL}/movie/${id}/release_dates`
      : `${TMDB_PROXY_URL}/tv/${id}/content_ratings`;

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);

  const data = await res.json();
  let certification = FALLBACK[mediaType];

  if (mediaType === 'movie') {
    // data.results = [{ iso_3166_1, release_dates: [{ certification }] }]
    const results: Array<{ iso_3166_1: string; release_dates: Array<{ certification: string }> }> =
      data.results ?? [];
    for (const region of REGION_PRIORITY) {
      const entry = results.find((r) => r.iso_3166_1 === region);
      const cert = entry?.release_dates?.find((d) => d.certification)?.certification;
      if (cert) { certification = cert; break; }
    }
  } else {
    // data.results = [{ iso_3166_1, rating }]
    const results: Array<{ iso_3166_1: string; rating: string }> = data.results ?? [];
    for (const region of REGION_PRIORITY) {
      const entry = results.find((r) => r.iso_3166_1 === region);
      if (entry?.rating) { certification = entry.rating; break; }
    }
  }

  certificationCache.set(cacheKey, certification);
  return certification;
}

interface UseCertificationOptions {
  id: number | undefined;
  mediaType: 'movie' | 'tv';
  /** Set to false to skip the fetch (e.g. on mobile) */
  enabled?: boolean;
}

interface UseCertificationResult {
  certification: string | null;
  isLoading: boolean;
}

/**
 * Lazily fetches the TMDB content certification for a single title.
 * Results are cached in memory for the lifetime of the page session,
 * so each unique title is fetched at most once regardless of re-hovers.
 */
export function useCertification({
  id,
  mediaType,
  enabled = true,
}: UseCertificationOptions): UseCertificationResult {
  const [certification, setCertification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !id) return;

    const cacheKey = `${mediaType}-${id}`;

    // Serve from cache synchronously — no loading state needed
    if (certificationCache.has(cacheKey)) {
      setCertification(certificationCache.get(cacheKey)!);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchCertification(id, mediaType)
      .then((cert) => { if (!cancelled) setCertification(cert); })
      .catch(() => { if (!cancelled) setCertification(FALLBACK[mediaType]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [id, mediaType, enabled]);

  return { certification, isLoading };
}
