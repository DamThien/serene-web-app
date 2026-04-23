/**
 * audioAes.ts
 * AES-256-CTR decrypt for protected audio streams.
 * Replaces audioXor.ts — import this file everywhere audioXor was used.
 *
 * Key:  env variable AUDIO_AES_KEY (shared secret, same value as backend .env)
 *       In a web app, expose it as VITE_AUDIO_AES_KEY in .env
 *       In React Native / mobile, bundle it as a build-time constant.
 * IV:   decoded from playback.token JWT payload field "ivBase64"
 */

const DEFAULT_AUDIO_MIME = 'audio/mpeg';
const FETCH_TIMEOUT_MS   = 30_000;
const AES_ALGORITHM      = 'AES-CTR';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlaybackDescriptor {
  url:       string;
  token:     string;
  ivBase64:  string;   // 16-byte AES IV, base64-encoded — returned directly from API
  expiresAt?: string | null;
  transport?: string;
  encryption?: {
    algorithm?: string;
    keySource?:  string;
    ivSource?:   string;
    output?:     string;
  };
}

// ─── Key & IV helpers ─────────────────────────────────────────────────────────

/**
 * Load AES key from env.
 * Vite:         VITE_AUDIO_AES_KEY
 * React Native: expose via react-native-config or build constant
 */
function getAesKeyHex(): string {
  // Vite / webpack env
  const key =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_AUDIO_AES_KEY) ||
    (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process?.env?.AUDIO_AES_KEY) ||
    '';

  if (!key || key.length !== 64) {
    throw new Error(
      'VITE_AUDIO_AES_KEY must be a 64-character hex string (32 bytes). ' +
      'Set it in .env and ensure it matches the backend AUDIO_AES_KEY.'
    );
  }
  return key;
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('VITE_AUDIO_AES_KEY must contain only hexadecimal characters.');
    }
    bytes[i / 2] = byte;
  }
  return bytes.buffer;
}

function base64ToBytes(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (bytes.length !== 16) {
    throw new Error(`AES IV must be 16 bytes, got ${bytes.length}`);
  }
  return bytes.buffer;
}

// ─── AES-256-CTR decrypt (Web Crypto API) ────────────────────────────────────

/**
 * Decrypt a full buffer with AES-256-CTR.
 * Uses the Web Crypto API — available in all modern browsers and React Native (via JSI).
 *
 * @param encryptedBytes  Raw ciphertext bytes from /stream
 * @param ivBase64        16-byte IV, base64-encoded — read from playback.ivBase64
 */
export async function aesDecryptBytes(
  encryptedBytes: Uint8Array,
  ivBase64: string,
): Promise<Uint8Array> {
  const keyBytes = hexToBytes(getAesKeyHex());
  const iv       = base64ToBytes(ivBase64);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: AES_ALGORITHM },
    false,          // not extractable
    ['decrypt'],
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name:    AES_ALGORITHM,
      counter: iv,
      length:  64,  // bits of counter — 64 is the standard for AES-CTR
    },
    cryptoKey,
    encryptedBytes.buffer as ArrayBuffer,
  );

  return new Uint8Array(decryptedBuffer);
}

// ─── Fetch + decrypt ──────────────────────────────────────────────────────────

export async function fetchProtectedAudioBlob(
  playback: PlaybackDescriptor,
  init?: RequestInit,
): Promise<Blob> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);

  const callerSignal = (init as RequestInit & { signal?: AbortSignal })?.signal;
  const signal = callerSignal
    ? anySignal([callerSignal, timeoutController.signal])
    : timeoutController.signal;

  let response: Response;
  try {
    response = await fetch(playback.url, {
      ...init,
      signal,
      headers: {
        ...(init?.headers || {}),
        'x-playback-token': playback.token,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204 || response.status === 205) {
    throw new Error(`Protected audio returned no content (${response.status}) — retry later`);
  }
  if (!response.ok) {
    throw new Error(`Protected audio request failed: ${response.status}`);
  }

   const encryptedBuffer = await response.arrayBuffer();
   if (encryptedBuffer.byteLength === 0) {
     throw new Error('Protected audio response body is empty — retry later');
   }
   console.debug('[AudioAes] Encrypted buffer length:', encryptedBuffer.byteLength);

    const decryptedBytes = await aesDecryptBytes(new Uint8Array(encryptedBuffer), playback.ivBase64);
    console.debug('[AudioAes] Decrypted bytes length:', decryptedBytes.length);
    // Log first few bytes as hex to see if it looks like an MP3
    if (decryptedBytes.length >= 3) {
      const firstThree = Array.from(decryptedBytes.slice(0, 3))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.debug('[AudioAes] First three bytes:', firstThree);
    }
    const mimeType =
      normalizeAudioMime(response.headers.get('X-Audio-Content-Type'))
      || sniffAudioMimeType(decryptedBytes)
      || DEFAULT_AUDIO_MIME;
    console.debug('[AudioAes] MIME type:', mimeType);
    // Create a new ArrayBuffer and copy the data to avoid SharedArrayBuffer issues
    const arrayBuffer = new ArrayBuffer(decryptedBytes.length);
    const view = new Uint8Array(arrayBuffer);
    view.set(decryptedBytes);
    const blob = new Blob([view], { type: mimeType });
    console.debug('[AudioAes] Blob size:', blob.size);
    return blob;
}

// ─── Expiry helper ────────────────────────────────────────────────────────────

export function isPlaybackExpired(playback?: PlaybackDescriptor | null): boolean {
  if (!playback?.expiresAt) return false;
  const expiry = Date.parse(playback.expiresAt);
  return Number.isFinite(expiry) ? expiry <= Date.now() : false;
}

// ─── Signal compose polyfill ──────────────────────────────────────────────────

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(signal.reason); break; }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function normalizeAudioMime(value: string | null): string | null {
  if (!value) return null;
  const mime = value.split(';', 1)[0]?.trim().toLowerCase();
  return mime?.startsWith('audio/') ? mime : null;
}

function sniffAudioMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return 'audio/wav';
  }
  if (
    bytes.length >= 4
    && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53
  ) {
    return 'audio/ogg';
  }
  if (
    bytes.length >= 12
    && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    return 'audio/mp4';
  }
  if (
    bytes.length >= 4
    && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43
  ) {
    return 'audio/flac';
  }
  return null;
}
