/**
 * Witness World Connect — web app API config.
 * Same backend as the mobile app; auto-detects local XAMPP vs production.
 */
(function (global) {
  const host = window.location.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host);

  const API_ORIGIN = isLocal
    ? `${window.location.origin}/witnessworld`
    : 'https://witnessworldconnect.com';

  global.WWC_CONFIG = {
    API_ORIGIN,
    API_BASE: `${API_ORIGIN}/api`,
    TOKEN_KEY: 'ww_token',
    APP_USER_AGENT: 'WitnessWorldConnect/1.0 (Web App)',
  };
})(window);
