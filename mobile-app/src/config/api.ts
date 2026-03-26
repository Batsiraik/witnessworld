import { Platform } from 'react-native';

/**
 * API origin for the mobile app.
 * - Production: https://witnessworldconnect.com → https://witnessworldconnect.com/api/...
 * - Local XAMPP: set USE_PRODUCTION_API to false (Android emulator uses 10.0.2.2).
 */
const USE_PRODUCTION_API = true;

const USE_ANDROID_LOOPBACK = Platform.OS === 'android';
const LOCAL_HOST = USE_ANDROID_LOOPBACK ? '10.0.2.2' : 'localhost';

export const API_ORIGIN = USE_PRODUCTION_API
  ? 'https://witnessworldconnect.com'
  : `http://${LOCAL_HOST}/witnessworld`;

export const API_BASE = `${API_ORIGIN}/api`;
