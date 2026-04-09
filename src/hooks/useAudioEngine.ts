import { useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';

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
  play:                (soundId: string, url: string, volume: number) => void;
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
  getAnalyser:         () => AnalyserNode | null;
}

export function useAudioEngine(): AudioEngine {
  const howls = useRef<HowlMap>(new Map());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserConnectedRef = useRef(false);
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

  const ensureAnalyser = useCallback((): AnalyserNode | null => {
    const howlerWithInternals = Howler as typeof Howler & {
      ctx?: AudioContext;
      masterGain?: GainNode;
    };

    const audioContext = howlerWithInternals.ctx;
    const masterGain = howlerWithInternals.masterGain;

    if (!audioContext || !masterGain) {
      return null;
    }

    if (!analyserRef.current) {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;
    }

    if (!analyserConnectedRef.current) {
      try {
        masterGain.disconnect();
      } catch {
        // already disconnected or browser-specific no-op
      }

      masterGain.connect(analyserRef.current);
      analyserRef.current.connect(audioContext.destination);
      analyserConnectedRef.current = true;
    }

    return analyserRef.current;
  }, []);

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

  const play = useCallback((soundId: string, url: string, volume: number) => {
    const h = getOrCreate(soundId, url, volume);
    ensureAnalyser();
    if (!h.playing()) h.play();
  }, [ensureAnalyser, getOrCreate]);

  const pause  = useCallback((soundId: string) => { howls.current.get(soundId)?.pause(); }, []);

  const stop = useCallback((soundId: string) => {
    const h = howls.current.get(soundId);
    if (h) { h.stop(); h.unload(); howls.current.delete(soundId); }
  }, []);

  const stopAll = useCallback(() => {
    howls.current.forEach(h => { h.stop(); h.unload(); });
    howls.current.clear();
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
    syncMediaSession, setMediaSessionState, getAnalyser: ensureAnalyser,
  };
}
