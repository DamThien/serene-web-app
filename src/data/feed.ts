import type { Mix } from '../types';

export const DEMO_MIXES: Mix[] = [
  {
    id: 'f1', name: 'Rainy Forest Night', user: 'luna.wav', icon: '🌧️',
    tracks: [{ soundId:'s4', volume:.6 }, { soundId:'s53', volume:.5 }, { soundId:'s8', volume:.3 }],
    isPublic: true, plays: 2841, tags: ['sleep','rain','nature'],
  },
  {
    id: 'f2', name: 'Deep Ocean Focus', user: 'theo.ambient', icon: '🌊',
    tracks: [{ soundId:'s2', volume:.5 }, { soundId:'s63', volume:.4 }, { soundId:'s18', volume:.3 }],
    isPublic: true, plays: 1720, tags: ['focus','water'],
  },
  {
    id: 'f3', name: 'Bali Morning', user: 'sol.dreams', icon: '🌅',
    tracks: [{ soundId:'s82', volume:.6 }, { soundId:'s8', volume:.4 }, { soundId:'s22', volume:.3 }],
    isPublic: true, plays: 1204, tags: ['morning','meditation'],
  },
  {
    id: 'f4', name: 'Thunderscape', user: 'kairo.sleep', icon: '⛈️',
    tracks: [{ soundId:'s12', volume:.7 }, { soundId:'s4', volume:.5 }, { soundId:'s53', volume:.3 }],
    isPublic: true, plays: 3219, tags: ['sleep','rain'],
  },
  {
    id: 'f5', name: 'Whale Dreamscape', user: 'mira.ocean', icon: '🐋',
    tracks: [{ soundId:'s71', volume:.6 }, { soundId:'s63', volume:.5 }, { soundId:'s104', volume:.4 }],
    isPublic: true, plays: 876, tags: ['sleep','meditation','ocean'],
  },
  {
    id: 'f6', name: 'Keyboard & Rain', user: 'dev.mode', icon: '⌨️',
    tracks: [{ soundId:'s91', volume:.5 }, { soundId:'s4', volume:.4 }, { soundId:'s18', volume:.35 }],
    isPublic: true, plays: 2107, tags: ['focus','work'],
  },
  {
    id: 'f7', name: 'Temple Garden', user: 'zen.mist', icon: '🧘',
    tracks: [{ soundId:'s92', volume:.6 }, { soundId:'s95', volume:.5 }, { soundId:'s1', volume:.3 }],
    isPublic: true, plays: 1055, tags: ['meditation','focus'],
  },
  {
    id: 'f8', name: 'Cabin at Night', user: 'forest.folk', icon: '🌲',
    tracks: [{ soundId:'s53', volume:.5 }, { soundId:'s79', volume:.4 }, { soundId:'s76', volume:.3 }],
    isPublic: true, plays: 654, tags: ['sleep','nature'],
  },
];

export const FEED_FILTERS = ['All','Popular','Sleep','Focus','Nature','Meditation','Rain'];
