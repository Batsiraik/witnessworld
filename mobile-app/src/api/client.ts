import AsyncStorage from '@react-native-async-storage/async-storage';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE } from '../config/api';

const TOKEN_KEY = 'ww_token';

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
    xhr.setRequestHeader('Accept', 'application/json');
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
        reject(new Error(text.slice(0, 160) || 'Invalid server response'));
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
    throw new Error(text.slice(0, 200) || 'Invalid server response');
  }
}

export async function apiPost(path: string, body: Json, withAuth = false): Promise<Json> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (withAuth) {
    const t = await getStoredToken();
    if (t) attachAuthHeaders(headers, t);
  }
  const res = await fetch(`${API_BASE}/${path}`, {
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
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (withAuth) {
    const t = await getStoredToken();
    if (t) attachAuthHeaders(headers, t);
  }
  const res = await fetch(`${API_BASE}/${path}`, { method: 'GET', headers, cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    const err = (data.error as string) || `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
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
