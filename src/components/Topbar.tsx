import React, { useState } from 'react';
import { useMixerStore } from '../store/mixerStore';
import { AuthModal } from './AuthModal';

export const Topbar: React.FC = () => {
  const { page, setPage, user } = useMixerStore();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="h-12 flex items-center justify-between px-5 border-b border-[var(--line)]
        bg-[var(--ink)] flex-shrink-0 z-20 relative">

        {/* Wordmark */}
        <span className="font-['Instrument_Serif'] italic text-[20px] text-[var(--bright)] tracking-tight">
          serene
        </span>

        {/* Nav tabs */}
        <nav className="flex gap-0.5 bg-[var(--ink3)] rounded-lg p-[3px]">
          {(['studio', 'feed'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`
                text-[12px] font-medium px-4 py-1.5 rounded-md capitalize transition-all duration-150
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
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--mid)]">
                {user.name}
              </span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--sage2)] to-[var(--indigo)]
                flex items-center justify-center text-[11px] font-semibold text-white cursor-pointer">
                {user.avatar}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-[12px] font-medium px-3.5 py-1.5 rounded-lg border border-[var(--line2)]
                  text-[var(--soft)] hover:bg-[var(--ink3)] hover:text-[var(--bright)] transition-all"
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-[12px] font-medium px-3.5 py-1.5 rounded-lg
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
