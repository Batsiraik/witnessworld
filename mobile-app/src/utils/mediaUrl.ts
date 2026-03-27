import { API_ORIGIN } from '../config/api';

/** Sent with remote media requests — some hosts block anonymous clients without a User-Agent. */
export const REMOTE_MEDIA_HEADERS: Record<string, string> = {
  Accept: '*/*',
  'User-Agent': 'WitnessWorldConnect/1.0 (Mobile)',
};

/**
 * Normalize API/stored URLs so images and video load in the app:
 * - Relative paths (/uploads/...) → absolute with current API host
 * - Stale localhost / LAN URLs → same path on production host
 * - file:// / content:// → unchanged (local picker URIs)
 */
export function resolvePublicMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (
    s.startsWith('file://') ||
    s.startsWith('content://') ||
    s.startsWith('blob:') ||
    s.startsWith('data:') ||
    s.startsWith('ph://')
  ) {
    return s;
  }
  if (s.startsWith('/')) {
    return `${API_ORIGIN}${s}`;
  }
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol)) {
      return s;
    }
    const appOrigin = new URL(API_ORIGIN);
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '10.0.2.2' ||
      /^192\.168\.\d+\.\d+$/i.test(host) ||
      /^10\.\d+\.\d+\.\d+$/i.test(host)
    ) {
      return `${appOrigin.origin}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* not a valid absolute URL */
  }
  return s;
}
