import React, { useEffect } from 'react';
import { AudioEngineProvider } from './components/AudioEngineProvider';
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
  isAuthenticated,
} from './services/api';

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
    <div className="flex flex-col overflow-hidden bg-[var(--ink)] text-[var(--soft)]" style={{ height: '100dvh' }}>
      <AppBootstrap />
      <Topbar />
      <Pages />
      <ToastContainer />
    </div>
  </AudioEngineProvider>
);

export default App;
