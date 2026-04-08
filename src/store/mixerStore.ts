import { create } from 'zustand';
import type { Track, Mix, User, Page } from '../types';

export interface MixerState {
  // ── Tracks ─────────────────────────────────────────────
  tracks: Track[];
  addTrack: (t: Omit<Track, 'loop' | 'muted' | 'solo'>) => boolean; // returns false if limit hit
  removeTrack: (soundId: string) => void;
  updateVolume: (soundId: string, volume: number) => void;
  toggleMute: (soundId: string) => void;
  toggleSolo: (soundId: string) => void;
  clearTracks: () => void;
  loadTracks: (tracks: Track[]) => void;

  // ── Playback ────────────────────────────────────────────
  isPlaying: boolean;
  setPlaying: (v: boolean) => void;

  // ── Mix metadata ────────────────────────────────────────
  mixName: string;
  mixDesc: string;
  isPublic: boolean;
  setMixName: (v: string) => void;
  setMixDesc: (v: string) => void;
  setPublic: (v: boolean) => void;
  resetMix: () => void;

  // ── Master volume ───────────────────────────────────────
  masterVolume: number;
  setMasterVolume: (v: number) => void;

  // ── Sleep timer ─────────────────────────────────────────
  sleepMins: number;
  setSleepMins: (v: number) => void;

  // ── Saved mixes ─────────────────────────────────────────
  savedMixes: Mix[];
  addSavedMix: (m: Mix) => void;
  deleteSavedMix: (id: string) => void;

  // ── Auth ────────────────────────────────────────────────
  user: User | null;
  setUser: (u: User | null) => void;

  // ── Navigation ──────────────────────────────────────────
  page: Page;
  setPage: (p: Page) => void;

  // ── Feed playback ───────────────────────────────────────
  feedPlayingId: string | null;
  setFeedPlayingId: (id: string | null) => void;
}

const MAX_TRACKS = 6;

export const useMixerStore = create<MixerState>((set, get) => ({
  // ── Tracks ─────────────────────────────────────────────
  tracks: [],

  addTrack: (t) => {
    const { tracks } = get();
    if (tracks.length >= MAX_TRACKS) return false;
    if (tracks.find(x => x.soundId === t.soundId)) return false;
    set(s => ({
      tracks: [...s.tracks, { ...t, loop: true, muted: false, solo: false }],
    }));
    return true;
  },

  removeTrack: (soundId) =>
    set(s => ({ tracks: s.tracks.filter(t => t.soundId !== soundId) })),

  updateVolume: (soundId, volume) =>
    set(s => ({
      tracks: s.tracks.map(t => t.soundId === soundId ? { ...t, volume } : t),
    })),

  toggleMute: (soundId) =>
    set(s => ({
      tracks: s.tracks.map(t => t.soundId === soundId ? { ...t, muted: !t.muted } : t),
    })),

  toggleSolo: (soundId) =>
    set(s => {
      const already = s.tracks.find(t => t.soundId === soundId)?.solo ?? false;
      return {
        tracks: s.tracks.map(t =>
          already ? { ...t, solo: false } : { ...t, solo: t.soundId === soundId }
        ),
      };
    }),

  clearTracks: () => set({ tracks: [] }),

  loadTracks: (tracks) => set({ tracks }),

  // ── Playback ────────────────────────────────────────────
  isPlaying: false,
  setPlaying: (v) => set({ isPlaying: v }),

  // ── Mix metadata ────────────────────────────────────────
  mixName: '',
  mixDesc: '',
  isPublic: false,
  setMixName: (v) => set({ mixName: v }),
  setMixDesc: (v) => set({ mixDesc: v }),
  setPublic:  (v) => set({ isPublic: v }),
  resetMix: () => set({ mixName:'', mixDesc:'', isPublic:false, tracks:[], isPlaying:false }),

  // ── Master volume ───────────────────────────────────────
  masterVolume: 1,
  setMasterVolume: (v) => set({ masterVolume: v }),

  // ── Sleep timer ─────────────────────────────────────────
  sleepMins: 0,
  setSleepMins: (v) => set({ sleepMins: v }),

  // ── Saved mixes ─────────────────────────────────────────
  savedMixes: [],
  addSavedMix: (m) => set(s => ({ savedMixes: [m, ...s.savedMixes] })),
  deleteSavedMix: (id) => set(s => ({ savedMixes: s.savedMixes.filter(m => m.id !== id) })),

  // ── Auth ────────────────────────────────────────────────
  user: null,
  setUser: (u) => set({ user: u }),

  // ── Navigation ──────────────────────────────────────────
  page: 'studio',
  setPage: (p) => set({ page: p }),

  // ── Feed playback ───────────────────────────────────────
  feedPlayingId: null,
  setFeedPlayingId: (id) => set({ feedPlayingId: id }),
}));
