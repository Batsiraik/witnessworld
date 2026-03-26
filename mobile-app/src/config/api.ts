import { Platform } from 'react-native';

/**
 * XAMPP on this machine — API scripts live at /witnessworld/api/*.php
 * Android emulator: use 10.0.2.2 instead of localhost.
 * iOS simulator: localhost works.
 * Physical device: set YOUR_PC_LAN_IP (e.g. 192.168.1.10).
 */
const USE_ANDROID_LOOPBACK = Platform.OS === 'android';

// Local dev — pick host that reaches your PC from the device/emulator:
const LOCAL_HOST = USE_ANDROID_LOOPBACK ? '10.0.2.2' : 'localhost';

export const API_ORIGIN = `http://${LOCAL_HOST}/witnessworld`;

/** When deployed, comment LOCAL above and use production: */
// export const API_ORIGIN = 'https://witnessworldconnect.com';

export const API_BASE = `${API_ORIGIN}/api`;
