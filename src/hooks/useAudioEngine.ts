import { useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { fetchProtectedAudioBlob, isPlaybackExpired } from '../utils/audioXor';
import type { PlaybackDescriptor } from '../utils/audioXor';

/**
 * useAudioEngine — Howler.js based, CORS-safe
 *
 * ── Media Session API ──────────────────────────────────────────────
 * Registers with the browser's Media Session so:
 *   • Headphone buttons (play/pause, stop, skip)
 *   • Keyboard media keys (F-row play/pause, dedicated media keys)
 *   • Lock screen / notification controls (Android, iOS PWA, macOS)
 *   • Bluetooth device buttons
 * all route to pauseAll / resumeAll / stopAll correctly.
 *
 * Call `syncMediaSession({ title, artist, artwork }, { onPlay, onPause, onStop })`
 * every time playback starts or the active mix changes.
 */

type HowlMap = Map<string, Howl>;

export interface MediaSessionMeta {
  title:   string;
  artist?: string;
  artwork?: string; // absolute URL to cover image (optional)
}

export interface AudioEngine {
  play:                (soundId: string, url: string, volume: number, playback?: PlaybackDescriptor | null) => Promise<void>;
  pause:               (soundId: string) => void;
  stop:                (soundId: string) => void;
  stopAll:             () => void;
  pauseAll:            () => void;
  resumeAll:           () => void;
  setVolume:           (soundId: string, volume: number) => void;
  setMute:             (soundId: string, muted: boolean) => void;
  setMasterVolume:     (v: number) => void;
  isPlaying:           (soundId: string) => boolean;
  syncMediaSession:    (meta: MediaSessionMeta, callbacks: {
    onPlay:  () => void;
    onPause: () => void;
    onStop:  () => void;
  }) => void;
  setMediaSessionState: (state: 'playing' | 'paused' | 'none') => void;
}

export function useAudioEngine(): AudioEngine {
  const howls = useRef<HowlMap>(new Map());
  const objectUrls = useRef<Map<string, string>>(new Map());
  const resolvedUrls = useRef<Map<string, { sourceUrl: string; token?: string; resolvedUrl: string }>>(new Map());
  const pendingLoads = useRef<Map<string, Promise<string>>>(new Map());
  const msCallbacks = useRef<{
    onPlay:  () => void;
    onPause: () => void;
    onStop:  () => void;
  } | null>(null);

  // Register Media Session action handlers once on mount
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    ms.setActionHandler('play',          () => msCallbacks.current?.onPlay());
    ms.setActionHandler('pause',         () => msCallbacks.current?.onPause());
    ms.setActionHandler('stop',          () => msCallbacks.current?.onStop());
    // Register skip buttons to avoid browser default navigation
    ms.setActionHandler('previoustrack', () => msCallbacks.current?.onStop());
    ms.setActionHandler('nexttrack',     () => msCallbacks.current?.onStop());

    return () => {
      (['play', 'pause', 'stop', 'previoustrack', 'nexttrack'] as MediaSessionAction[]).forEach(a => {
        try { ms.setActionHandler(a, null); } catch { /* some browsers throw on null */ }
      });
    };
  }, []);

  const releaseObjectUrl = useCallback((soundId: string) => {
    const objectUrl = objectUrls.current.get(soundId);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrls.current.delete(soundId);
    }
  }, []);

  const resolvePlaybackUrl = useCallback(async (
    soundId: string,
    url: string,
    playback?: PlaybackDescriptor | null,
  ) => {
    if (!playback || !playback.url || !playback.token) {
      return url;
    }

    if (isPlaybackExpired(playback)) {
      throw new Error('Playback token expired. Please reload the sound list and try again.');
    }

    const cached = resolvedUrls.current.get(soundId);
    if (cached && cached.sourceUrl === playback.url && cached.token === playback.token) {
      return cached.resolvedUrl;
    }

    if (pendingLoads.current.has(soundId)) {
      return pendingLoads.current.get(soundId)!;
    }

    const loadPromise = (async () => {
      releaseObjectUrl(soundId);
      const blob = await fetchProtectedAudioBlob(playback);
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.current.set(soundId, objectUrl);
      resolvedUrls.current.set(soundId, {
        sourceUrl: playback.url,
        token: playback.token,
        resolvedUrl: objectUrl,
      });
      return objectUrl;
    })();

    pendingLoads.current.set(soundId, loadPromise);

    try {
      return await loadPromise;
    } finally {
      pendingLoads.current.delete(soundId);
    }
  }, [releaseObjectUrl]);

  const getOrCreate = useCallback((soundId: string, url: string, volume: number): Howl => {
    if (howls.current.has(soundId)) return howls.current.get(soundId)!;

    const h = new Howl({
      src: [url],
      loop:    true,
      volume,
      html5:   false,
      preload: true,
      onloaderror: (_id, err) => console.warn(`[AudioEngine] load error for ${soundId}:`, err),
      onplayerror: (_id, err) => {
        console.warn(`[AudioEngine] play error for ${soundId}:`, err);
        h.once('unlock', () => h.play());
      },
    });

    howls.current.set(soundId, h);
    return h;
  }, []);

  const play = useCallback(async (
    soundId: string,
    url: string,
    volume: number,
    playback?: PlaybackDescriptor | null,
  ) => {
    const resolvedUrl = await resolvePlaybackUrl(soundId, url, playback);
    const h = getOrCreate(soundId, resolvedUrl, volume);
    h.volume(volume);
    if (!h.playing()) h.play();
  }, [getOrCreate, resolvePlaybackUrl]);

  const pause  = useCallback((soundId: string) => { howls.current.get(soundId)?.pause(); }, []);

  const stop = useCallback((soundId: string) => {
    const h = howls.current.get(soundId);
    if (h) { h.stop(); h.unload(); howls.current.delete(soundId); }
    releaseObjectUrl(soundId);
    resolvedUrls.current.delete(soundId);
    pendingLoads.current.delete(soundId);
  }, [releaseObjectUrl]);

  const stopAll = useCallback(() => {
    howls.current.forEach(h => { h.stop(); h.unload(); });
    howls.current.clear();
    objectUrls.current.forEach(url => URL.revokeObjectURL(url));
    objectUrls.current.clear();
    resolvedUrls.current.clear();
    pendingLoads.current.clear();
  }, []);

  const pauseAll  = useCallback(() => { howls.current.forEach(h => h.pause()); }, []);
  const resumeAll = useCallback(() => {
    howls.current.forEach(h => { if (!h.playing()) h.play(); });
  }, []);

  const setVolume      = useCallback((soundId: string, volume: number) => { howls.current.get(soundId)?.volume(volume); }, []);
  const setMute        = useCallback((soundId: string, muted: boolean) => { howls.current.get(soundId)?.mute(muted); }, []);
  const setMasterVolume = useCallback((v: number) => { Howler.volume(v); }, []);
  const isPlaying      = useCallback((soundId: string): boolean => howls.current.get(soundId)?.playing() ?? false, []);

  /**
   * syncMediaSession — call every time playback starts or mix changes.
   * Updates the OS "now playing" card and wires headphone/keyboard buttons.
   */
  const syncMediaSession = useCallback((
    meta: MediaSessionMeta,
    callbacks: { onPlay: () => void; onPause: () => void; onStop: () => void },
  ) => {
    msCallbacks.current = callbacks;
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title:  meta.title,
      artist: meta.artist ?? 'Serene',
      album:  'Serene — Ambient Soundscapes',
      artwork: meta.artwork
        ? [{ src: meta.artwork, sizes: '512x512', type: 'image/png' }]
        : [],
    });
    ms.playbackState = 'playing';
  }, []);

  const setMediaSessionState = useCallback((state: 'playing' | 'paused' | 'none') => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }, []);

  return {
    play, pause, stop, stopAll, pauseAll, resumeAll,
    setVolume, setMute, setMasterVolume, isPlaying,
    syncMediaSession, setMediaSessionState,
  };
}
