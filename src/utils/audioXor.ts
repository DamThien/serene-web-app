export interface PlaybackDescriptor {
  url: string;
  token: string;
  expiresAt?: string | null;
  transport?: string;
  encryption?: {
    algorithm?: string;
    keySource?: string;
    output?: string;
  };
}

const DEFAULT_AUDIO_MIME = 'audio/mpeg';

function encodeKey(keyText: string) {
  return new TextEncoder().encode(keyText);
}

export function xorDecryptBytes(encryptedBytes: Uint8Array, keyText: string, offset = 0) {
  const keyBytes = encodeKey(keyText);
  const output = new Uint8Array(encryptedBytes.length);

  for (let index = 0; index < encryptedBytes.length; index += 1) {
    output[index] = encryptedBytes[index] ^ keyBytes[(offset + index) % keyBytes.length];
  }

  return output;
}

export async function fetchProtectedAudioBlob(
  playback: PlaybackDescriptor,
  init?: RequestInit,
) {
  const response = await fetch(playback.url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'x-playback-token': playback.token,
    },
  });

  if (!response.ok) {
    throw new Error(`Protected audio request failed: ${response.status}`);
  }

  const encryptedBuffer = await response.arrayBuffer();
  const decryptedBytes = xorDecryptBytes(new Uint8Array(encryptedBuffer), playback.token);
  const mimeType = response.headers.get('X-Audio-Content-Type') || DEFAULT_AUDIO_MIME;

  return new Blob([decryptedBytes], { type: mimeType });
}

export function isPlaybackExpired(playback?: PlaybackDescriptor | null) {
  if (!playback?.expiresAt) return false;
  const expiry = Date.parse(playback.expiresAt);
  return Number.isFinite(expiry) ? expiry <= Date.now() : false;
}

