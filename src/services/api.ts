import type {
  AuthTokens,
  FrequencyLayer,
  Mix,
  SilentFrequency,
  Sound,
  Subscription,
  SubscriptionPlan,
  User,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://serene-api.shapeecloud.com/v1').replace(/\/$/, '');
const LOCAL_AUDIO_BASE = import.meta.env.BASE_URL + 'mylodies_all_sound';
const SESSION_KEY = 'serene.session';
const DEVICE_KEY = 'serene.deviceId';

interface ApiSession {
  user: User | null;
  tokens: AuthTokens | null;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  user?: unknown;
  message?: string;
}

let sessionCache: ApiSession | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface CreateMixPayload {
  name: string;
  description?: string;
  icon?: string;
  sounds: { soundId: string; volume: number }[];
  silentFrequencies?: { silentFrequencyId: string }[];
  frequencyLayer?: { hz: number } | null;
  isPublic?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface GoogleLoginPayload {
  token: string;
}

export interface AppleLoginPayload {
  identityToken: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

function createDeviceId() {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto?.randomUUID) {
    return maybeCrypto.randomUUID();
  }

  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId() {
  const current = localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const next = createDeviceId();
  localStorage.setItem(DEVICE_KEY, next);
  return next;
}

function extractTokens(value: ApiResponse<unknown> | AuthTokens): AuthTokens | null {
  if ('accessToken' in value && 'refreshToken' in value) {
    return value.accessToken && value.refreshToken
      ? { accessToken: value.accessToken, refreshToken: value.refreshToken }
      : null;
  }

  const accessToken = value.tokens?.accessToken;
  const refreshToken = value.tokens?.refreshToken;
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

function buildAvatar(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || 'S';
  return source.charAt(0).toUpperCase();
}

function normalizeUser(raw: any): User {
  return {
    id: String(raw?._id ?? raw?.id ?? ''),
    name: raw?.name ?? raw?.username ?? raw?.email ?? 'Serene User',
    email: raw?.email ?? '',
    avatar: raw?.avatar ?? buildAvatar(raw?.name, raw?.email),
    username: raw?.username,
    image: raw?.image,
    bio: raw?.bio,
    timezone: raw?.timezone,
    type: raw?.type,
    source: raw?.source,
    createdAt: raw?.createdAt,
  };
}

function getStoredSession(): ApiSession {
  if (sessionCache) return sessionCache;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    sessionCache = { user: null, tokens: null };
    return sessionCache;
  }

  try {
    sessionCache = JSON.parse(raw) as ApiSession;
  } catch {
    sessionCache = { user: null, tokens: null };
  }

  return sessionCache;
}

function setStoredSession(next: ApiSession) {
  sessionCache = next;
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

export function getSession() {
  return getStoredSession();
}

export function isAuthenticated() {
  return Boolean(getStoredSession().tokens?.accessToken);
}

export function clearSession() {
  sessionCache = { user: null, tokens: null };
  localStorage.removeItem(SESSION_KEY);
}

function buildQuery(params?: Record<string, unknown>) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });

  const value = query.toString();
  return value ? `?${value}` : '';
}

export function localAudioUrl(audioUrl?: string, soundId?: string | number): string {
  if (audioUrl) {
    const match = audioUrl.match(/sound(\d+)\.mp3$/i);
    if (match) {
      return `${LOCAL_AUDIO_BASE}/sound${match[1]}.mp3`;
    }
  }

  return `${LOCAL_AUDIO_BASE}/sound${soundId}.mp3`;
}

function mapSound(item: any): Sound {
  const id = String(item?._id ?? item?.id ?? '');
  return {
    id,
    title: item?.title ?? item?.name ?? '',
    categoryname: item?.category?.name ?? item?.categoryId?.name ?? 'Unknown',
    isFree: Boolean(item?.isFree),
    icon: item?.icon || 'melody',
    audioUrl: localAudioUrl(item?.audioUrl, id),
    duration: item?.duration ?? 0,
    image: item?.image ?? '',
    description: item?.description || '',
    previewUrl: item?.previewUrl || '',
    isLoopable: Boolean(item?.isLoopable),
    tags: Array.isArray(item?.tags) ? item.tags : [],
    playCount: item?.playCount ?? 0,
    isPremium: Boolean(item?.isPremium),
    isActive: item?.isActive ?? true,
    order: item?.order ?? 0,
  };
}

function mapSilentFrequency(item: any): SilentFrequency {
  return {
    id: String(item?._id ?? item?.id ?? ''),
    title: item?.title ?? '',
    subtitle: item?.subtitle ?? '',
    description: item?.description ?? '',
    image: item?.image ?? '',
    thumbnail: item?.thumbnail ?? item?.image ?? '',
    provider: item?.provider ?? '',
    category: item?.category ?? '',
    isPremium: Boolean(item?.isPremium),
    audioUrl: item?.audioUrl,
    benefits: Array.isArray(item?.benefits) ? item.benefits : [],
    tags: Array.isArray(item?.tags) ? item.tags : [],
  };
}

function mapFrequencyLayer(item: any): FrequencyLayer {
  return {
    id: String(item?._id ?? item?.id ?? item?.hz ?? ''),
    hz: Number(item?.hz ?? 0),
    title: item?.title ?? `${item?.hz ?? ''} Hz`,
    subtitle: item?.subtitle ?? '',
    benefit: item?.benefit ?? '',
    order: item?.order ?? 0,
  };
}

function mapMix(item: any): Mix {
  const rawTracks = Array.isArray(item?.tracks)
    ? item.tracks
    : Array.isArray(item?.sounds)
      ? item.sounds
      : Array.isArray(item?.layers)
        ? item.layers
        : [];

  const rawFrequencyLayer = item?.frequencyLayer?.frequencyLayerId ?? item?.frequencyLayer ?? null;
  const rawSilentFrequencies = Array.isArray(item?.silentFrequencies) ? item.silentFrequencies : [];

  return {
    _id: String(item?._id ?? item?.id ?? ''),
    name: item?.name ?? 'Untitled',
    description: item?.description ?? '',
    sourceMixId: item?.sourceMixId ? String(item.sourceMixId) : undefined,
    icon: item?.icon ?? rawTracks?.[0]?.soundId?.icon ?? 'melody',
    isPublic: Boolean(item?.isPublic),
    isPublicUserMix: Boolean(item?.isPublicUserMix),
    plays: item?.playCount ?? item?.plays ?? 0,
    tags: Array.isArray(item?.tags) ? item.tags : [],
    user:
      item?.user?.name
      ?? item?.sourceUserId?.name
      ?? item?.sourceUserName
      ?? item?.createdBy?.name
      ?? item?.user
      ?? 'anonymous',
    username:
      item?.user?.username
      ?? item?.sourceUserId?.username
      ?? item?.createdBy?.username
      ?? undefined,
    createdAt: item?.createdAt,
    tracks: rawTracks.map((track: any) => ({
      soundId: String(track?.soundId?._id ?? track?.soundId?.id ?? track?.soundId ?? ''),
      volume: typeof track?.volume === 'number' ? track.volume / 100 : 0.7,
    })),
    silentFrequencies: rawSilentFrequencies
      .map((entry: any) => entry?.silentFrequencyId)
      .filter(Boolean)
      .map(mapSilentFrequency),
    frequencyLayer: rawFrequencyLayer ? mapFrequencyLayer(rawFrequencyLayer) : null,
  };
}

function mapSubscription(item: any): Subscription {
  return {
    plan: item?.plan ?? 'free',
    status: item?.status ?? 'active',
    isActive: item?.plan !== 'free' && ['active', 'trialing'].includes(item?.status ?? ''),
    expiresAt: item?.currentPeriodEnd ?? item?.expiresAt ?? null,
    willCancelAtPeriodEnd: Boolean(item?.cancelAtPeriodEnd),
  };
}

function mapPlan(item: any): SubscriptionPlan {
  return {
    id: String(item?.id ?? item?.code ?? ''),
    code: String(item?.id ?? item?.code ?? ''),
    name: item?.name ?? '',
    description: item?.duration ?? item?.description ?? '',
    interval: item?.duration,
    features: Array.isArray(item?.features) ? item.features : [],
    isPopular: item?.id === 'premium_yearly',
  };
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const current = getStoredSession();
    const refreshToken = current.tokens?.refreshToken;
    if (!refreshToken) {
      clearSession();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const data = await response.json();
      const tokens = extractTokens(data);
      if (!tokens) {
        clearSession();
        return null;
      }

      setStoredSession({ user: current.user, tokens });
      return tokens;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean; retry?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('x-device-id', getDeviceId());

  if (options.auth) {
    const token = getStoredSession().tokens?.accessToken;
    if (!token) {
      throw new Error('Authentication required');
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && options.auth && options.retry !== false) {
    const tokens = await refreshAccessToken();
    if (tokens?.accessToken) {
      return apiFetch<T>(path, init, { ...options, retry: false });
    }
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(payload: LoginPayload): Promise<User> {
  const data = await apiFetch<ApiResponse<unknown>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const user = normalizeUser(data.user);
  const tokens = extractTokens(data);
  setStoredSession({ user, tokens });
  return user;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const data = await apiFetch<ApiResponse<unknown>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const user = normalizeUser(data.user);
  const tokens = extractTokens(data);
  setStoredSession({ user, tokens });
  return user;
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<User> {
  const data = await apiFetch<ApiResponse<unknown>>('/auth/google-login', {
    method: 'POST',
    body: JSON.stringify({
      token: payload.token,
      deviceId: getDeviceId(),
    }),
  });

  const user = normalizeUser(data.user);
  const tokens = extractTokens(data);
  setStoredSession({ user, tokens });
  return user;
}

export async function loginWithApple(payload: AppleLoginPayload): Promise<User> {
  const data = await apiFetch<ApiResponse<unknown>>('/auth/apple-login', {
    method: 'POST',
    body: JSON.stringify({
      identityToken: payload.identityToken,
      name: payload.name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      deviceId: getDeviceId(),
    }),
  });

  const user = normalizeUser(data.user);
  const tokens = extractTokens(data);
  setStoredSession({ user, tokens });
  return user;
}

export async function logout(): Promise<void> {
  const current = getStoredSession();

  try {
    if (current.tokens?.refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
      });
    }
  } finally {
    clearSession();
  }
}

export async function fetchMe(): Promise<User> {
  const data = await apiFetch<ApiResponse<any>>('/auth/me', {}, { auth: true });
  const user = normalizeUser(data.data);
  setStoredSession({ user, tokens: getStoredSession().tokens });
  return user;
}

export async function fetchUserProfile(): Promise<User> {
  const data = await apiFetch<ApiResponse<any>>('/user/profile', {}, { auth: true });
  const user = normalizeUser(data.data);
  setStoredSession({ user, tokens: getStoredSession().tokens });
  return user;
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/sound/categories');
  const raw = data.data || [];
  return raw.map((item) => ({
    id: String(item?._id ?? item?.id ?? item?.name ?? ''),
    name: item?.name ?? '',
    color: item?.color,
    icon: item?.icon,
  }));
}

export async function fetchSounds(params?: {
  categoryId?: string;
  isFree?: boolean;
  search?: string;
}): Promise<Sound[]> {
  const query = buildQuery({
    categoryId: params?.categoryId,
    isFree: params?.isFree,
    search: params?.search,
    limit: 250,
  });

  const data = await apiFetch<ApiResponse<any[]>>(`/sound${query}`);
  return (data.data || []).map(mapSound);
}

export async function fetchPublicMixes(): Promise<Mix[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/mix/default?limit=100');
  return (data.data || []).map(mapMix);
}

export async function fetchUserMixes(): Promise<Mix[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/mix?limit=100', {}, { auth: true });
  return (data.data || []).map((item) => ({ ...mapMix(item), isOwn: true }));
}

export async function createMix(payload: CreateMixPayload): Promise<Mix> {
  const data = await apiFetch<ApiResponse<any>>('/mix', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: true });

  return mapMix(data.data);
}

export async function updateMix(id: string, payload: CreateMixPayload): Promise<Mix> {
  const data = await apiFetch<ApiResponse<any>>(`/mix/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, { auth: true });

  return mapMix(data.data);
}

export async function deleteMix(id: string): Promise<void> {
  await apiFetch(`/mix/${id}`, {
    method: 'DELETE',
  }, { auth: true });
}

export async function logMixPlay(id: string): Promise<void> {
  await apiFetch(`/mix/${id}/play`, { method: 'POST', body: JSON.stringify({}) }, { auth: true });
}

export async function fetchFavoriteSounds(): Promise<string[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/favorite?type=sound&limit=100', {}, { auth: true });
  const raw = Array.isArray((data as any).data) ? (data as any).data : [];

  return raw
    .map((item: any) => String(item?.soundId?._id ?? item?.soundId?.id ?? ''))
    .filter(Boolean);
}

export async function addFavoriteSound(id: string): Promise<void> {
  await apiFetch('/favorite', {
    method: 'POST',
    body: JSON.stringify({ type: 'sound', id }),
  }, { auth: true });
}

export async function removeFavoriteSound(id: string): Promise<void> {
  await apiFetch('/favorite', {
    method: 'DELETE',
    body: JSON.stringify({ type: 'sound', id }),
  }, { auth: true });
}

export async function fetchSilentFrequencies(): Promise<SilentFrequency[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/silence?limit=100');
  return (data.data || []).map(mapSilentFrequency);
}

export async function fetchFrequencyLayers(): Promise<FrequencyLayer[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/frequency?limit=100');
  return (data.data || []).map(mapFrequencyLayer);
}

export async function fetchSubscription(): Promise<Subscription> {
  const data = await apiFetch<ApiResponse<any>>('/subscription', {}, { auth: true });
  return mapSubscription(data.data);
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiFetch<ApiResponse<any[]>>('/subscription/plans');
  return (data.data || []).map(mapPlan);
}
