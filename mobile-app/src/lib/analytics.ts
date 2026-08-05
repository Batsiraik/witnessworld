import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, getStoredToken } from '../api/client';

const DEVICE_KEY = 'ww_analytics_device_id';

export type AnalyticsSubjectType = 'listing' | 'store' | 'product' | 'directory_entry' | 'member';

export type AnalyticsModuleKey =
  | 'services'
  | 'classifieds'
  | 'community'
  | 'products'
  | 'stores'
  | 'directory'
  | 'discover'
  | 'home';

async function getAnalyticsDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id || id.length < 8) {
    id = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Fire-and-forget unique content view (server dedupes 1/viewer/day). */
export function trackContentView(
  subjectType: AnalyticsSubjectType,
  subjectId: number,
  source?: string
): void {
  if (!Number.isFinite(subjectId) || subjectId <= 0) return;
  void (async () => {
    try {
      const device_id = await getAnalyticsDeviceId();
      const withAuth = !!(await getStoredToken());
      await apiPost(
        'analytics-track.php',
        {
          event: 'content_view',
          subject_type: subjectType,
          subject_id: subjectId,
          device_id,
          ...(source ? { source } : {}),
        },
        withAuth
      );
    } catch {
      /* analytics must never block UX */
    }
  })();
}

/** Fire-and-forget unique module open (server dedupes 1/viewer/day). */
export function trackModuleView(module: AnalyticsModuleKey, source?: string): void {
  void (async () => {
    try {
      const device_id = await getAnalyticsDeviceId();
      const withAuth = !!(await getStoredToken());
      await apiPost(
        'analytics-track.php',
        {
          event: 'module_view',
          module,
          device_id,
          ...(source ? { source } : {}),
        },
        withAuth
      );
    } catch {
      /* ignore */
    }
  })();
}
