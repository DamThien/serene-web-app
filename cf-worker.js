/**
 * cf-worker.js — Cloudflare Worker: audio CORS proxy
 *
 * Deploy this worker to bypass the missing CORS headers on the CDN.
 * After deploying, set in .env:
 *   VITE_AUDIO_BASE=https://serene-audio.YOUR-SUBDOMAIN.workers.dev
 *
 * Deploy steps:
 *   npx wrangler deploy cf-worker.js --name serene-audio
 *
 * The worker handles:
 *   GET /sound{N}.mp3  →  proxies CDN + injects CORS headers
 *   Range requests     →  passed through for audio seeking
 */

const CDN_BASE = 'https://kiara-api.shapeecloud.com/v1/sounds/mylodies_all_sound';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const filename = url.pathname.replace(/^\//, ''); // "sound11.mp3"

    if (!filename.match(/^sound\d+\.mp3$/)) {
      return new Response('Not found', { status: 404 });
    }

    const upstream = await fetch(`${CDN_BASE}/${filename}`, {
      headers: {
        Range: request.headers.get('Range') ?? 'bytes=0-',
      },
    });

    const response = new Response(upstream.body, upstream);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return response;
  },
};
