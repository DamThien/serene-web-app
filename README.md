# 🎧 Serene — Ambient Soundscape Studio

Serene is a browser-based ambient sound mixer. Layer up to 6 sounds, shape each track's volume, then save and share your mix with the community. Works on desktop and mobile.

---

## Features

- **Sound mixer** — Add up to 6 ambient tracks; adjust volume, mute, or solo each one individually
- **Sleep timer** — Auto-stop playback after 15 / 30 / 45 / 60 / 90 minutes
- **Community feed** — Browse and play mixes created by other users
- **Save & share** — Save your mix privately or publish it to the community
- **Media Session integration** — Control playback from headphones, keyboard media keys, lock screen, or Bluetooth devices (same as YouTube / Spotify)
- **Responsive UI** — Full desktop studio layout; mobile-friendly with a slide-out sound library drawer

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Audio | Howler.js (Web Audio API, auto-fallback to HTML5) |
| State | Zustand |
| OS media controls | [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) |
| Backend proxy | Cloudflare Worker (`cf-worker.js`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A backend API (or use the included Cloudflare Worker)

### Install & run

```bash
# Clone the repo
git clone <your-repo-url>
cd serene-web-app

# Install dependencies
npm install

# Copy env and fill in your values
cp .env.example .env

# Start dev server
npm run dev
```

### Environment variables

```env
# Base URL for the backend API
VITE_API_BASE=https://your-api.example.com

# Base URL for audio files (must support CORS)
VITE_AUDIO_BASE=https://your-cdn.example.com
```

See `.env.example` for all available variables.

---

## Project Structure

```
src/
├── components/
│   ├── AudioEngineProvider.tsx   # React context wrapping useAudioEngine
│   ├── AuthModal.tsx             # Sign in / sign up modal
│   ├── MixerPlayer.tsx           # Bottom player bar (transport controls)
│   ├── Sidebar.tsx               # Sound library panel (desktop + mobile drawer)
│   ├── SoundCard.tsx             # Single sound item in the library
│   ├── Toast.tsx                 # Notification toasts
│   ├── Topbar.tsx                # App header + navigation
│   ├── TrackControl.tsx          # Per-track mixer strip
│   └── WaveformViz.tsx           # Animated waveform indicator
├── hooks/
│   └── useAudioEngine.ts         # Howler.js engine + Media Session API
├── pages/
│   ├── StudioPage.tsx            # Mixer / studio view
│   └── FeedPage.tsx              # Community mixes feed
├── store/
│   └── mixerStore.ts             # Zustand global state
├── services/
│   └── api.ts                    # API client (sounds, mixes, auth)
├── data/
│   ├── feed.ts                   # Feed filter labels + demo data
│   └── sounds.ts                 # Fallback category list
└── types/
    └── index.ts                  # Shared TypeScript types
```

---

## Media Session API — Headphone & Keyboard Control

Serene registers with the browser's [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API), which is the same mechanism used by YouTube and Spotify. This means:

- **Wired/wireless headphone buttons** — play/pause, stop
- **Keyboard media keys** — dedicated play/pause key, F-row media controls
- **macOS Touch Bar / Control Center** — now-playing card with play/pause
- **Android lock screen & notification shade** — shows mix name, play/pause/stop
- **iOS PWA lock screen** — available when Serene is installed as a PWA
- **Bluetooth speakers and earphones** — play/pause button on the device

### How it works

`useAudioEngine` registers action handlers once on mount via `useEffect`. Every time playback starts or the active mix changes, the caller invokes `engine.syncMediaSession(meta, callbacks)` to:

1. Update the OS "now playing" card (`MediaMetadata` — title, artist)
2. Bind fresh `onPlay` / `onPause` / `onStop` callbacks to the hardware buttons

When playback pauses or stops, `engine.setMediaSessionState('paused' | 'none')` keeps the OS indicator in sync.

---

## Deployment

### Vite build

```bash
npm run build
# Output in dist/
```

### Cloudflare Worker (audio proxy)

The included `cf-worker.js` proxies audio requests and sets the required CORS headers. Deploy it with:

```bash
npx wrangler deploy cf-worker.js
```

Then set `VITE_AUDIO_BASE` to your Worker URL.

---

## Browser Support

| Browser | Audio | Media Session |
|---|---|---|
| Chrome / Edge 90+ | ✅ | ✅ |
| Firefox 82+ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ (partial) |
| Mobile Chrome (Android) | ✅ | ✅ |
| Mobile Safari (iOS) | ✅* | ✅ (PWA only) |

*iOS requires a user gesture to unlock the AudioContext. Howler handles this automatically.

---

## License

MIT
