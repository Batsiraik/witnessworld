import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { apiPost } from '../api/client';
import { navigateToSupportChat } from '../navigation/navigationRef';

type NotificationsModule = typeof import('expo-notifications');

/** Remote push is disabled in Expo Go (SDK 53+ on Android). Use a dev build / APK to test pushes. */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function loadNotificationsModule(): NotificationsModule | null {
  if (isExpoGo()) {
    return null;
  }
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

const notifications = loadNotificationsModule();
if (notifications) {
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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

function maybeNavigateSupportReply(data: Record<string, unknown> | undefined): void {
  const type = String(data?.type ?? '');
  if (type !== 'support_reply') {
    return;
  }
  const raw = data?.conversation_id;
  const cid =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.floor(raw)
      : parseInt(String(raw ?? ''), 10);
  if (Number.isFinite(cid) && cid > 0) {
    navigateToSupportChat(cid);
  }
}

/**
 * Registers for Expo push (FCM on Android when Firebase + EAS credentials are set).
 * No-op in Expo Go — push APIs are not available there (use a development build).
 */
export function usePushRegistration(active: boolean): void {
  const done = useRef(false);
  const coldStartOpenDone = useRef(false);

  useEffect(() => {
    const Notifications = loadNotificationsModule();
    if (!Notifications || !active) {
      coldStartOpenDone.current = false;
      return;
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      reportAdminPushOpen(data);
      maybeNavigateSupportReply(data);
    });

    if (!coldStartOpenDone.current) {
      coldStartOpenDone.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) {
          return;
        }
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        reportAdminPushOpen(data);
        maybeNavigateSupportReply(data);
      });
    }

    return () => sub.remove();
  }, [active]);

  useEffect(() => {
    const Notifications = loadNotificationsModule();
    if (!Notifications || !active) {
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
  }, [active]);
}
