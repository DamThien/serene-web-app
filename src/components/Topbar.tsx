import React, { useState } from 'react';
import { Crown, LogOut, MoonStar, SunMedium, UserRound } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { logout } from '../services/api';
import { AuthModal } from './AuthModal';
import { toast } from './Toast';
import sereneLogo from '../assets/serene_logo.jpg';

interface TopbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ theme, onToggleTheme }) => {
  const page = useMixerStore((state) => state.page);
  const setPage = useMixerStore((state) => state.setPage);
  const user = useMixerStore((state) => state.user);
  const subscription = useMixerStore((state) => state.subscription);
  const setUser = useMixerStore((state) => state.setUser);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const setFavoriteSoundIds = useMixerStore((state) => state.setFavoriteSoundIds);
  const setSubscription = useMixerStore((state) => state.setSubscription);
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
      <header className="topbar flex items-center gap-3 border-b border-[var(--line)] glass-panel flex-shrink-0 z-20 relative">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="flex w-11 h-11 rounded-[18px] items-center justify-center border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sage)] shadow-[var(--card-shadow)] overflow-hidden">
            <img
              src={sereneLogo}
              alt="Serene logo"
            />
          </div>
          <div className="min-w-0">
            <div className="font-['Instrument_Serif'] italic text-[24px] sm:text-[28px] text-[var(--bright)] tracking-tight leading-none hidden sm:block">
              serene
            </div>
            <div className="hidden md:block text-[11px] uppercase tracking-[0.24em] text-[var(--mid)] mt-1">
              Soft Focus Sound Studio
            </div>
          </div>
        </div>

        <nav className="flex gap-1.5 bg-[var(--surface)] rounded-[18px] p-[5px] min-w-0 border border-[var(--line)] shadow-[var(--card-shadow)]">
          {(['studio', 'feed'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`text-sm font-medium px-3 sm:px-5 py-2.5 rounded-[14px] capitalize transition-all duration-200 min-w-0 flex items-center justify-center ${page === item ? 'bg-[var(--surface-strong)] text-[var(--bright)] shadow-[0_10px_24px_rgba(0,0,0,0.08)]' : 'text-[var(--mid)] hover:text-[var(--soft)] hover:bg-[var(--surface-elevated)]'}`}
            >
              {item === 'studio' ? 'Studio' : 'Discover'}
            </button>
          ))}
          {user && (
            <button
              onClick={() => setPage('account')}
              className={`text-sm font-medium px-3 sm:px-4 py-2.5 rounded-[14px] transition-all duration-200 flex items-center justify-center gap-2 min-w-0 ${page === 'account' ? 'bg-[var(--surface-strong)] text-[var(--bright)] shadow-[0_10px_24px_rgba(0,0,0,0.08)]' : 'text-[var(--mid)] hover:text-[var(--soft)] hover:bg-[var(--surface-elevated)]'}`}
            >
              <UserRound size={14} />
              <span className="hidden sm:inline">Account</span>
            </button>
          )}
        </nav>

        <button
          onClick={onToggleTheme}
          className="w-11 h-11 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--soft)] hover:bg-[var(--surface-elevated)] transition-all duration-200 flex items-center justify-center shadow-[var(--card-shadow)] flex-shrink-0"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
        </button>

        {user ? (
          <>
            <div className="flex md:hidden items-center gap-2 flex-shrink-0">
              <button
                onClick={() => void handleLogout()}
                className="w-9 h-9 rounded-full border border-[var(--line2)] text-[var(--mid)] hover:text-[var(--bright)] hover:bg-[var(--surface-elevated)] transition-all flex items-center justify-center"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <>
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--mid)]">
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
                    className="w-9 h-9 rounded-full border border-[var(--line2)] text-[var(--mid)] hover:text-[var(--bright)] hover:bg-[var(--surface-elevated)] transition-all flex items-center justify-center"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => openAuth('login')}
              className="text-sm font-medium px-3 sm:px-4 py-2 rounded-xl border border-[var(--line2)] text-[var(--soft)] hover:bg-[var(--surface-elevated)] hover:text-[var(--bright)] transition-all"
            >
              <span className="sm:hidden">Sign in</span>
              <span className="hidden sm:inline">Sign in</span>
            </button>
            <button
              onClick={() => openAuth('register')}
              className="hidden sm:flex text-sm font-medium px-4 py-2 rounded-xl bg-[var(--sage2)] text-white hover:opacity-85 transition-opacity"
            >
              Sign up
            </button>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
    </>
  );
};
