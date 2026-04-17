import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useMixerStore } from '../store/mixerStore';
import {
  fetchFavoriteSounds,
  fetchMe,
  fetchSubscription,
  fetchUserMixes,
  login,
  loginWithApple,
  loginWithGoogle,
  register,
} from '../services/api';
import { toast } from './Toast';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          nonce?: string;
          usePopup?: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string };
          user?: {
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SCRIPT_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

  if (existing) {
    if (existing.dataset.loaded === 'true') {
      resolve();
      return;
    }

    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  script.addEventListener('load', () => {
    script.dataset.loaded = 'true';
    resolve();
  }, { once: true });
  script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
  document.head.appendChild(script);
});

interface Props {
  open: boolean;
  mode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ open, mode = 'login', onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const setUser = useMixerStore((state) => state.setUser);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const setFavoriteSoundIds = useMixerStore((state) => state.setFavoriteSoundIds);
  const setSubscription = useMixerStore((state) => state.setSubscription);

  const [tab, setTab] = useState<'login' | 'register'>(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  const appleRedirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;
  const appleScope = (import.meta.env.VITE_APPLE_SCOPE as string | undefined) || 'name email';

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

  const hydrateAccount = useCallback(async () => {
    const [mixes, favorites, subscription] = await Promise.all([
      fetchUserMixes().catch(() => []),
      fetchFavoriteSounds().catch(() => []),
      fetchSubscription().catch(() => null),
    ]);

    setSavedMixes(mixes);
    setFavoriteSoundIds(favorites);
    setSubscription(subscription);
  }, [setFavoriteSoundIds, setSavedMixes, setSubscription]);

  const completeLogin = useCallback(async (
    userPromise: Promise<Awaited<ReturnType<typeof login>>>,
    successMessage: string,
  ) => {
    setSubmitting(true);

    try {
      const sessionUser = await userPromise;
      const user = await fetchMe().catch(() => sessionUser);
      setUser(user);
      await hydrateAccount();
      toast(successMessage);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }, [hydrateAccount, onClose, setUser]);

  useEffect(() => {
    if (!open || !googleClientId) {
      return;
    }

    let cancelled = false;
    const buttonElement = googleButtonRef.current;

    const setupGoogle = async () => {
      try {
        await loadScript(GOOGLE_SCRIPT_SRC);
        if (cancelled || !window.google || !googleButtonRef.current) return;

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (!credential) {
              toast('Google sign-in did not return a credential');
              return;
            }

            void completeLogin(
              loginWithGoogle({ token: credential }),
              'Signed in with Google',
            );
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          text: 'continue_with',
          shape: 'pill',
          width: 296,
          size: 'large',
          logo_alignment: 'left',
        });

        setGoogleReady(true);
      } catch (error) {
        setGoogleReady(false);
        toast(error instanceof Error ? error.message : 'Could not load Google sign-in');
      }
    };

    void setupGoogle();

    return () => {
      cancelled = true;
      if (buttonElement) {
        buttonElement.innerHTML = '';
      }
    };
  }, [completeLogin, googleClientId, open]);

  useEffect(() => {
    if (!open || !appleClientId || !appleRedirectUri) {
      return;
    }

    let cancelled = false;

    const setupApple = async () => {
      try {
        await loadScript(APPLE_SCRIPT_SRC);
        if (cancelled || !window.AppleID) return;

        window.AppleID.auth.init({
          clientId: appleClientId,
          scope: appleScope,
          redirectURI: appleRedirectUri,
          state: 'serene-web-auth',
          usePopup: true,
        });

        setAppleReady(true);
      } catch (error) {
        setAppleReady(false);
        toast(error instanceof Error ? error.message : 'Could not load Apple sign-in');
      }
    };

    void setupApple();

    return () => {
      cancelled = true;
    };
  }, [appleClientId, appleRedirectUri, appleScope, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (tab === 'register' && !name.trim())) {
      toast('Please complete the required fields');
      return;
    }

    await completeLogin(
      tab === 'login'
        ? login({ email, password })
        : register({ name, email, password }),
      tab === 'login' ? 'Signed in successfully' : 'Account created successfully',
    );
  };

  const handleAppleLogin = async () => {
    if (!appleClientId || !appleRedirectUri) {
      toast('Missing Apple web sign-in configuration');
      return;
    }

    if (!window.AppleID?.auth || !appleReady) {
      toast('Apple sign-in is not ready yet');
      return;
    }

    try {
      const result = await window.AppleID.auth.signIn();
      const identityToken = result.authorization?.id_token;

      if (!identityToken) {
        toast('Apple sign-in did not return an identity token');
        return;
      }

      const firstName = result.user?.name?.firstName;
      const lastName = result.user?.name?.lastName;
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

      await completeLogin(
        loginWithApple({
          identityToken,
          name: fullName || undefined,
          firstName,
          lastName,
        }),
        'Signed in with Apple',
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Apple sign-in failed');
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

        <div className="flex flex-col gap-2.5 mb-4">
          {googleClientId ? (
            <div className="flex flex-col gap-2">
              <div
                ref={googleButtonRef}
                className="overflow-hidden"
              />
              {!googleReady && (
                <div className="text-center text-sm text-[var(--mid)]">
                  Loading Google sign-in...
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-xl border border-[var(--line)] text-[13px] text-[var(--dim)]"
            >
              Set `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleAppleLogin()}
            disabled={submitting || !appleClientId || !appleRedirectUri || !appleReady}
            className={`w-full py-3 rounded-xl ${appleClientId && appleRedirectUri ? '' : 'bg-white'} text-black text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            {appleClientId && appleRedirectUri
              ? appleReady ? 'Continue with Apple' : 'Loading Apple sign-in...'
              : 'Set Apple env config to enable Apple sign-in'}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-[11px] text-[var(--mid)]">or</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

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
