/**
 * sounds.ts
 *
 * Sounds and categories are now fetched from the API via src/services/api.ts.
 * Audio playback always uses local files from public/mylodies_all_sound/
 * to avoid CORS issues with the remote CDN.
 *
 * Local files available: sound1.mp3 → sound204.mp3 (some gaps, e.g. 109, 122)
 *
 * This file is kept only for the FALLBACK_CATEGORIES constant used when
 * the API is unreachable.
 */

export interface CategoryMeta {
  name: string;
  color: string;
}

/** Fallback category list shown while API loads or if it fails */
export const FALLBACK_CATEGORIES: CategoryMeta[] = [
  { name: 'All',         color: '#eeeef8' },
  { name: 'Water',       color: '#0ea5e9' },
  { name: 'Nature',      color: '#22c55e' },
  { name: 'Melodies',    color: '#8b5cf6' },
  { name: 'Animal',      color: '#10b981' },
  { name: 'White Noise', color: '#94a3b8' },
  { name: 'City',        color: '#64748b' },
  { name: 'Baby',        color: '#f59e0b' },
  { name: 'Brainwave',   color: '#ec4899' },
];
