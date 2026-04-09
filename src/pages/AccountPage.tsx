import React, { useEffect, useState } from 'react';
import { Clock3, Crown, Heart, Layers3, Lock, Mail, MapPin, Sparkles, UserRound } from 'lucide-react';
import {
  fetchFavoriteSounds,
  fetchSubscription,
  fetchUserMixes,
  fetchUserProfile,
  isAuthenticated,
} from '../services/api';
import { useMixerStore } from '../store/mixerStore';
import type { Mix, Subscription, User } from '../types';
import { toast } from '../components/Toast';

export const AccountPage: React.FC = () => {
  const sessionUser = useMixerStore((state) => state.user);
  const setUser = useMixerStore((state) => state.setUser);
  const storeSubscription = useMixerStore((state) => state.subscription);
  const storeSavedMixes = useMixerStore((state) => state.savedMixes);
  const storeFavoriteSoundIds = useMixerStore((state) => state.favoriteSoundIds);
  const setSavedMixes = useMixerStore((state) => state.setSavedMixes);
  const setFavoriteSoundIds = useMixerStore((state) => state.setFavoriteSoundIds);
  const setSubscription = useMixerStore((state) => state.setSubscription);
  const [profile, setProfile] = useState<User | null>(sessionUser);
  const [savedMixes, setLocalSavedMixes] = useState<Mix[]>(storeSavedMixes);
  const [favoriteSoundIds, setLocalFavoriteSoundIds] = useState<string[]>(storeFavoriteSoundIds);
  const [subscription, setLocalSubscription] = useState<Subscription | null>(storeSubscription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setProfile(null);
      setLocalSavedMixes([]);
      setLocalFavoriteSoundIds([]);
      setLocalSubscription(null);
      return;
    }

    let cancelled = false;

    const loadAccount = async () => {
      setLoading(true);
      try {
        const [user, mixes, favorites, sub] = await Promise.all([
          fetchUserProfile(),
          fetchUserMixes().catch(() => []),
          fetchFavoriteSounds().catch(() => []),
          fetchSubscription().catch(() => null),
        ]);

        if (cancelled) return;

        setProfile(user);
        setUser(user);
        setLocalSavedMixes(mixes);
        setLocalFavoriteSoundIds(favorites);
        setLocalSubscription(sub);
        setSavedMixes(mixes);
        setFavoriteSoundIds(favorites);
        setSubscription(sub);
      } catch (error) {
        if (!cancelled) {
          toast(error instanceof Error ? error.message : 'Could not load account');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [setFavoriteSoundIds, setSavedMixes, setSubscription, setUser]);

  if (!isAuthenticated()) {
    return (
      <div className="flex-1 overflow-y-auto px-7 py-7">
        <div className="max-w-3xl mx-auto rounded-[28px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(24,24,31,.96),rgba(17,17,24,.98))] p-8">
          <h1 className="font-['Instrument_Serif'] italic text-[34px] text-[var(--bright)] mb-2">
            Account
          </h1>
          <p className="text-sm text-[var(--mid)] max-w-xl">
            Sign in to view your profile, subscription status, favorites, and saved mixes in one place.
          </p>
        </div>
      </div>
    );
  }

  const user = profile ?? sessionUser;
  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
    : 'Unknown';

  return (
    <div className="flex-1 overflow-y-auto px-7 py-7">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <section className="rounded-[32px] border border-[var(--line)] overflow-hidden bg-[linear-gradient(135deg,rgba(28,32,44,.96),rgba(12,13,20,.98))]">
          <div className="h-32 bg-[radial-gradient(circle_at_top_left,rgba(126,184,160,.32),transparent_45%),radial-gradient(circle_at_top_right,rgba(123,127,196,.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,0))]" />
          <div className="px-8 pb-8 -mt-11">
            <div className="w-22 h-22 rounded-[26px] border border-[rgba(255,255,255,.12)] bg-[var(--ink3)] flex items-center justify-center text-[28px] font-semibold text-[var(--bright)] shadow-[0_18px_48px_rgba(0,0,0,.45)]">
              {user?.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover rounded-[26px]" />
              ) : (
                user?.avatar ?? 'S'
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-start gap-4 justify-between">
              <div>
                <h1 className="font-['Instrument_Serif'] italic text-[36px] text-[var(--bright)] leading-none">
                  {loading ? 'Loading profile...' : user?.name ?? 'Serene User'}
                </h1>
                <p className="text-sm text-[var(--mid)] mt-2">
                  {user?.bio || 'A calm corner for your saved sounds, mixes, and membership details.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {user?.username && (
                    <span className="px-3 py-1.5 rounded-full border border-[var(--line)] text-xs text-[var(--soft)]">
                      @{user.username}
                    </span>
                  )}
                  {user?.type == "guest" && (
                    <span className="px-3 py-1.5 rounded-full border border-[var(--line)] text-xs text-[var(--soft)]">
                      {user.type}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 rounded-2xl border border-[rgba(201,169,110,.24)] bg-[rgba(201,169,110,.08)] min-w-[220px]">
                <div className="flex items-center gap-2 text-[var(--gold)] text-xs uppercase tracking-[0.18em] font-semibold mb-2">
                  <Crown size={14} />
                  Membership
                </div>
                <div className="text-lg text-[var(--bright)] capitalize">
                  {subscription?.plan?.replace(/_/g, ' ') || 'free'}
                </div>
                <div className="text-sm text-[var(--mid)] mt-1">
                  Status: {subscription?.status || 'active'}
                </div>
                {subscription?.expiresAt && (
                  <div className="text-xs text-[var(--mid)] mt-2">
                    Renews until {new Date(subscription.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Layers3 size={16} />}
            label="My Mixes"
            value={String(savedMixes.length)}
            note="Mixes saved to your account"
          />
          <MetricCard
            icon={<Heart size={16} />}
            label="Favorites"
            value={String(favoriteSoundIds.length)}
            note="Sounds saved to listen later"
          />
          <MetricCard
            icon={<Sparkles size={16} />}
            label="Plan Access"
            value={subscription?.isActive ? 'Premium' : 'Free'}
            note={subscription?.isActive ? 'Premium features unlocked' : 'Preview mode on premium sounds'}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[26px] border border-[var(--line)] bg-[var(--ink2)] p-6">
            <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-[var(--mid)] mb-4">
              Profile Details
            </h2>
            <div className="grid gap-3">
              <InfoRow icon={<UserRound size={15} />} label="Display name" value={user?.name || 'Not set'} />
              <InfoRow icon={<Mail size={15} />} label="Email" value={user?.email || 'Not set'} />
              <InfoRow icon={<MapPin size={15} />} label="Timezone" value={user?.timezone || 'Not set'} />
              <InfoRow icon={<Clock3 size={15} />} label="Member since" value={memberSince} />
            </div>
          </div>

          <div className="rounded-[26px] border border-[var(--line)] bg-[var(--ink2)] p-6">
            <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-[var(--mid)] mb-4">
              Account Note
            </h2>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink3)] p-4">
              <div className="flex items-center gap-2 text-[var(--soft)] mb-2">
                <Lock size={15} />
                <span className="text-sm font-medium">Read-only profile</span>
              </div>
              <p className="text-sm text-[var(--mid)] leading-relaxed">
                This page is currently for viewing account details only. Editing profile fields and deeper account settings can be added later without changing the main listening flow.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}> = ({ icon, label, value, note }) => (
  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--ink2)] p-5">
    <div className="w-10 h-10 rounded-2xl bg-[var(--ink3)] border border-[var(--line)] flex items-center justify-center text-[var(--sage)] mb-4">
      {icon}
    </div>
    <div className="text-xs uppercase tracking-[0.16em] text-[var(--mid)] font-semibold mb-2">
      {label}
    </div>
    <div className="text-[28px] leading-none text-[var(--bright)] font-medium">
      {value}
    </div>
    <div className="text-sm text-[var(--mid)] mt-2">
      {note}
    </div>
  </div>
);

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--ink3)] px-4 py-3">
    <div className="text-[var(--sage)]">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--mid)] font-semibold">
        {label}
      </div>
      <div className="text-sm text-[var(--bright)] truncate mt-1">
        {value}
      </div>
    </div>
  </div>
);
