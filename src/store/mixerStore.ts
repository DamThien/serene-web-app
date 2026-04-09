import { create } from 'zustand';
import type {
  FrequencyLayer,
  Mix,
  Page,
  SilentFrequency,
  Subscription,
  SubscriptionPlan,
  Track,
  User,
} from '../types';

export interface MixerState {
  tracks: Track[];
  addTrack: (track: Omit<Track, 'loop' | 'muted' | 'solo'>) => boolean;
  removeTrack: (soundId: string) => void;
  updateVolume: (soundId: string, volume: number) => void;
  toggleMute: (soundId: string) => void;
  toggleSolo: (soundId: string) => void;
  clearTracks: () => void;
  loadTracks: (tracks: Track[]) => void;

  isPlaying: boolean;
  setPlaying: (value: boolean) => void;

  mixName: string;
  mixDesc: string;
  isPublic: boolean;
  activeMixId: string | null;
  activeMixOwned: boolean;
  selectedSilentFrequencies: SilentFrequency[];
  selectedFrequencyLayer: FrequencyLayer | null;
  setMixName: (value: string) => void;
  setMixDesc: (value: string) => void;
  setPublic: (value: boolean) => void;
  setActiveMixContext: (mixId: string | null, owned: boolean) => void;
  setSelectedSilentFrequencies: (items: SilentFrequency[]) => void;
  toggleSilentFrequency: (item: SilentFrequency) => boolean;
  setSelectedFrequencyLayer: (item: FrequencyLayer | null) => void;
  resetMix: () => void;

  masterVolume: number;
  setMasterVolume: (value: number) => void;

  sleepMins: number;
  setSleepMins: (value: number) => void;

  savedMixes: Mix[];
  setSavedMixes: (mixes: Mix[]) => void;
  addSavedMix: (mix: Mix) => void;
  upsertSavedMix: (mix: Mix) => void;
  deleteSavedMix: (id: string) => void;

  user: User | null;
  authReady: boolean;
  favoriteSoundIds: string[];
  subscription: Subscription | null;
  subscriptionPlans: SubscriptionPlan[];
  setUser: (user: User | null) => void;
  setAuthReady: (value: boolean) => void;
  setFavoriteSoundIds: (ids: string[]) => void;
  toggleFavoriteSoundId: (id: string, next?: boolean) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setSubscriptionPlans: (plans: SubscriptionPlan[]) => void;
  isPremiumUnlocked: () => boolean;

  page: Page;
  setPage: (page: Page) => void;

  feedPlayingId: string | null;
  setFeedPlayingId: (id: string | null) => void;
}

const MAX_TRACKS = 6;
const MAX_SILENT_FREQUENCIES = 2;

export const useMixerStore = create<MixerState>((set, get) => ({
  tracks: [],
  addTrack: (track) => {
    const { tracks } = get();
    if (tracks.length >= MAX_TRACKS) return false;
    if (tracks.find((item) => item.soundId === track.soundId)) return false;

    set((state) => ({
      tracks: [...state.tracks, { ...track, loop: true, muted: false, solo: false }],
    }));
    return true;
  },
  removeTrack: (soundId) =>
    set((state) => ({
      tracks: state.tracks.filter((track) => track.soundId !== soundId),
    })),
  updateVolume: (soundId, volume) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (
        track.soundId === soundId ? { ...track, volume } : track
      )),
    })),
  toggleMute: (soundId) =>
    set((state) => ({
      tracks: state.tracks.map((track) => (
        track.soundId === soundId ? { ...track, muted: !track.muted } : track
      )),
    })),
  toggleSolo: (soundId) =>
    set((state) => {
      const active = state.tracks.find((track) => track.soundId === soundId)?.solo ?? false;
      return {
        tracks: state.tracks.map((track) => (
          active ? { ...track, solo: false } : { ...track, solo: track.soundId === soundId }
        )),
      };
    }),
  clearTracks: () => set({ tracks: [] }),
  loadTracks: (tracks) => set({ tracks }),

  isPlaying: false,
  setPlaying: (value) => set({ isPlaying: value }),

  mixName: '',
  mixDesc: '',
  isPublic: false,
  activeMixId: null,
  activeMixOwned: false,
  selectedSilentFrequencies: [],
  selectedFrequencyLayer: null,
  setMixName: (value) => set({ mixName: value }),
  setMixDesc: (value) => set({ mixDesc: value }),
  setPublic: (value) => set({ isPublic: value }),
  setActiveMixContext: (mixId, owned) => set({ activeMixId: mixId, activeMixOwned: owned }),
  setSelectedSilentFrequencies: (items) =>
    set({ selectedSilentFrequencies: items.slice(0, MAX_SILENT_FREQUENCIES) }),
  toggleSilentFrequency: (item) => {
    const current = get().selectedSilentFrequencies;
    const exists = current.some((entry) => entry.id === item.id);

    if (exists) {
      set({
        selectedSilentFrequencies: current.filter((entry) => entry.id !== item.id),
      });
      return true;
    }

    if (current.length >= MAX_SILENT_FREQUENCIES) {
      return false;
    }

    set({ selectedSilentFrequencies: [...current, item] });
    return true;
  },
  setSelectedFrequencyLayer: (item) => set({ selectedFrequencyLayer: item }),
  resetMix: () => set({
    mixName: '',
    mixDesc: '',
    isPublic: false,
    activeMixId: null,
    activeMixOwned: false,
    tracks: [],
    isPlaying: false,
    selectedSilentFrequencies: [],
    selectedFrequencyLayer: null,
  }),

  masterVolume: 1,
  setMasterVolume: (value) => set({ masterVolume: value }),

  sleepMins: 0,
  setSleepMins: (value) => set({ sleepMins: value }),

  savedMixes: [],
  setSavedMixes: (mixes) => set({ savedMixes: mixes }),
  addSavedMix: (mix) => set((state) => ({ savedMixes: [mix, ...state.savedMixes] })),
  upsertSavedMix: (mix) => set((state) => {
    const index = state.savedMixes.findIndex((item) => item._id === mix._id);
    if (index === -1) {
      return { savedMixes: [mix, ...state.savedMixes] };
    }

    const next = [...state.savedMixes];
    next[index] = mix;
    return { savedMixes: next };
  }),
  deleteSavedMix: (id) => set((state) => ({
    savedMixes: state.savedMixes.filter((mix) => mix._id !== id),
  })),

  user: null,
  authReady: false,
  favoriteSoundIds: [],
  subscription: null,
  subscriptionPlans: [],
  setUser: (user) => set({ user }),
  setAuthReady: (value) => set({ authReady: value }),
  setFavoriteSoundIds: (ids) => set({ favoriteSoundIds: ids }),
  toggleFavoriteSoundId: (id, next) => set((state) => {
    const exists = state.favoriteSoundIds.includes(id);
    const shouldAdd = next ?? !exists;

    if (shouldAdd && !exists) {
      return { favoriteSoundIds: [...state.favoriteSoundIds, id] };
    }

    if (!shouldAdd && exists) {
      return { favoriteSoundIds: state.favoriteSoundIds.filter((item) => item !== id) };
    }

    return state;
  }),
  setSubscription: (subscription) => set({ subscription }),
  setSubscriptionPlans: (plans) => set({ subscriptionPlans: plans }),
  isPremiumUnlocked: () => {
    const subscription = get().subscription;
    return Boolean(subscription?.isActive && subscription?.status !== 'expired');
  },

  page: 'studio',
  setPage: (page) => set({ page }),

  feedPlayingId: null,
  setFeedPlayingId: (id) => set({ feedPlayingId: id }),
}));
