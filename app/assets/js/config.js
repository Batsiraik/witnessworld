/**
 * Witness World Connect — web app API config.
 * Same backend as the mobile app; auto-detects local XAMPP vs production vs EC2/IP.
 */
(function (global) {
  const host = window.location.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host);
  const isProd =
    host === 'witnessworldconnect.com' ||
    host === 'www.witnessworldconnect.com';

  // XAMPP uses /witnessworld subfolder; EC2/IP and production serve from web root.
  const API_ORIGIN = isProd
    ? 'https://witnessworldconnect.com'
    : isLocal
      ? `${window.location.origin}/witnessworld`
      : window.location.origin;

  global.WWC_CONFIG = {
    API_ORIGIN,
    API_BASE: `${API_ORIGIN}/api`,
    TOKEN_KEY: 'ww_token',
    APP_USER_AGENT: 'WitnessWorldConnect/1.0 (Web App)',
  };
})(window);
