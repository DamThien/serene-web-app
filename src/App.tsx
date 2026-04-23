import React, { useEffect, useState } from 'react';
import { AudioEngineProvider } from './components/AudioEngineProvider';
import { MixerPlayer } from './components/MixerPlayer';
import { Topbar } from './components/Topbar';
import { ToastContainer, toast } from './components/Toast';
import { StudioPage } from './pages/StudioPage';
import { FeedPage } from './pages/FeedPage';
import { AccountPage } from './pages/AccountPage';
import { useMixerStore } from './store/mixerStore';
import {
  fetchFavoriteSounds,
  fetchMe,
  fetchSubscription,
  fetchSubscriptionPlans,
  fetchUserMixes,
  getSession,
  hasRefreshSession,
  isAuthenticated,
  restoreSession,
} from './services/api';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'serene-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const Pages: React.FC = () => {
  const page = useMixerStore((state) => state.page);

  if (page === 'studio') {
    return (
      <div className="flex-col flex-1 overflow-hidden flex">
        <StudioPage />
      </div>
    );
  }

  if (page === 'account') {
    return (
      <div className="flex-col flex-1 overflow-hidden flex">
        <AccountPage />
      </div>
    );
  }

  return (
    <div className="flex-col flex-1 overflow-hidden flex">
      <FeedPage />
    </div>
  );
};

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

const App: React.FC = () => (
  <AudioEngineProvider>
    <AppShell />
  </AudioEngineProvider>
);

const AppShell: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="app-shell flex flex-col overflow-hidden text-[var(--soft)]" style={{ height: '100dvh' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />
      </div>
      <AppBootstrap />
      <Topbar theme={theme} onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))} />
      <Pages />
      <MixerPlayer />
      <ToastContainer />
    </div>
  );
};

export default App;
