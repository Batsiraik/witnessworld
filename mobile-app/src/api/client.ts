import AsyncStorage from '@react-native-async-storage/async-storage';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE } from '../config/api';

/** Persists across app updates (AsyncStorage). Cleared only on logout, token rotation, or OS/data wipe. Server honours ~365d expiry (WW_TOKEN_DAYS). */
const TOKEN_KEY = 'ww_token';

/** Avoid hung splash: RN fetch has no built-in timeout. */
const API_FETCH_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

const XHR_UPLOAD_TIMEOUT_MS = 120_000;

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

type Json = Record<string, unknown>;

export type UploadProgressHandler = (percent: number) => void;

/** True when the body looks like HTML (404 pages, PHP fatals, etc.) rather than JSON. */
function isProbablyHtmlResponse(body: string): boolean {
  const s = body.trimStart().slice(0, 800).toLowerCase();
  return (
    s.startsWith('<!doctype') ||
    s.startsWith('<html') ||
    (s.startsWith('<') && (s.includes('<head') || s.includes('<meta ')))
  );
}

function errorFromInvalidJsonBody(body: string, httpStatus: number): Error {
  const html = isProbablyHtmlResponse(body);
  const msg = html
    ? 'The server returned a web page instead of data. Check that API endpoints are deployed and the app points to the correct host.'
    : 'The server sent a response this app could not read. Please try again.';
  return new Error(__DEV__ ? `${msg} (HTTP ${httpStatus})` : msg);
}

const APP_USER_AGENT = 'WitnessWorldConnect/1.0 (Mobile App)';

/** Apache/XAMPP often strips Authorization; X-Auth-Token is read by the PHP API as a fallback. */
function attachAuthHeaders(headers: Record<string, string>, token: string): void {
  headers.Authorization = `Bearer ${token}`;
  headers['X-Auth-Token'] = token;
}

/** Multipart POST with upload progress (fetch has no upload progress in RN). */
function multipartPostWithProgress(
  relativePath: string,
  form: FormData,
  token: string,
  onProgress?: UploadProgressHandler
): Promise<Json> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/${relativePath}`);
    xhr.timeout = XHR_UPLOAD_TIMEOUT_MS;
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('User-Agent', APP_USER_AGENT);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Auth-Token', token);
    xhr.upload.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable && ev.total > 0) {
        onProgress(Math.min(100, Math.round((100 * ev.loaded) / ev.total)));
      }
    };
    xhr.onload = () => {
      const text = xhr.responseText || '';
      let data: Json;
      try {
        data = JSON.parse(text) as Json;
      } catch {
        reject(errorFromInvalidJsonBody(text, xhr.status));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error((data.error as string) || `Request failed (${xhr.status})`));
        return;
      }
      resolve(data);
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form as unknown as Parameters<XMLHttpRequest['send']>[0]);
  });
}

async function parseJson(res: Response): Promise<Json> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as Json;
    return data;
  } catch {
    throw errorFromInvalidJsonBody(text, res.status);
  }
}

export async function apiPost(path: string, body: Json, withAuth = false): Promise<Json> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': APP_USER_AGENT,
  };
  if (withAuth) {
    const t = await getStoredToken();
    if (t) attachAuthHeaders(headers, t);
  }
  const res = await fetchWithTimeout(`${API_BASE}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const err = (data.error as string) || `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export async function apiGet(path: string, withAuth = true): Promise<Json> {
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': APP_USER_AGENT };
  if (withAuth) {
    const t = await getStoredToken();
    if (t) attachAuthHeaders(headers, t);
  }
  const res = await fetchWithTimeout(`${API_BASE}/${path}`, { method: 'GET', headers, cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    const err = (data.error as string) || `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export type RegistrationPollPayload = {
  account_type: 'individual' | 'business';
  primary_purpose: 'browsing_connecting' | 'promoting_business' | 'both';
  referral_source: 'friend_family' | 'social_media' | 'whatsapp_group' | 'wwc_team_member' | 'other';
  referral_other?: string;
};

