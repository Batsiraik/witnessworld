# Push notifications — what’s left to do (Firebase + Expo)

You’ve already done the main app wiring: `google-services.json` and `GoogleService-Info.plist` in **`mobile-app/`** (next to `app.json`), **`expo.extra.eas.projectId`** in `app.json`, and the **`user_push_tokens`** table. Those paths and the EAS project UUID are correct for this project.

The server sends pushes through **Expo’s Push API** (not Firebase Admin from PHP). You still need Expo/EAS to be allowed to deliver to **FCM (Android)** and **APNs (iOS)**.

---

## Android — FCM in Expo (your downloaded private key JSON)

The file from Firebase **Project settings → Service accounts → Generate new private key** (e.g. `*-firebase-adminsdk-*.json`) is a **Google service account key**.

- **Use it in [expo.dev](https://expo.dev)** for this project: open your **Witness World / witnessworld** project → **Credentials** (or **Project settings** → credentials, depending on the UI) → **Android** → set up **push notifications / FCM**.
- When Expo asks for the **FCM / Google Service Account** JSON, upload **that** file (or whatever the current Expo wizard specifies — it’s the same kind of credential).
- **Do not** paste that JSON into your `mobile-app` folder or commit it to Git. Keep it secret. Our **PHP admin panel does not use this file**; only Expo’s servers need it to talk to FCM.

Also ensure **Cloud Messaging / FCM** is enabled for the Firebase project (Firebase Console → Build → Cloud Messaging if shown).

---

## iOS — APNs in Expo

1. **Apple Developer** account with the app identifier **`com.witnessworldconnect.app`**.
2. In **expo.dev** → same project → **Credentials** → **iOS** → add an **APNs key** (or follow Expo’s iOS push setup). Expo uses this to deliver notifications to iOS builds.

Without APNs credentials on Expo, **iOS push will not work** even if Firebase plist is present.

---

## Installable builds (required for real push)

**Expo Go is not enough** for reliable push. Build and install:

```bash
cd mobile-app
eas build --profile development --platform android
eas build --profile development --platform ios
```

(or `preview` / `production` from `eas.json`).

After install: open the app, sign in as a **verified** user, **allow notifications** when prompted. Then **Admin → Push notification** should show registered devices and test sends should start working.

---

## Quick verification

| Check | Status |
|--------|--------|
| `mobile-app/google-services.json` | Correct location |
| `mobile-app/GoogleService-Info.plist` | Correct location |
| `app.json` → `expo.extra.eas.projectId` | Correct (your Expo project UUID) |
| DB `user_push_tokens` | You ran the SQL |
| **Still to do** | Upload service-account JSON to **Expo** for FCM (Android), add **APNs** in Expo (iOS), run **EAS build**, test on device |

---

## Optional (PHP server)

- **`EXPO_ACCESS_TOKEN`** environment variable on the host: Expo access token for higher push rate limits; see Expo docs if you broadcast to many users.

If you change **package name** or **bundle ID**, update **Firebase**, **`app.json`**, and rebuild.
