import React, { useState } from 'react';
import { Crown, LogOut, UserRound } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { logout } from '../services/api';
import { AuthModal } from './AuthModal';
import { toast } from './Toast';

export const Topbar: React.FC = () => {
  const { page, setPage, user, subscription, setUser, setSavedMixes, setFavoriteSoundIds, setSubscription } = useMixerStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authOpen, setAuthOpen] = useState(false);

  const premium = Boolean(subscription?.isActive);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setSavedMixes([]);
      setFavoriteSoundIds([]);
      setSubscription(null);
      toast('Signed out');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  return (
    <>
      <header className="topbar flex items-center justify-between border-b border-[var(--line)] bg-[var(--ink)] flex-shrink-0 z-20 relative">
        <span className="font-['Instrument_Serif'] italic text-[24px] text-[var(--bright)] tracking-tight">
          serene
        </span>

        <nav className="flex gap-1 bg-[var(--ink3)] rounded-xl p-[4px]">
          {(['studio', 'feed'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`text-sm font-medium px-5 py-2 rounded-lg capitalize transition-all duration-150 ${page === item ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
            >
              {item === 'studio' ? 'Studio' : 'Community'}
            </button>
          ))}
          {user && (
            <button
              onClick={() => setPage('account')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-2 ${page === 'account' ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)] hover:text-[var(--soft)]'}`}
            >
              <UserRound size={14} />
              Account
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--ink3)] text-xs text-[var(--mid)]">
                <Crown size={13} className={premium ? 'text-[var(--gold)]' : 'text-[var(--mid)]'} />
                <span>{premium ? `Premium: ${subscription?.plan}` : 'Free plan'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-[var(--mid)] hidden sm:inline">{user.name}</span>
                <button
                  onClick={() => setPage('account')}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--sage2)] to-[var(--indigo)] flex items-center justify-center text-sm font-semibold text-white cursor-pointer"
                  title="Open account"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.avatar
                  )}
                </button>
                <button
                  onClick={() => void handleLogout()}
                  className="w-9 h-9 rounded-full border border-[var(--line2)] text-[var(--mid)] hover:text-[var(--bright)] hover:bg-[var(--ink3)] transition-all flex items-center justify-center"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--line2)] text-[var(--soft)] hover:bg-[var(--ink3)] hover:text-[var(--bright)] transition-all hidden sm:flex"
              >
                Sign in
              </button>
              <button
                onClick={() => openAuth('register')}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--sage2)] text-white hover:opacity-85 transition-opacity"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
    </>
  );
};