export type RegistrationPollResult = {
  registration_account_type: string;
  registration_primary_purpose: string;
  registration_referral_source: string;
  registration_referral_other: string;
};

export async function submitRegistrationPoll(
  payload: RegistrationPollPayload
): Promise<RegistrationPollResult> {
  const data = await apiPost('registration-account-type.php', payload, true);
  const account = data.registration_account_type as string | undefined;
  const purpose = data.registration_primary_purpose as string | undefined;
  const referral = data.registration_referral_source as string | undefined;
  if (!account || !purpose || !referral) {
    throw new Error('Could not save your answers');
  }
  return {
    registration_account_type: account,
    registration_primary_purpose: purpose,
    registration_referral_source: referral,
    registration_referral_other: (data.registration_referral_other as string) || '',
  };
}

export async function apiLogout(): Promise<void> {
  try {
    await apiPost('logout.php', {}, true);
  } catch {
    /* ignore */
  }
  await setStoredToken(null);
}

/** Multipart avatar upload (React Native FormData). */
export async function apiUploadAvatar(
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgressHandler
): Promise<{ avatar_url: string }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const form = new FormData();
  form.append('avatar', {
    uri: localUri,
    name: 'avatar.jpg',
    type: mimeType || 'image/jpeg',
  } as unknown as Blob);
  const data = await multipartPostWithProgress('profile-avatar.php', form, token, onProgress);
  const url = data.avatar_url as string | undefined;
  if (!url) {
    throw new Error('No avatar URL returned');
  }
  return { avatar_url: url };
}

/** Multipart listing media (image or short video) for provider ads. */
export async function apiUploadListingMedia(
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgressHandler
): Promise<{ url: string; kind: string }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const isVid = (mimeType || '').toLowerCase().startsWith('video/');
  const ext = isVid ? 'mp4' : 'jpg';
  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: isVid ? `clip.${ext}` : `photo.${ext}`,
    type: mimeType || (isVid ? 'video/mp4' : 'image/jpeg'),
  } as unknown as Blob);
  const data = await multipartPostWithProgress('listing-media-upload.php', form, token, onProgress);
  const url = data.url as string | undefined;
  const kind = (data.kind as string) || 'image';
  if (!url) {
    throw new Error('No file URL returned');
  }
  return { url, kind };
}

/** Store logo or banner (multipart). */
export async function apiUploadStoreMedia(
  localUri: string,
  mimeType: string,
  asset: 'logo' | 'banner',
  onProgress?: UploadProgressHandler
): Promise<{ url: string }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const form = new FormData();
  form.append('asset', asset);
  form.append('file', {
    uri: localUri,
    name: asset === 'logo' ? 'logo.jpg' : 'banner.jpg',
    type: mimeType || 'image/jpeg',
  } as unknown as Blob);
  const data = await multipartPostWithProgress('store-media-upload.php', form, token, onProgress);
  const url = data.url as string | undefined;
  if (!url) {
    throw new Error('No file URL returned');
  }
  return { url };
}

/** Product image for an approved store (multipart). */
export async function apiUploadProductMedia(
  localUri: string,
  mimeType: string,
  storeId: number,
  onProgress?: UploadProgressHandler
): Promise<{ url: string }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const form = new FormData();
  form.append('store_id', String(storeId));
  form.append('file', {
    uri: localUri,
    name: 'product.jpg',
    type: mimeType || 'image/jpeg',
  } as unknown as Blob);
  const data = await multipartPostWithProgress('product-media-upload.php', form, token, onProgress);
  const url = data.url as string | undefined;
  if (!url) {
    throw new Error('No file URL returned');
  }
  return { url };
}

/** Directory business logo (multipart). */
export async function apiUploadDirectoryLogo(
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgressHandler
): Promise<{ url: string }> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: 'logo.jpg',
    type: mimeType || 'image/jpeg',
  } as unknown as Blob);
  const data = await multipartPostWithProgress('directory-media-upload.php', form, token, onProgress);
  const url = data.url as string | undefined;
  if (!url) {
    throw new Error('No file URL returned');
  }
  return { url };
}

