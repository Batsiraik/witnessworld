import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { apiPost } from '../api/client';

function parseAdminPushLogId(data: Record<string, unknown> | undefined): number {
  const raw = data?.admin_push_log_id;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function reportAdminPushOpen(data: Record<string, unknown> | undefined): void {
  const id = parseAdminPushLogId(data);
  if (id <= 0) {
    return;
  }
  void apiPost(
    'push-open.php',
    { admin_push_log_id: id } as Record<string, unknown>,
    true
  ).catch(() => {
    /* non-fatal */
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers for Expo push (uses FCM on Android when Firebase + EAS credentials are set).
 * Call only when the user is signed in and verified.
 */
export function usePushRegistration(active: boolean, userStatus: string | undefined): void {
  const done = useRef(false);
  const coldStartOpenDone = useRef(false);

  /** Tracks taps on admin pushes (broadcast or targeted) for dashboard stats. */
  useEffect(() => {
    if (!active || userStatus !== 'verified') {
      coldStartOpenDone.current = false;
      return;
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      reportAdminPushOpen(data);
    });

    if (!coldStartOpenDone.current) {
      coldStartOpenDone.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) {
          return;
        }
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        reportAdminPushOpen(data);
      });
    }

    return () => sub.remove();
  }, [active, userStatus]);

  useEffect(() => {
    if (!active || userStatus !== 'verified') {
      done.current = false;
      return;
    }
    if (!Device.isDevice) {
      return;
    }

    let cancelled = false;

    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted' || cancelled) {
        return;
      }

      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn(
          '[push] Add expo.extra.eas.projectId to app.json after running `eas init` in mobile-app.'
        );
        return;
      }

      const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (cancelled || !expoToken) {
        return;
      }

      try {
        await apiPost(
          'register-push-token.php',
          { expo_push_token: expoToken, platform: Platform.OS } as Record<string, unknown>,
          true
        );
        done.current = true;
      } catch {
        /* non-fatal */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, userStatus]);
}
