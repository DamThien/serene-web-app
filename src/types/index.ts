export interface Sound {
  id: string;
  title: string,
  description: string,
  categoryname: string, // populated category name
  audioUrl: string,
  previewUrl: string,          // short 30s preview clip
  duration: number,            // in seconds (0 = loopable)
  isLoopable: boolean,
  image: string,               // cover art
  icon: string,                // icon for mixer UI
  tags: [string],              // ['rain', 'sleep', 'nature']
  playCount: number,
  isFree: boolean,
  isPremium: boolean,
  isActive: boolean,
  order: number,
}

export interface Track {
  soundId: any;
  volume: number;   // 0–1
  loop: boolean;
  muted: boolean;
  solo: boolean;
  // metadata (copied from Sound for convenience)
  title: string;
  cat: string;
  icon: string;
  url: string;
}

export interface Mix {
  _id: string;
  name: string;
  description?: string;
  tracks: Pick<Track, 'soundId' | 'volume'>[];
  isPublic: boolean;
  icon: string;
  user?: string;
  plays?: number;
  tags?: string[];
  createdAt?: string;
  isOwn?: boolean;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export type Page = 'studio' | 'feed';
export type Visibility = 'private' | 'public';