export async function apiOpenConversation(body: {
  peer_user_id: number;
  context_type?: string;
  context_id?: number;
}): Promise<{ conversation_id: number }> {
  const data = await apiPost('conversation-open.php', body as Json, true);
  const cid = data.conversation_id as number | undefined;
  if (!cid) {
    throw new Error('Could not open conversation');
  }
  return { conversation_id: cid };
}

export async function apiSubmitReport(body: {
  subject_type: string;
  subject_id: number;
  reason: string;
}): Promise<void> {
  await apiPost('content-report.php', body as Json, true);
}

export async function apiSendMessage(conversationId: number, text: string): Promise<void> {
  await apiPost('message-send.php', { conversation_id: conversationId, body: text } as Json, true);
}

export async function apiMarkConversationRead(conversationId: number): Promise<void> {
  await apiPost('conversation-mark-read.php', { conversation_id: conversationId } as Json, true);
}

export async function apiConversationAction(
  conversationId: number,
  action: 'archive' | 'delete'
): Promise<void> {
  await apiPost('conversation-action.php', { conversation_id: conversationId, action } as Json, true);
}

export type FavoriteSubjectType = 'listing' | 'store' | 'product' | 'directory_entry';

export type FavoriteRow = {
  subject_type: FavoriteSubjectType;
  subject_id: number;
  title: string;
  subtitle: string | null;
  meta: string | null;
  price: string | null;
  image_url: string | null;
  created_at: string;
};

export async function apiFavoriteStatus(subjectType: FavoriteSubjectType, subjectId: number): Promise<boolean> {
  const qs = new URLSearchParams({ subject_type: subjectType, subject_id: String(subjectId) });
  const data = await apiGet(`favorite-status.php?${qs.toString()}`, true);
  return data.favorited === true;
}

export async function apiToggleFavorite(
  subjectType: FavoriteSubjectType,
  subjectId: number,
  favorite?: boolean
): Promise<boolean> {
  const body: Json = { subject_type: subjectType, subject_id: subjectId };
  if (typeof favorite === 'boolean') body.favorite = favorite;
  const data = await apiPost('favorite-toggle.php', body, true);
  return data.favorited === true;
}

export async function apiFavoritesList(): Promise<FavoriteRow[]> {
  const data = await apiGet('favorites-list.php', true);
  return Array.isArray(data.favorites) ? (data.favorites as FavoriteRow[]) : [];
}

/** Send a text message with one attachment (image, PDF, Word, etc.). */
export async function apiSendMessageWithFile(
  conversationId: number,
  body: string,
  file: { uri: string; name: string; mime: string },
  onProgress?: UploadProgressHandler
): Promise<void> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const form = new FormData();
  form.append('conversation_id', String(conversationId));
  form.append('body', body);
  form.append('file', {
    uri: file.uri,
    name: file.name || 'attachment',
    type: file.mime || 'application/octet-stream',
  } as unknown as Blob);
  await multipartPostWithProgress('message-send.php', form, token, onProgress);
}

export function messageAttachmentUrl(attachmentId: number): string {
  return `${API_BASE}/message-attachment.php?id=${attachmentId}`;
}

/** Downloads the file with auth, then opens the system share / save sheet. */
export async function downloadMessageAttachment(
  attachmentId: number,
  fileName: string,
  mimeType: string
): Promise<void> {
  const token = await getStoredToken();
  if (!token) {
    throw new Error('Not signed in');
  }
  const safe = fileName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120) || 'download';
  const dest = new ExpoFile(Paths.cache, `ww_attach_${attachmentId}_${safe}`);
  await ExpoFile.downloadFileAsync(messageAttachmentUrl(attachmentId), dest, {
    headers: { Authorization: `Bearer ${token}`, 'X-Auth-Token': token },
    idempotent: true,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, {
      mimeType: mimeType || 'application/octet-stream',
      dialogTitle: fileName,
    });
  }
}
