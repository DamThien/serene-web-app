export interface MixCoverSource {
  _id?: string;
  name?: string;
  description?: string;
  icon?: string;
  tags?: string[];
}

const mixCoverImages = [
  {
    keywords: ['rain', 'storm', 'thunder', 'window', 'urban rain'],
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['ocean', 'wave', 'sea', 'whale', 'underwater', 'river', 'water'],
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['forest', 'bird', 'spring', 'morning', 'nature', 'wind'],
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['sleep', 'night', 'dream', 'moon', 'lullaby', 'slow'],
    url: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['focus', 'study', 'work', 'deep', 'calm', 'zen', 'meditate'],
    url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['fire', 'campfire', 'warm', 'cabin'],
    url: 'https://images.unsplash.com/photo-1475738972911-5b44ce984c42?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['city', 'train', 'coffee', 'lounge'],
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80',
  },
  {
    keywords: ['music', 'piano', 'guitar', 'flute', 'choir', 'chimes'],
    url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
  },
];

const fallbackCoverImages = [
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
];

export const getFallbackMixCoverUrl = (mix: MixCoverSource) => {
  const key = mix._id || mix.name || 'mix';
  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return fallbackCoverImages[hash % fallbackCoverImages.length];
};

export const getMixCoverUrl = (mix: MixCoverSource) => {
  const searchable = [
    mix.name,
    mix.description,
    mix.icon,
    ...(mix.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return mixCoverImages.find((image) => image.keywords.some((keyword) => searchable.includes(keyword)))?.url
    ?? getFallbackMixCoverUrl(mix);
};
