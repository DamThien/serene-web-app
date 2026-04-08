import React, { useState } from 'react';
import { useMixerStore } from '../store/mixerStore';
import { AuthModal } from './AuthModal';

export const Topbar: React.FC = () => {
  const { page, setPage, user } = useMixerStore();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="topbar flex items-center justify-between border-b border-[var(--line)]
        bg-[var(--ink)] flex-shrink-0 z-20 relative">

        {/* Wordmark */}
        <span className="font-['Instrument_Serif'] italic text-[24px] text-[var(--bright)] tracking-tight">
          serene
        </span>

        {/* Nav tabs */}
        <nav className="flex gap-1 bg-[var(--ink3)] rounded-xl p-[4px]">
          {(['studio', 'feed'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`
                text-sm font-medium px-5 py-2 rounded-lg capitalize transition-all duration-150
                ${page === p
                  ? 'bg-[var(--ink4)] text-[var(--bright)]'
                  : 'text-[var(--mid)] hover:text-[var(--soft)]'
                }
              `}
            >
              {p === 'studio' ? 'Studio' : 'Community'}
            </button>
          ))}
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="text-sm text-[var(--mid)] hidden sm:inline">{user.name}</span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--sage2)] to-[var(--indigo)]
                flex items-center justify-center text-sm font-semibold text-white cursor-pointer">
                {user.avatar}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--line2)]
                  text-[var(--soft)] hover:bg-[var(--ink3)] hover:text-[var(--bright)] transition-all
                  hidden sm:flex"
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-sm font-medium px-4 py-2 rounded-lg
                  bg-[var(--sage2)] text-white hover:opacity-85 transition-opacity"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};
