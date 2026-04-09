import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { fetchFavoriteSounds, fetchSubscription, fetchUserMixes, login, register } from '../services/api';
import { toast } from './Toast';

interface Props {
  open: boolean;
  mode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ open, mode = 'login', onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const setUser = useMixerStore((state) => state.setUser);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const setFavoriteSoundIds = useMixerStore((state) => state.setFavoriteSoundIds);
  const setSubscription = useMixerStore((state) => state.setSubscription);

  const [tab, setTab] = useState<'login' | 'register'>(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTab(mode);
  }, [mode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handler);
    }

    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const hydrateAccount = async () => {
    const [mixes, favorites, subscription] = await Promise.all([
      fetchUserMixes().catch(() => []),
      fetchFavoriteSounds().catch(() => []),
      fetchSubscription().catch(() => null),
    ]);

    setSavedMixes(mixes);
    setFavoriteSoundIds(favorites);
    setSubscription(subscription);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (tab === 'register' && !name.trim())) {
      toast('Please complete the required fields');
      return;
    }

    setSubmitting(true);

    try {
      const user = tab === 'login'
        ? await login({ email, password })
        : await register({ name, email, password });

      setUser(user);
      await hydrateAccount();
      toast(tab === 'login' ? 'Signed in successfully' : 'Account created successfully');
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative bg-[var(--ink2)] border border-[var(--line2)] rounded-2xl p-8 w-[360px] shadow-[0_24px_64px_rgba(0,0,0,.6)] anim-fade">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[var(--line)] text-[var(--mid)] flex items-center justify-center hover:bg-[var(--ink4)] hover:text-[var(--soft)] transition-all"
        >
          <X size={13} />
        </button>

        <div className="flex items-center gap-2 bg-[var(--ink3)] p-1 rounded-xl mb-6">
          {(['login', 'register'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${tab === item ? 'bg-[var(--ink4)] text-[var(--bright)]' : 'text-[var(--mid)]'}`}
            >
              {item === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <h2 className="font-['Instrument_Serif'] italic text-[24px] text-[var(--bright)] mb-1">
          {tab === 'login' ? 'Welcome back' : 'Start your Serene account'}
        </h2>
        <p className="text-[12px] text-[var(--mid)] leading-relaxed mb-6">
          Save your mixes, sync favorites, and unlock premium listening across devices.
        </p>

        <div className="flex flex-col gap-2.5">
          {tab === 'register' && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--bright)] placeholder:text-[var(--dim)] outline-none focus:border-[var(--sage)] transition-colors"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--bright)] placeholder:text-[var(--dim)] outline-none focus:border-[var(--sage)] transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--bright)] placeholder:text-[var(--dim)] outline-none focus:border-[var(--sage)] transition-colors"
          />
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-[var(--sage2)] text-white text-[13px] font-medium hover:opacity-85 transition-opacity mt-1 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
};
