import type { Mix, Sound } from '../types';

// const import.meta.env.VITE_API_BASE = 'https://serene-api.shapeecloud.com/v1';

/** Local audio base — always uses public/mylodies_all_sound to avoid CORS */
const LOCAL_AUDIO_BASE = '/mylodies_all_sound';

/**
 * Extract filename from API audioUrl and map to local path.
 * Input:  "https://kiara-api.shapeecloud.com/v1/sounds/mylodies_all_sound/sound26.mp3"
 * Output: "/mylodies_all_sound/sound26.mp3"
 *
 * Falls back to soundId if audioUrl is missing or unparseable.
 */
export function localAudioUrl(audioUrl?: string, soundId?: string | number): string {
  if (audioUrl) {
    // Match "sound<number>.mp3" at the end of the URL
    const match = audioUrl.match(/sound(\d+)\.mp3$/i);
    if (match) {
      return `${LOCAL_AUDIO_BASE}/sound${match[1]}.mp3`;
    }
  }
  // Fallback: use soundId directly (legacy)
  return `${LOCAL_AUDIO_BASE}/sound${soundId}.mp3`;
}

/** helper */
function buildQuery(params?: Record<string, any>) {
  const qs = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });

  return qs.toString();
}

/** map API → FE model, always override audioUrl with local file */
function mapSound(item: any): Sound {
  // API returns _id (MongoDB ObjectId), not id
  const id: string = item._id ?? item.id ?? '';
  return {
    id,
    title: item.title ?? item.name ?? '',
    categoryname: item.category?.name ?? item.categoryId?.name ?? 'Unknown',
    isFree: item.isFree,
    icon: item.icon || '🎵',
    // Extract "sound<N>.mp3" from API audioUrl and serve from local public folder
    audioUrl: localAudioUrl(item.audioUrl, id),
    duration: item.duration,
    image: item.image,
    description: item.description || '',
    previewUrl: item.previewUrl || '',
    isLoopable: item.isLoopable || false,
    tags: item.tags || [],
    playCount: item.playCount || 0,
    isPremium: item.isPremium || false,
    isActive: item.isActive || false,
    order: item.order || 0,
  };
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

/** GET /sound/categories */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/sound/categories`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    // console.log('Fetched categories:', data.data);
    const raw: any[] = data.data || data || [];
    // API returns _id (MongoDB), normalize to id
    return raw.map(c => ({
      id: c._id ?? c.id ?? c.name,
      name: c.name,
      color: c.color,
      icon: c.icon,
    }));
  } catch (err) {
    console.error('fetchCategories error:', err);
    return [];
  }
}

/** GET /sounds */
export async function fetchSounds(params?: {
  category?: string;
  isFree?: boolean;
  search?: string;
}): Promise<Sound[]> {
  try {
    const qs = buildQuery({
      category: params?.category !== 'All' ? params?.category : undefined,
      isFree: params?.isFree,
      search: params?.search,
      limit: 200,
    });

    const res = await fetch(`${import.meta.env.VITE_API_BASE}/sound?${qs}`);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    // console.log('Fetched sounds:', data.data);

    return (data.data || []).map(mapSound);
  } catch (err) {
    console.error('fetchSounds error:', err);
    return [];
  }
}

/** Map raw API mix item → Mix type */
function mapMix(item: any): Mix {
  return {
    id: item._id ?? item.id ?? String(Math.random()),
    name: item.name ?? 'Untitled',
    description: item.description ?? '',
    icon: item.icon ?? '🎵',
    isPublic: item.isPublic ?? true,
    plays: item.playCount ?? item.plays ?? 0,
    tags: item.tags ?? [],
    user: item.user ?? item.createdBy ?? 'anonymous',
    createdAt: item.createdAt,
    tracks: (item.sounds ?? []).map((t: any) => ({
      soundId: t.soundId ?? t._id ?? t.id ?? '',
      volume: t.volume ?? 0.7,
    })),
  };
}

/** GET /mix/default — public default mixes */
export async function fetchPublicMixes(): Promise<Mix[]> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/mix/default`);
    if (!res.ok) throw new Error('Failed to fetch mixes');
    const data = await res.json();
    // console.log('Fetched mixes raw:', JSON.stringify(data.data?.[0]));
    return (data.data || []).map(mapMix);
  } catch (err) {
    console.error('fetchPublicMixes error:', err);
    return [];
  }
}

export interface CreateMixPayload {
  name: string;
  description?: string;
  tracks: { soundId: string; volume: number }[];
  isPublic: boolean;
}

/** POST /mix */
export async function createMix(payload: CreateMixPayload): Promise<Mix> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/mix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ...authHeaders()
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Create mix failed');

    const data = await res.json();

    return data.data;
  } catch (err) {
    console.error(err);

    // fallback (dev mode)
    return {
      ...payload,
      id: 'u_' + Date.now(),
      icon: '🎵',
      plays: 0,
      tags: [],
      createdAt: new Date().toISOString(),
    };
  }
}

/** POST /mix/:id/play */
export async function logMixPlay(id: string): Promise<void> {
  try {
    await fetch(`${import.meta.env.VITE_API_BASE}/mix/${id}/play`, {
      method: 'POST',
    });
  } catch {
    console.warn('logMixPlay failed');
  }
}