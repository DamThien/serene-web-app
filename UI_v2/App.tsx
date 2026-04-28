import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Clock3,
  Heart,
  LayoutGrid,
  Lock,
  LogOut,
  Moon,
  Music2,
  Pause,
  Play,
  Settings,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { AudioEngineProvider, useAudioEngineContext } from '../src/components/AudioEngineProvider';
import { SoundCard } from '../src/components/SoundCard';
import { ToastContainer, toast } from '../src/components/Toast';
import { useMixerStore } from '../src/store/mixerStore';
import {
  createMix,
  deleteMix,
  fetchCategories,
  fetchFavoriteSounds,
  fetchFrequencyLayers,
  fetchMe,
  fetchPublicMixes,
  fetchSilentFrequencies,
  fetchSounds,
  fetchSubscription,
  fetchSubscriptionPlans,
  fetchUserMixes,
  getSession,
  hasRefreshSession,
  isAuthenticated,
  logout,
  restoreSession,
  updateMix,
  type Category,
} from '../src/services/api';
import type { FrequencyLayer, Mix, SilentFrequency, Sound, SubscriptionPlan, Track } from '../src/types';

type ThemeMode = 'light' | 'dark';
type ViewKey = 'home' | 'composer' | 'silence' | 'stats' | 'settings';

const THEME_STORAGE_KEY = 'serene-theme';
const TIMER_OPTIONS = [15, 30, 45, 60];

const fallbackCategories: Category[] = [
  { id: 'all', name: 'All', color: '#eeeef8' },
  { id: 'water', name: 'Water', color: '#0ea5e9' },
  { id: 'nature', name: 'Nature', color: '#22c55e' },
  { id: 'melodies', name: 'Melodies', color: '#8b5cf6' },
  { id: 'white-noise', name: 'White Noise', color: '#94a3b8' },
];

const navItems: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'home', label: 'Home', icon: <Moon size={18} /> },
  { key: 'composer', label: 'Composer', icon: <Music2 size={18} /> },
  { key: 'silence', label: 'Silence', icon: <Sparkles size={18} /> },
  { key: 'stats', label: 'Stats', icon: <BarChart3 size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const viewTitles: Record<ViewKey, { title: string; copy: string }> = {
  home: { title: 'Good Morning', copy: 'Welcome to your quiet space' },
  composer: { title: 'Sound Composer', copy: 'Select sounds to create your mix' },
  silence: { title: 'Silent Frequencies', copy: 'Layer subtle frequencies beneath your mix' },
  stats: { title: 'Listening Stats', copy: 'Saved mixes and community presets' },
  settings: { title: 'Account Settings', copy: 'Profile, plan, and session state' },
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveSoundId = (value: unknown) => {
  if (value && typeof value === 'object') {
    const sound = value as { _id?: string; id?: string };
    return String(sound._id ?? sound.id ?? '');
  }

  return String(value ?? '');
};

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const AppBootstrap: React.FC = () => {
  const setUser = useMixerStore((state) => state.setUser);
  const setAuthReady = useMixerStore((state) => state.setAuthReady);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const setFavoriteSoundIds = useMixerStore((state) => state.setFavoriteSoundIds);
  const setSubscription = useMixerStore((state) => state.setSubscription);
  const setSubscriptionPlans = useMixerStore((state) => state.setSubscriptionPlans);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = getSession();
        if (session.user) {
          setUser(session.user);
        }

        const plans = await fetchSubscriptionPlans().catch(() => []);
        setSubscriptionPlans(plans);

        if (!isAuthenticated() && hasRefreshSession()) {
          await restoreSession();
        }

        if (!isAuthenticated()) {
          return;
        }

        const [user, mixes, favorites, subscription] = await Promise.all([
          fetchMe(),
          fetchUserMixes().catch(() => []),
          fetchFavoriteSounds().catch(() => []),
          fetchSubscription().catch(() => null),
        ]);

        setUser(user);
        setSavedMixes(mixes);
        setFavoriteSoundIds(favorites);
        setSubscription(subscription);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to restore session');
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    void bootstrap();
  }, [setAuthReady, setFavoriteSoundIds, setSavedMixes, setSubscription, setSubscriptionPlans, setUser]);

  return null;
};

const UIv2Root: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="serene-v2-shell min-h-screen text-[var(--soft)]">
      <AppBootstrap />
      <UIv2Workspace theme={theme} onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))} />
      <ToastContainer />
    </div>
  );
};

