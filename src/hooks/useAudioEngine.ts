import { useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';

type HowlMap = Map<string, Howl>;

export interface AudioEngine {
  play: (soundId: string, url: string, volume: number) => void;
  pause: (soundId: string) => void;
  stop: (soundId: string) => void;
  stopAll: () => void;
  pauseAll: () => void;
  resumeAll: () => void;
  setVolume: (soundId: string, volume: number) => void;
  setMute: (soundId: string, muted: boolean) => void;
  setMasterVolume: (v: number) => void;
  isPlaying: (soundId: string) => boolean;
}

export function useAudioEngine(): AudioEngine {
  const howls = useRef<HowlMap>(new Map());
  const isSessionActive = useRef(false);

  // -------------------------
  // 🎧 MEDIA SESSION
  // -------------------------
  const updatePlaybackState = (state: MediaSessionPlaybackState) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  };

  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator) || isSessionActive.current) return;

    isSessionActive.current = true;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Serene Mixer',
      artist: 'Ambient Sounds',
      artwork: [
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      howls.current.forEach(h => !h.playing() && h.play());
      updatePlaybackState('playing');
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      howls.current.forEach(h => h.pause());
      updatePlaybackState('paused');
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      howls.current.forEach(h => h.stop());
      updatePlaybackState('paused');
    });

    // optional (map sang pause)
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      howls.current.forEach(h => h.pause());
      updatePlaybackState('paused');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      howls.current.forEach(h => h.pause());
      updatePlaybackState('paused');
    });
  }, []);

  // -------------------------
  // 🎵 CORE
  // -------------------------
  const getOrCreate = useCallback(
    (soundId: string, url: string, volume: number): Howl => {
      if (howls.current.has(soundId)) {
        return howls.current.get(soundId)!;
      }

      const h = new Howl({
        src: [url],
        loop: true,
        volume,
        html5: false,
        preload: true,

        onplay: () => updatePlaybackState('playing'),

        onpause: () => {
          const anyPlaying = Array.from(howls.current.values()).some(x => x.playing());
          updatePlaybackState(anyPlaying ? 'playing' : 'paused');
        },

        onstop: () => {
          const anyPlaying = Array.from(howls.current.values()).some(x => x.playing());
          updatePlaybackState(anyPlaying ? 'playing' : 'paused');
        },

        onloaderror: (_id, err) => {
          console.warn(`[AudioEngine] load error ${soundId}`, err);
        },

        onplayerror: (_id, err) => {
          console.warn(`[AudioEngine] play error ${soundId}`, err);
          h.once('unlock', () => h.play());
        },
      });

      howls.current.set(soundId, h);
      return h;
    },
    []
  );

  // -------------------------
  // 🎮 ACTIONS
  // -------------------------
  const play = useCallback(
    (soundId: string, url: string, volume: number) => {
      setupMediaSession();

      const h = getOrCreate(soundId, url, volume);
      if (!h.playing()) h.play();
    },
    [getOrCreate, setupMediaSession]
  );

  const pause = useCallback((soundId: string) => {
    howls.current.get(soundId)?.pause();
  }, []);

  const stop = useCallback((soundId: string) => {
    const h = howls.current.get(soundId);
    if (h) {
      h.stop();
      h.unload();
      howls.current.delete(soundId);
    }
  }, []);

  const stopAll = useCallback(() => {
    howls.current.forEach(h => {
      h.stop();
      h.unload();
    });
    howls.current.clear();
    updatePlaybackState('paused');
  }, []);

  const pauseAll = useCallback(() => {
    howls.current.forEach(h => h.pause());
    updatePlaybackState('paused');
  }, []);

  const resumeAll = useCallback(() => {
    howls.current.forEach(h => !h.playing() && h.play());
    updatePlaybackState('playing');
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

  return {
    play,
    pause,
    stop,
    stopAll,
    pauseAll,
    resumeAll,
    setVolume,
    setMute,
    setMasterVolume,
    isPlaying,
  };
}