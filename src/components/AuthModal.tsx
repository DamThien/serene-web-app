import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import { toast } from './Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ open, onClose }) => {
  const setUser = useMixerStore(s => s.setUser);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const mockLogin = (provider: string) => {
    setUser({ name: 'Alex', email: 'alex@serene.app', avatar: 'A' });
    // In production: store JWT from response
    // localStorage.setItem('serene_jwt', token);
    toast(`Signed in with ${provider} ✓`);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center
        bg-black/70 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative bg-[var(--ink2)] border border-[var(--line2)] rounded-2xl
        p-8 w-[340px] shadow-[0_24px_64px_rgba(0,0,0,.6)] anim-fade">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[var(--line)]
            text-[var(--mid)] flex items-center justify-center
            hover:bg-[var(--ink4)] hover:text-[var(--soft)] transition-all"
        >
          <X size={13} />
        </button>

        <h2 className="font-['Instrument_Serif'] italic text-[24px] text-[var(--bright)] mb-1">
          Welcome back
        </h2>
        <p className="text-[12px] text-[var(--mid)] leading-relaxed mb-6">
          Sign in to save mixes, follow creators, and access your library across devices.
        </p>

        {/* OAuth */}
        <button
          onClick={() => mockLogin('Google')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
            bg-[var(--ink3)] border border-[var(--line2)] text-[13px] font-medium
            text-[var(--bright)] hover:bg-[var(--ink4)] transition-all mb-2.5"
        >
          <span className="text-lg">🔵</span> Continue with Google
        </button>
        <button
          onClick={() => mockLogin('Apple')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
            bg-[var(--ink3)] border border-[var(--line2)] text-[13px] font-medium
            text-[var(--bright)] hover:bg-[var(--ink4)] transition-all mb-4"
        >
          <span className="text-lg">⚫</span> Continue with Apple
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-[11px] text-[var(--mid)]">or</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        {/* Email form */}
        <div className="flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-xl
              px-3.5 py-2.5 text-[13px] text-[var(--bright)] placeholder:text-[var(--dim)]
              outline-none focus:border-[var(--sage)] transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-[var(--ink4)] border border-[var(--line)] rounded-xl
              px-3.5 py-2.5 text-[13px] text-[var(--bright)] placeholder:text-[var(--dim)]
              outline-none focus:border-[var(--sage)] transition-colors"
          />
          <button
            onClick={() => mockLogin('email')}
            className="w-full py-2.5 rounded-xl bg-[var(--sage2)] text-white
              text-[13px] font-medium hover:opacity-85 transition-opacity mt-1"
          >
            Sign in with email
          </button>
        </div>
      </div>
    </div>
  );
};