const UIv2Workspace: React.FC<{ theme: ThemeMode; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
  const engine = useAudioEngineContext();
  const [view, setView] = useState<ViewKey>('home');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [silentFrequencies, setSilentFrequencies] = useState<SilentFrequency[]>([]);
  const [frequencyLayers, setFrequencyLayers] = useState<FrequencyLayer[]>([]);
  const [communityMixes, setCommunityMixes] = useState<Mix[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const tracks = useMixerStore((state) => state.tracks);
  const isPlaying = useMixerStore((state) => state.isPlaying);
  const setPlaying = useMixerStore((state) => state.setPlaying);
  const playbackStartedAt = useMixerStore((state) => state.playbackStartedAt);
  const playbackAccumulatedMs = useMixerStore((state) => state.playbackAccumulatedMs);
  const startPlaybackClock = useMixerStore((state) => state.startPlaybackClock);
  const pausePlaybackClock = useMixerStore((state) => state.pausePlaybackClock);
  const resetPlaybackClock = useMixerStore((state) => state.resetPlaybackClock);
  const mixName = useMixerStore((state) => state.mixName);
  const setMixName = useMixerStore((state) => state.setMixName);
  const mixDesc = useMixerStore((state) => state.mixDesc);
  const setMixDesc = useMixerStore((state) => state.setMixDesc);
  const isPublic = useMixerStore((state) => state.isPublic);
  const setPublic = useMixerStore((state) => state.setPublic);
  const masterVolume = useMixerStore((state) => state.masterVolume);
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume);
  const sleepMins = useMixerStore((state) => state.sleepMins);
  const setSleepMins = useMixerStore((state) => state.setSleepMins);
  const selectedSilentFrequencies = useMixerStore((state) => state.selectedSilentFrequencies);
  const toggleSilentFrequency = useMixerStore((state) => state.toggleSilentFrequency);
  const setSelectedSilentFrequencies = useMixerStore((state) => state.setSelectedSilentFrequencies);
  const selectedFrequencyLayer = useMixerStore((state) => state.selectedFrequencyLayer);
  const setSelectedFrequencyLayer = useMixerStore((state) => state.setSelectedFrequencyLayer);
  const loadTracks = useMixerStore((state) => state.loadTracks);
  const resetMix = useMixerStore((state) => state.resetMix);
  const savedMixes = useMixerStore((state) => state.savedMixes);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const addSavedMix = useMixerStore((state) => state.addSavedMix);
  const upsertSavedMix = useMixerStore((state) => state.upsertSavedMix);
  const deleteSavedMix = useMixerStore((state) => state.deleteSavedMix);
  const activeMixId = useMixerStore((state) => state.activeMixId);
  const activeMixOwned = useMixerStore((state) => state.activeMixOwned);
  const setActiveMixContext = useMixerStore((state) => state.setActiveMixContext);
  const favoriteSoundIds = useMixerStore((state) => state.favoriteSoundIds);
  const user = useMixerStore((state) => state.user);
  const authReady = useMixerStore((state) => state.authReady);
  const subscription = useMixerStore((state) => state.subscription);
  const setSubscription = useMixerStore((state) => state.setSubscription);
  const subscriptionPlans = useMixerStore((state) => state.subscriptionPlans);
  const isPremiumUnlocked = useMixerStore((state) => state.isPremiumUnlocked());

  const elapsedRef = useRef(Math.floor(playbackAccumulatedMs / 1000));
  const [elapsed, setElapsed] = useState(elapsedRef.current);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [soundList, categoryList, silentList, layerList, publicMixList] = await Promise.all([
          fetchSounds(),
          fetchCategories().catch(() => []),
          fetchSilentFrequencies().catch(() => []),
          fetchFrequencyLayers().catch(() => []),
          fetchPublicMixes().catch(() => []),
        ]);

        setSounds(soundList);
        if (categoryList.length > 0) {
          setCategories([{ id: 'all', name: 'All', color: '#eeeef8' }, ...categoryList]);
        }
        setSilentFrequencies(silentList);
        setFrequencyLayers(layerList);
        setCommunityMixes(publicMixList);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    elapsedRef.current = Math.floor(playbackAccumulatedMs / 1000);
    setElapsed(elapsedRef.current);
  }, [playbackAccumulatedMs]);

  useEffect(() => {
    if (!sleepMins) {
      setRemainingSeconds(0);
      return;
    }

    setRemainingSeconds(Math.max(0, sleepMins * 60 - elapsedRef.current));
  }, [sleepMins]);

  const handlePause = useCallback(() => {
    engine.pauseAll();
    pausePlaybackClock();
    setPlaying(false);
    engine.setMediaSessionState('paused');
  }, [engine, pausePlaybackClock, setPlaying]);

  const handleStop = useCallback(() => {
    engine.stopAll();
    setPlaying(false);
    resetPlaybackClock();
    elapsedRef.current = 0;
    setElapsed(0);
    setRemainingSeconds(0);
    engine.setMediaSessionState('none');
  }, [engine, resetPlaybackClock, setPlaying]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        const runningMs = playbackStartedAt === null
          ? playbackAccumulatedMs
          : playbackAccumulatedMs + Math.max(0, Date.now() - playbackStartedAt);
        const next = Math.floor(runningMs / 1000);
        elapsedRef.current = next;
        setElapsed(next);

        if (sleepMins > 0) {
          const nextRemaining = Math.max(0, sleepMins * 60 - next);
          setRemainingSeconds(nextRemaining);

          if (next >= sleepMins * 60) {
            handleStop();
            toast('Sleep timer ended');
          }
        }

        if (!isPremiumUnlocked && next >= 30 && tracks.some((track) => track.isPremium)) {
          handlePause();
          toast('Premium preview finished at 30 seconds');
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handlePause, handleStop, isPlaying, isPremiumUnlocked, playbackAccumulatedMs, playbackStartedAt, sleepMins, tracks]);

  useEffect(() => {
    const hasSolo = tracks.some((track) => track.solo);
    tracks.forEach((track) => {
      if (hasSolo) {
        engine.setMute(track.soundId, !track.solo);
      } else {
        engine.setMute(track.soundId, track.muted);
      }
    });
  }, [engine, tracks]);

  const filteredSounds = useMemo(() => {
    let next = sounds;

    if (category !== 'All') {
      next = next.filter((sound) => sound.categoryname === category);
    }

    if (freeOnly) {
      next = next.filter((sound) => sound.isFree);
    }

    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      next = next.filter((sound) =>
        sound.title.toLowerCase().includes(normalized)
        || sound.categoryname.toLowerCase().includes(normalized),
      );
    }

    return next;
  }, [category, freeOnly, query, sounds]);

  const recentMixes = useMemo(() => {
    const own = savedMixes.slice(0, 3);
    const community = communityMixes.slice(0, Math.max(0, 5 - own.length));
    return [...own, ...community].slice(0, 5);
  }, [communityMixes, savedMixes]);

  const groupedStats = useMemo(() => {
    const totalPlaytime = Math.round(savedMixes.reduce((sum, mix) => sum + mix.tracks.length * 14, 0));
    return {
      totalMixes: savedMixes.length,
      favoriteSounds: favoriteSoundIds.length,
      totalPlaytime,
    };
  }, [favoriteSoundIds.length, savedMixes]);

  const playTracks = useCallback(async (nextTracks: Track[], nextName: string, nextArtist?: string) => {
    if (nextTracks.length === 0) {
      toast('Add sounds to your mix first');
      return;
    }

    try {
      await Promise.all(
        nextTracks
          .filter((track) => !track.muted)
          .map((track) => engine.play(track.soundId, track.url, track.volume, track.playback)),
      );

      startPlaybackClock();
      setPlaying(true);
      engine.syncMediaSession(
        { title: nextName, artist: nextArtist ?? nextTracks.map((track) => track.title).join(', ') },
        {
          onPlay: () => {
            engine.resumeAll();
            startPlaybackClock();
            setPlaying(true);
          },
          onPause: handlePause,
          onStop: handleStop,
        },
      );
    } catch (error) {
      engine.stopAll();
      resetPlaybackClock();
      setPlaying(false);
      toast(error instanceof Error ? error.message : 'Could not start protected audio');
    }
  }, [engine, handlePause, handleStop, resetPlaybackClock, setPlaying, startPlaybackClock]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
      return;
    }

    void playTracks(tracks, mixName || 'Untitled Mix');
  }, [handlePause, isPlaying, mixName, playTracks, tracks]);

  const buildTrackFromSound = useCallback((sound: Sound, volume = 0.7): Track => {
    const isTrial = !sound.isFree && !isPremiumUnlocked;

    return {
      soundId: sound.id,
      volume,
      loop: true,
      muted: false,
      solo: false,
      title: sound.title,
      cat: sound.categoryname || 'Unknown',
      icon: sound.icon,
      url: isTrial && sound.previewUrl ? sound.previewUrl : sound.audioUrl,
      playback: sound.playback ?? null,
      isPremium: !sound.isFree,
      previewUrl: sound.previewUrl,
    };
  }, [isPremiumUnlocked]);

  const handleLoadMix = useCallback(async (mix: Mix, autoPlay = true) => {
    const mappedTracks = mix.tracks
      .map((trackData) => {
        const soundId = resolveSoundId(trackData.soundId);
        const sound = sounds.find((item) => item.id === soundId);
        if (!sound) return null;
        return buildTrackFromSound(sound, trackData.volume);
      })
      .filter(Boolean) as Track[];

    if (mappedTracks.length === 0) {
      toast('This mix has no playable sounds');
      return;
    }

    handleStop();
    loadTracks(mappedTracks);
    setMixName(mix.name);
    setMixDesc(mix.description ?? '');
    setPublic(Boolean(mix.isPublic && mix.isOwn));
    setSelectedSilentFrequencies(mix.silentFrequencies ?? []);
    setSelectedFrequencyLayer(mix.frequencyLayer ?? null);
    setActiveMixContext(mix.isOwn ? mix._id : null, Boolean(mix.isOwn));

    if (autoPlay) {
      await playTracks(mappedTracks, mix.name, mix.user ?? 'Serene');
    }
  }, [buildTrackFromSound, handleStop, loadTracks, playTracks, setActiveMixContext, setMixDesc, setMixName, setPublic, setSelectedFrequencyLayer, setSelectedSilentFrequencies, sounds]);

  const handlePreset = useCallback(async (title: string, categoriesToUse: string[], description: string) => {
    const selected = sounds
      .filter((sound) => categoriesToUse.includes(sound.categoryname))
      .slice(0, 3)
      .map((sound, index) => buildTrackFromSound(sound, [0.72, 0.65, 0.58][index] ?? 0.7));

    if (selected.length === 0) {
      toast('Preset sounds are not available yet');
      return;
    }

    handleStop();
    loadTracks(selected);
    setMixName(title);
    setMixDesc(description);
    setActiveMixContext(null, false);
    setSelectedSilentFrequencies([]);
    setSelectedFrequencyLayer(null);
    await playTracks(selected, title);
  }, [buildTrackFromSound, handleStop, loadTracks, playTracks, setActiveMixContext, setMixDesc, setMixName, setSelectedFrequencyLayer, setSelectedSilentFrequencies, sounds]);

  const handleMasterVolume = (value: number) => {
    setMasterVolume(value);
    engine.setMasterVolume(value);
  };

  const handleToggleSilentFrequency = (item: SilentFrequency) => {
    if (item.isPremium && !isPremiumUnlocked) {
      toast('Silent frequencies are part of Premium');
      return;
    }

    const ok = toggleSilentFrequency(item);
    if (!ok) {
      toast('You can add up to 2 silent frequencies');
      return;
    }
  };

  const handleToggleFrequencyLayer = (item: FrequencyLayer) => {
    if (!isPremiumUnlocked) {
      toast('Frequency layers are part of Premium');
      return;
    }

    setSelectedFrequencyLayer(selectedFrequencyLayer?.id === item.id ? null : item);
  };

  const buildPayload = () => ({
    name: mixName,
    description: mixDesc,
    icon: tracks[0]?.icon,
    sounds: tracks.map((track) => ({
      soundId: track.soundId,
      volume: Math.round(track.volume * 100),
    })),
    silentFrequencies: selectedSilentFrequencies.map((item) => ({
      silentFrequencyId: item.id,
    })),
    frequencyLayer: selectedFrequencyLayer ? { hz: selectedFrequencyLayer.hz } : null,
    isPublic,
  });

  const handleSaveMix = async () => {
    if (!isAuthenticated()) {
      toast('Sign in before saving a mix');
      return;
    }

    if (!mixName.trim()) {
      toast('Name your mix first');
      return;
    }

    if (tracks.length === 0) {
      toast('Add at least one sound');
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload();
      const mix = activeMixId && activeMixOwned
        ? await updateMix(activeMixId, payload)
        : await createMix(payload);

      const normalizedMix = {
        ...mix,
        icon: mix.icon || tracks[0].icon,
        tags: [...new Set(tracks.map((track) => track.cat.toLowerCase()))],
        isOwn: true,
      };

      if (activeMixId && activeMixOwned) {
        upsertSavedMix(normalizedMix);
        toast('Mix updated successfully');
      } else {
        addSavedMix(normalizedMix);
        toast(isPublic ? 'Mix saved to your library' : 'Private mix saved');
      }

      setActiveMixContext(normalizedMix._id, true);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save mix');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMix = async () => {
    if (!activeMixId || !activeMixOwned) return;

    setDeleting(true);

    try {
      await deleteMix(activeMixId);
      deleteSavedMix(activeMixId);
      handleStop();
      resetMix();
      toast('Mix deleted');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete mix');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshAccount = async () => {
    if (!isAuthenticated()) return;

    setAccountLoading(true);
    try {
      const [mixes, nextSubscription] = await Promise.all([
        fetchUserMixes().catch(() => []),
        fetchSubscription().catch(() => null),
      ]);
      setSavedMixes(mixes);
      setSubscription(nextSubscription);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.reload();
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    if (authReady && isAuthenticated()) {
      void handleRefreshAccount();
    }
  }, [authReady]);

  const topPlans = useMemo(() => {
    const highlightPlan = subscriptionPlans.find((plan) => plan.isPopular) ?? subscriptionPlans[0];
    return highlightPlan ? [highlightPlan, ...subscriptionPlans.filter((plan) => plan.id !== highlightPlan.id).slice(0, 2)] : [];
  }, [subscriptionPlans]);

  const currentTitle = viewTitles[view];

  return (
    <div className="v2-layout">
      <aside className="v2-sidebar">
        <div className="v2-brand">
          <div className="v2-brand-mark">S</div>
          <div>
            <p className="v2-eyebrow">Quiet space</p>
            <h1>Serene</h1>
          </div>
        </div>

        <nav className="v2-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`v2-nav-item ${view === item.key ? 'is-active' : ''}`}
              onClick={() => setView(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          className="v2-focus-card"
          onClick={() => {
            setView('composer');
            void handlePreset('Sleep Mode', ['Water', 'White Noise', 'Melodies'], 'Wind down and rest');
          }}
        >
          <div className="v2-focus-icon"><Moon size={20} /></div>
          <div>
            <p className="v2-eyebrow">Quick start</p>
            <strong>Sleep Mode</strong>
            <span>Ocean, rain, soft drone</span>
          </div>
        </button>
      </aside>

      <main className="v2-main">
        <header className="v2-topbar">
          <div>
            <p className="v2-eyebrow">{currentTitle.copy}</p>
            <h2>{currentTitle.title}</h2>
          </div>

          <div className="v2-topbar-actions">
            <button className="v2-secondary-btn" onClick={onToggleTheme}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button className="v2-primary-btn" onClick={() => setView('composer')}>
              Open composer
            </button>
          </div>
        </header>

        <div className="v2-content-grid">
          <div className="v2-main-column">
            {view === 'home' && (
              <HomeView
                recentMixes={recentMixes}
                onLoadMix={handleLoadMix}
                onOpenComposer={() => setView('composer')}
                onPreset={handlePreset}
                loading={loading}
              />
            )}

            {view === 'composer' && (
              <ComposerView
                categories={categories}
                category={category}
                filteredSounds={filteredSounds}
                freeOnly={freeOnly}
                loading={loading}
                mixDesc={mixDesc}
                mixName={mixName}
                query={query}
                setCategory={setCategory}
                setFreeOnly={setFreeOnly}
                setMixDesc={setMixDesc}
                setMixName={setMixName}
                setQuery={setQuery}
                tracks={tracks}
                isPublic={isPublic}
                setPublic={setPublic}
              />
            )}

            {view === 'silence' && (
              <SilenceView
                frequencyLayers={frequencyLayers}
                selectedFrequencyLayer={selectedFrequencyLayer}
                selectedSilentFrequencies={selectedSilentFrequencies}
                silentFrequencies={silentFrequencies}
                onToggleFrequencyLayer={handleToggleFrequencyLayer}
                onToggleSilentFrequency={handleToggleSilentFrequency}
                premiumUnlocked={isPremiumUnlocked}
              />
            )}

            {view === 'stats' && (
              <StatsView
                communityMixes={communityMixes}
                groupedStats={groupedStats}
                onLoadMix={handleLoadMix}
                savedMixes={savedMixes}
              />
            )}

            {view === 'settings' && (
              <SettingsView
                accountLoading={accountLoading}
                authReady={authReady}
                isAuthenticated={isAuthenticated()}
                loggingOut={loggingOut}
                onLogout={handleLogout}
                plans={topPlans}
                subscription={subscription}
                user={user}
              />
            )}
          </div>

          <aside className="v2-rail">
            <PlayerPanel
              activeMixId={activeMixId}
              activeMixOwned={activeMixOwned}
              deleting={deleting}
              elapsed={elapsed}
              handleDeleteMix={handleDeleteMix}
              handleMasterVolume={handleMasterVolume}
              handleStop={handleStop}
              handleTogglePlay={handleTogglePlay}
              isPlaying={isPlaying}
              isPublic={isPublic}
              masterVolume={masterVolume}
              mixName={mixName}
              remainingSeconds={remainingSeconds}
              saving={saving}
              selectedFrequencyLayer={selectedFrequencyLayer}
              selectedSilentFrequencies={selectedSilentFrequencies}
              sleepMins={sleepMins}
              setSleepMins={setSleepMins}
              tracks={tracks}
              onSave={handleSaveMix}
            />
          </aside>
        </div>
      </main>
    </div>
  );
};

const HomeView: React.FC<{
  recentMixes: Mix[];
  onLoadMix: (mix: Mix) => Promise<void>;
  onOpenComposer: () => void;
  onPreset: (title: string, categoriesToUse: string[], description: string) => Promise<void>;
  loading: boolean;
}> = ({ recentMixes, onLoadMix, onOpenComposer, onPreset, loading }) => (
  <>
    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Quick Start</p>
          <h3>Modes</h3>
        </div>
      </div>

      <div className="v2-mode-grid">
        <button className="v2-mode-card gradient-sleep" onClick={() => void onPreset('Sleep Mode', ['Water', 'White Noise', 'Melodies'], 'Wind down and rest')}>
          <span className="v2-mode-icon"><Moon size={18} /></span>
          <strong>Sleep Mode</strong>
          <p>Ocean, Rain, Soft Drone</p>
        </button>
        <button className="v2-mode-card gradient-calm" onClick={() => void onPreset('Calm Mode', ['Nature', 'Water'], 'Relax and breathe')}>
          <span className="v2-mode-icon"><Heart size={18} /></span>
          <strong>Calm Mode</strong>
          <p>Forest, Birds, Stream</p>
        </button>
        <button className="v2-mode-card gradient-focus" onClick={() => void onPreset('Focus Mode', ['Melodies', 'White Noise', 'Nature'], 'Deep work')}>
          <span className="v2-mode-icon"><Sparkles size={18} /></span>
          <strong>Focus Mode</strong>
          <p>Piano, White Noise, Stream</p>
        </button>
      </div>
    </section>

    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Your Mixes</p>
          <h3>Recent Sessions</h3>
        </div>
        <button className="v2-secondary-btn" onClick={onOpenComposer}>Create mix</button>
      </div>

      {loading ? (
        <div className="v2-empty">Loading recent sessions...</div>
      ) : recentMixes.length === 0 ? (
        <div className="v2-empty">No sessions yet. Build your first mix in Composer.</div>
      ) : (
        <div className="v2-session-list">
          {recentMixes.map((mix) => (
            <button key={mix._id} className="v2-session-item" onClick={() => void onLoadMix(mix)}>
              <div className="v2-session-meta">
                <span className="v2-session-icon"><Music2 size={18} /></span>
                <div>
                  <strong>{mix.name}</strong>
                  <p>{mix.tags?.slice(0, 2).join(' · ') || 'Ambient mix'}</p>
                </div>
              </div>
              <span>{mix.tracks.length} sounds</span>
            </button>
          ))}
        </div>
      )}
    </section>
  </>
);

const ComposerView: React.FC<{
  categories: Category[];
  category: string;
  filteredSounds: Sound[];
  freeOnly: boolean;
  loading: boolean;
  mixDesc: string;
  mixName: string;
  query: string;
  setCategory: (value: string) => void;
  setFreeOnly: (value: boolean) => void;
  setMixDesc: (value: string) => void;
  setMixName: (value: string) => void;
  setQuery: (value: string) => void;
  tracks: Track[];
  isPublic: boolean;
  setPublic: (value: boolean) => void;
}> = ({
  categories,
  category,
  filteredSounds,
  freeOnly,
  loading,
  mixDesc,
  mixName,
  query,
  setCategory,
  setFreeOnly,
  setMixDesc,
  setMixName,
  setQuery,
  tracks,
  isPublic,
  setPublic,
}) => {
  const hasSolo = tracks.some((track) => track.solo);

  return (
    <>
      <section className="v2-panel">
        <div className="v2-composer-head">
          <div className="v2-field-stack">
            <input
              value={mixName}
              onChange={(event) => setMixName(event.target.value)}
              placeholder="Name your mix"
              className="v2-title-input"
              maxLength={60}
            />
            <input
              value={mixDesc}
              onChange={(event) => setMixDesc(event.target.value)}
              placeholder="Short description"
              className="v2-subtitle-input"
              maxLength={140}
            />
          </div>
          <div className="v2-visibility-switch">
            <button className={!isPublic ? 'is-active' : ''} onClick={() => setPublic(false)}>
              <Lock size={14} /> Private
            </button>
            <button className={isPublic ? 'is-active' : ''} onClick={() => setPublic(true)}>
              <LayoutGrid size={14} /> Public
            </button>
          </div>
        </div>

        <div className="v2-chip-row">
          <span className="v2-pill">{tracks.length} / 6 sounds</span>
          <span className="v2-pill">Favorites and premium logic from code cũ</span>
          {hasSolo && <span className="v2-pill is-accent">Solo active</span>}
        </div>
      </section>

      <section className="v2-panel">
        <div className="v2-section-head">
          <div>
            <p className="v2-eyebrow">Quick Add Sounds</p>
            <h3>Library</h3>
          </div>
          <div className="v2-toolbar">
            <input
              className="v2-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sounds..."
            />
            <label className="v2-toggle">
              <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
              <span>Free only</span>
            </label>
          </div>
        </div>

        <div className="v2-chip-row">
          {categories.map((item) => (
            <button
              key={item.id}
              className={`v2-filter-chip ${category === item.name ? 'is-active' : ''}`}
              onClick={() => setCategory(item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="v2-empty">Loading sounds...</div>
        ) : filteredSounds.length === 0 ? (
          <div className="v2-empty">No sounds match this filter.</div>
        ) : (
          <div className="v2-sound-list">
            {filteredSounds.slice(0, 40).map((sound) => (
              <SoundCard key={sound.id} sound={sound} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

const SilenceView: React.FC<{
  frequencyLayers: FrequencyLayer[];
  selectedFrequencyLayer: FrequencyLayer | null;
  selectedSilentFrequencies: SilentFrequency[];
  silentFrequencies: SilentFrequency[];
  onToggleFrequencyLayer: (item: FrequencyLayer) => void;
  onToggleSilentFrequency: (item: SilentFrequency) => void;
  premiumUnlocked: boolean;
}> = ({
  frequencyLayers,
  selectedFrequencyLayer,
  selectedSilentFrequencies,
  silentFrequencies,
  onToggleFrequencyLayer,
  onToggleSilentFrequency,
  premiumUnlocked,
}) => (
  <>
    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Up to 2 silent frequencies</p>
          <h3>Silent Quantum Frequencies</h3>
        </div>
      </div>

      <div className="v2-frequency-list">
        {silentFrequencies.map((item) => {
          const active = selectedSilentFrequencies.some((entry) => entry.id === item.id);
          return (
            <button
              key={item.id}
              className={`v2-frequency-card ${active ? 'is-active' : ''}`}
              onClick={() => onToggleSilentFrequency(item)}
            >
              <div>
                <strong>{item.title}</strong>
                <p>{item.description || item.subtitle || item.category}</p>
              </div>
              <span>{item.isPremium ? 'Premium' : 'Free'}</span>
            </button>
          );
        })}
      </div>
    </section>

    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Pick 1 frequency layer</p>
          <h3>Frequency Layer</h3>
        </div>
        {!premiumUnlocked && <span className="v2-plan-tag">Premium</span>}
      </div>

      <div className="v2-layer-grid">
        {frequencyLayers.map((item) => (
          <button
            key={item.id}
            className={`v2-layer-card ${selectedFrequencyLayer?.id === item.id ? 'is-active' : ''}`}
            onClick={() => onToggleFrequencyLayer(item)}
          >
            <strong>{item.hz} Hz</strong>
            <p>{item.title}</p>
          </button>
        ))}
      </div>
    </section>
  </>
);

const StatsView: React.FC<{
  communityMixes: Mix[];
  groupedStats: { totalMixes: number; favoriteSounds: number; totalPlaytime: number };
  onLoadMix: (mix: Mix) => Promise<void>;
  savedMixes: Mix[];
}> = ({ communityMixes, groupedStats, onLoadMix, savedMixes }) => (
  <>
    <section className="v2-stat-grid">
      <article className="v2-metric-card">
        <p className="v2-eyebrow">Saved mixes</p>
        <strong>{groupedStats.totalMixes}</strong>
        <span>Current library</span>
      </article>
      <article className="v2-metric-card">
        <p className="v2-eyebrow">Favorite sounds</p>
        <strong>{groupedStats.favoriteSounds}</strong>
        <span>Synced from account</span>
      </article>
      <article className="v2-metric-card">
        <p className="v2-eyebrow">Estimated minutes</p>
        <strong>{groupedStats.totalPlaytime}</strong>
        <span>Approx from saved mixes</span>
      </article>
    </section>

    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Your library</p>
          <h3>Saved Mixes</h3>
        </div>
      </div>
      <div className="v2-session-list">
        {savedMixes.length === 0 ? (
          <div className="v2-empty">No saved mixes yet.</div>
        ) : savedMixes.map((mix) => (
          <button key={mix._id} className="v2-session-item" onClick={() => void onLoadMix(mix)}>
            <div className="v2-session-meta">
              <span className="v2-session-icon"><Heart size={16} /></span>
              <div>
                <strong>{mix.name}</strong>
                <p>{mix.description || 'Saved mix'}</p>
              </div>
            </div>
            <span>{mix.tracks.length} sounds</span>
          </button>
        ))}
      </div>
    </section>

    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Community</p>
          <h3>Featured Mixes</h3>
        </div>
      </div>
      <div className="v2-session-list">
        {communityMixes.slice(0, 6).map((mix) => (
          <button key={mix._id} className="v2-session-item" onClick={() => void onLoadMix(mix)}>
            <div className="v2-session-meta">
              <span className="v2-session-icon"><Waves size={16} /></span>
              <div>
                <strong>{mix.name}</strong>
                <p>{mix.user || 'Serene community'}</p>
              </div>
            </div>
            <span>{mix.plays ?? 0} plays</span>
          </button>
        ))}
      </div>
    </section>
  </>
);

const SettingsView: React.FC<{
  accountLoading: boolean;
  authReady: boolean;
  isAuthenticated: boolean;
  loggingOut: boolean;
  onLogout: () => Promise<void>;
  plans: SubscriptionPlan[];
  subscription: ReturnType<typeof useMixerStore.getState>['subscription'];
  user: ReturnType<typeof useMixerStore.getState>['user'];
}> = ({ accountLoading, authReady, isAuthenticated, loggingOut, onLogout, plans, subscription, user }) => (
  <>
    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Account</p>
          <h3>Profile</h3>
        </div>
        {isAuthenticated && (
          <button className="v2-secondary-btn" onClick={() => void onLogout()} disabled={loggingOut}>
            <LogOut size={14} />
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        )}
      </div>

      {!authReady ? (
        <div className="v2-empty">Checking session...</div>
      ) : !isAuthenticated ? (
        <div className="v2-empty">You are not signed in. Existing auth flow from version cũ is preserved.</div>
      ) : (
        <div className="v2-settings-grid">
          <article className="v2-setting-row"><span>Name</span><strong>{accountLoading ? 'Loading...' : user?.name ?? 'Serene User'}</strong></article>
          <article className="v2-setting-row"><span>Email</span><strong>{user?.email ?? 'Not set'}</strong></article>
          <article className="v2-setting-row"><span>Plan</span><strong>{subscription?.plan ?? 'free'}</strong></article>
          <article className="v2-setting-row"><span>Status</span><strong>{subscription?.status ?? 'active'}</strong></article>
        </div>
      )}
    </section>

    <section className="v2-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Subscriptions</p>
          <h3>Plans</h3>
        </div>
      </div>
      <div className="v2-plan-list">
        {plans.length === 0 ? (
          <div className="v2-empty">No subscription plans available.</div>
        ) : plans.map((plan) => (
          <article key={plan.id} className={`v2-plan-card ${plan.isPopular ? 'is-featured' : ''}`}>
            <div className="v2-plan-header">
              <strong>{plan.name}</strong>
              {plan.isPopular && <span className="v2-plan-tag">Popular</span>}
            </div>
            <p>{plan.description || 'Premium access'}</p>
            <ul>
              {plan.features.slice(0, 4).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  </>
);

const PlayerPanel: React.FC<{
  activeMixId: string | null;
  activeMixOwned: boolean;
  deleting: boolean;
  elapsed: number;
  handleDeleteMix: () => Promise<void>;
  handleMasterVolume: (value: number) => void;
  handleStop: () => void;
  handleTogglePlay: () => void;
  isPlaying: boolean;
  isPublic: boolean;
  masterVolume: number;
  mixName: string;
  remainingSeconds: number;
  saving: boolean;
  selectedFrequencyLayer: FrequencyLayer | null;
  selectedSilentFrequencies: SilentFrequency[];
  sleepMins: number;
  setSleepMins: (value: number) => void;
  tracks: Track[];
  onSave: () => Promise<void>;
}> = ({
  activeMixId,
  activeMixOwned,
  deleting,
  elapsed,
  handleDeleteMix,
  handleMasterVolume,
  handleStop,
  handleTogglePlay,
  isPlaying,
  isPublic,
  masterVolume,
  mixName,
  remainingSeconds,
  saving,
  selectedFrequencyLayer,
  selectedSilentFrequencies,
  sleepMins,
  setSleepMins,
  tracks,
  onSave,
}) => {
  const engine = useAudioEngineContext();
  const updateVolume = useMixerStore((state) => state.updateVolume);
  const toggleMute = useMixerStore((state) => state.toggleMute);
  const toggleSolo = useMixerStore((state) => state.toggleSolo);
  const removeTrack = useMixerStore((state) => state.removeTrack);
  const hasSolo = tracks.some((track) => track.solo);

  const masterPct = Math.round(masterVolume * 100);

  return (
    <section className="v2-panel v2-player-panel">
      <div className="v2-section-head">
        <div>
          <p className="v2-eyebrow">Now Playing</p>
          <h3>{mixName || 'Untitled Mix'}</h3>
        </div>
        <span className="v2-plan-tag">{isPublic ? 'Public' : 'Private'}</span>
      </div>

      <div className="v2-player-meta">
        <span>{tracks.length} sounds</span>
        <span>{formatDuration(elapsed)}</span>
        {sleepMins > 0 && <span>Sleep in {formatDuration(remainingSeconds)}</span>}
      </div>

      <div className="v2-player-actions">
        <button className="v2-icon-btn" onClick={handleTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="v2-icon-btn" onClick={handleStop} title="Stop">
          <Square size={18} />
        </button>
        <div className="v2-volume-wrap">
          <Volume2 size={16} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(event) => handleMasterVolume(parseFloat(event.target.value))}
            style={{ background: `linear-gradient(to right, #d88bff ${masterPct}%, rgba(255,255,255,0.08) ${masterPct}%)` }}
          />
        </div>
      </div>

      <div className="v2-chip-row">
        {TIMER_OPTIONS.map((minutes) => (
          <button
            key={minutes}
            className={`v2-filter-chip ${sleepMins === minutes ? 'is-active' : ''}`}
            onClick={() => setSleepMins(sleepMins === minutes ? 0 : minutes)}
          >
            <Clock3 size={14} />
            {minutes}m
          </button>
        ))}
      </div>

      <div className="v2-track-list">
        {tracks.length === 0 ? (
          <div className="v2-empty">Add sounds in Composer to control them here.</div>
        ) : tracks.map((track) => {
          const pct = Math.round(track.volume * 100);
          const dimmed = hasSolo && !track.solo;
          return (
            <article
              key={track.soundId}
              className={`v2-track-card ${track.solo ? 'is-solo' : ''} ${dimmed ? 'is-dimmed' : ''} ${track.muted ? 'is-muted' : ''}`}
            >
              <div className="v2-track-head">
                <div>
                  <strong>{track.title}</strong>
                  <p>{track.cat}</p>
                </div>
                <div className="v2-track-actions">
                  <button
                    className={`v2-mini-btn ${track.muted ? 'is-active' : ''}`}
                    onClick={() => {
                      toggleMute(track.soundId);
                      engine.setMute(track.soundId, !track.muted);
                    }}
                  >
                    {track.muted ? <VolumeX size={14} /> : 'M'}
                  </button>
                  <button className={`v2-mini-btn ${track.solo ? 'is-solo' : ''}`} onClick={() => toggleSolo(track.soundId)}>
                    S
                  </button>
                  <button
                    className="v2-mini-btn"
                    onClick={() => {
                      engine.stop(track.soundId);
                      removeTrack(track.soundId);
                    }}
                  >
                    x
                  </button>
                </div>
              </div>
              <div className="v2-volume-wrap">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.volume}
                  onChange={(event) => {
                    const value = parseFloat(event.target.value);
                    updateVolume(track.soundId, value);
                    if (!track.muted) engine.setVolume(track.soundId, value);
                  }}
                  style={{ background: `linear-gradient(to right, #d88bff ${pct}%, rgba(255,255,255,0.08) ${pct}%)` }}
                />
                <span>{pct}%</span>
              </div>
            </article>
          );
        })}
      </div>

      {(selectedSilentFrequencies.length > 0 || selectedFrequencyLayer) && (
        <div className="v2-chip-row">
          {selectedSilentFrequencies.map((item) => (
            <span key={item.id} className="v2-pill is-accent">
              <Sparkles size={12} />
              {item.title}
            </span>
          ))}
          {selectedFrequencyLayer && (
            <span className="v2-pill is-accent">
              <Waves size={12} />
              {selectedFrequencyLayer.hz} Hz
            </span>
          )}
        </div>
      )}

      <div className="v2-rail-actions">
        <button className="v2-primary-btn" onClick={() => void onSave()} disabled={saving || deleting}>
          {saving ? 'Saving...' : activeMixId && activeMixOwned ? 'Update mix' : 'Save mix'}
        </button>
        {activeMixId && activeMixOwned && (
          <button className="v2-secondary-btn" onClick={() => void handleDeleteMix()} disabled={saving || deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </section>
  );
};

const App: React.FC = () => (
  <AudioEngineProvider>
    <UIv2Root />
  </AudioEngineProvider>
);

export default App;
