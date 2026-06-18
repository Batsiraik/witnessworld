/**
 * Fetch wrapper — mirrors mobile-app/src/api/client.ts
 */
(function (global) {
  const { API_BASE, TOKEN_KEY, APP_USER_AGENT } = global.WWC_CONFIG;
  const FETCH_TIMEOUT_MS = 30_000;

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private browsing */
    }
  }

  function attachAuth(headers, token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }

  function isHtmlBody(body) {
    const s = body.trimStart().slice(0, 800).toLowerCase();
    return (
      s.startsWith('<!doctype') ||
      s.startsWith('<html') ||
      (s.startsWith('<') && (s.includes('<head') || s.includes('<meta ')))
    );
  }

  async function fetchWithTimeout(url, init) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } catch (e) {
      if (e && typeof e === 'object' && e.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  async function parseJson(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      if (isHtmlBody(text)) {
        throw new Error(
          'The server returned a web page instead of data. Check API deployment and host.'
        );
      }
      throw new Error('Could not read server response. Please try again.');
    }
  }

  async function apiGet(path, authOptional, retried) {
    const headers = {
      Accept: 'application/json',
      'User-Agent': APP_USER_AGENT,
    };
    const token = getToken();
    if (token) attachAuth(headers, token);
    else if (!authOptional) throw new Error('Please sign in to continue.');

    const res = await fetchWithTimeout(`${API_BASE}/${path}`, { headers });
    const data = await parseJson(res);
    if (!res.ok) {
      if (authOptional && !retried && res.status === 401 && token) {
        setToken(null);
        return apiGet(path, authOptional, true);
      }
      const msg =
        typeof data.error === 'string'
          ? data.error
          : res.status === 401
            ? 'Session expired. Please sign in again.'
            : 'Request failed.';
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function apiPost(path, body, authOptional, retried) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': APP_USER_AGENT,
    };
    const token = getToken();
    if (token) attachAuth(headers, token);
    else if (!authOptional) throw new Error('Please sign in to continue.');

    const res = await fetchWithTimeout(`${API_BASE}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      if (authOptional && !retried && res.status === 401 && token) {
        setToken(null);
        return apiPost(path, body, authOptional, true);
      }
      const msg = typeof data.error === 'string' ? data.error : 'Request failed.';
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /** Resolve relative / localhost media URLs to the current API host. */
  function resolveMediaUrl(url) {
    if (url == null) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (s.startsWith('/')) return `${global.WWC_CONFIG.API_ORIGIN}${s}`;
    try {
      const u = new URL(s);
      const appOrigin = new URL(global.WWC_CONFIG.API_ORIGIN);
      const h = u.hostname.toLowerCase();
      if (
        h === 'localhost' ||
        h === '127.0.0.1' ||
        /^192\.168\.\d+\.\d+$/.test(h) ||
        /^10\.\d+\.\d+\.\d+$/.test(h)
      ) {
        return `${appOrigin.origin}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      /* relative or invalid */
    }
    return s;
  }

  global.WWC_API = {
    getToken,
    setToken,
    apiGet,
    apiPost,
    resolveMediaUrl,
  };
})(window);
