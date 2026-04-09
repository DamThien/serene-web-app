export interface Sound {
  id: string;
  title: string;
  description: string;
  categoryname: string;
  audioUrl: string;
  previewUrl: string;
  duration: number;
  isLoopable: boolean;
  image: string;
  icon: string;
  tags: string[];
  playCount: number;
  isFree: boolean;
  isPremium: boolean;
  isActive: boolean;
  order: number;
  isFavorited?: boolean;
}

export interface Track {
  soundId: string;
  volume: number;
  loop: boolean;
  muted: boolean;
  solo: boolean;
  title: string;
  cat: string;
  icon: string;
  url: string;
  isPremium?: boolean;
  previewUrl?: string;
}

export interface SilentFrequency {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  thumbnail: string;
  provider: string;
  category: string;
  isPremium: boolean;
  audioUrl?: string;
  benefits: string[];
  tags: string[];
}

export interface FrequencyLayer {
  id: string;
  hz: number;
  title: string;
  subtitle: string;
  benefit: string;
  order: number;
}

export interface Mix {
  _id: string;
  name: string;
  description?: string;
  tracks: Pick<Track, 'soundId' | 'volume'>[];
  sourceMixId?: string;
  isPublic: boolean;
  isPublicUserMix?: boolean;
  icon: string;
  user?: string;
  username?: string;
  plays?: number;
  tags?: string[];
  createdAt?: string;
  isOwn?: boolean;
  silentFrequencies?: SilentFrequency[];
  frequencyLayer?: FrequencyLayer | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  username?: string;
  image?: string;
  bio?: string;
  timezone?: string;
  type?: string;
  source?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price?: number;
  currency?: string;
  interval?: string;
  features: string[];
  isPopular?: boolean;
}

export interface Subscription {
  plan: string;
  status: string;
  isActive: boolean;
  expiresAt?: string | null;
  willCancelAtPeriodEnd?: boolean;
}

export type Page = 'studio' | 'feed' | 'account';
export type Visibility = 'private' | 'public';
