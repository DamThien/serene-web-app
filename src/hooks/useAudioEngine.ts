import { useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';

/**
 * useAudioEngine — Howler.js based, CORS-safe
 *
 * URLs must be same-origin or served with Access-Control-Allow-Origin: *.
 * In dev: Vite proxy at /audio/* handles this (vite.config.ts).
 * In prod: set VITE_AUDIO_BASE to a CORS-enabled proxy.
 *
 * We use html5: false (Web Audio decode) so Howler can fully control
 * volume / looping without browser media-element CORS restrictions.
 * If decode fails we fall back to html5: true automatically via Howler.
 */

type HowlMap = Map<string, Howl>;

export interface AudioEngine {
  play:            (soundId: string, url: string, volume: number) => void;
  pause:           (soundId: string) => void;
  stop:            (soundId: string) => void;
  stopAll:         () => void;
  pauseAll:        () => void;
  resumeAll:       () => void;
  setVolume:       (soundId: string, volume: number) => void;
  setMute:         (soundId: string, muted: boolean) => void;
  setMasterVolume: (v: number) => void;
  isPlaying:       (soundId: string) => boolean;
}

export function useAudioEngine(): AudioEngine {
  const howls = useRef<HowlMap>(new Map());

  const getOrCreate = useCallback((soundId: string, url: string, volume: number): Howl => {
    if (howls.current.has(soundId)) {
      return howls.current.get(soundId)!;
    }

    const h = new Howl({
      src: [url],
      loop:    true,
      volume,
      // html5: false → decode via Web Audio API (no CORS restriction on <audio> element)
      // Howler automatically falls back to html5: true if AudioContext decode fails.
      html5:   false,
      preload: true,
      onloaderror: (_id, err) => {
        console.warn(`[AudioEngine] load error for ${soundId}:`, err);
      },
      onplayerror: (_id, err) => {
        console.warn(`[AudioEngine] play error for ${soundId}:`, err);
        // Unlock AudioContext on iOS/Safari then retry
        h.once('unlock', () => h.play());
      },
    });

    howls.current.set(soundId, h);
    return h;
  }, []);

  const play = useCallback((soundId: string, url: string, volume: number) => {
    const h = getOrCreate(soundId, url, volume);
    if (!h.playing()) h.play();
  }, [getOrCreate]);

  const pause = useCallback((soundId: string) => {
    howls.current.get(soundId)?.pause();
  }, []);

  const stop = useCallback((soundId: string) => {
    const h = howls.current.get(soundId);
    if (h) { h.stop(); h.unload(); howls.current.delete(soundId); }
  }, []);

  const stopAll = useCallback(() => {
    howls.current.forEach(h => { h.stop(); h.unload(); });
    howls.current.clear();
  }, []);

  const pauseAll = useCallback(() => {
    howls.current.forEach(h => h.pause());
  }, []);

  const resumeAll = useCallback(() => {
    howls.current.forEach(h => { if (!h.playing()) h.play(); });
  }, []);

  const setVolume = useCallback((soundId: string, volume: number) => {
    howls.current.get(soundId)?.volume(volume);
  }, []);

  const setMute = useCallback((soundId: string, muted: boolean) => {
    howls.current.get(soundId)?.mute(muted);
  }, []);

  const setMasterVolume = useCallback((v: number) => {
    Howler.volume(v);
  }, []);

  const isPlaying = useCallback((soundId: string): boolean => {
    return howls.current.get(soundId)?.playing() ?? false;
  }, []);

  return { play, pause, stop, stopAll, pauseAll, resumeAll, setVolume, setMute, setMasterVolume, isPlaying };
}
