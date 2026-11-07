import OneSignal from "react-onesignal";

let initPromise = null;

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "Notification" in window &&
  "indexedDB" in window;

/* Safe to call many times: initialises only once and never throws. */
export const initOneSignal = () => {
  if (initPromise) return initPromise;

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID is missing. Add it to .env and restart npm run dev.");
    initPromise = Promise.resolve(false);
    return initPromise;
  }
  if (!isSupported()) {
    console.warn("[OneSignal] This browser does not support web push.");
    initPromise = Promise.resolve(false);
    return initPromise;
  }

  initPromise = OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: true,
    serviceWorkerPath: "OneSignalSDKWorker.js",
  })
    .then(() => {
      console.log("[OneSignal] initialised");
      return true;
    })
    .catch((err) => {
      console.warn("[OneSignal] init failed:", err?.message || err);
      return false;
    });

  return initPromise;
};

/* Link this browser to the logged-in user, then ask for permission. */
export const enableOneSignalForUser = async (externalId) => {
  try {
    const ready = await initOneSignal();
    if (!ready || !externalId) return;

    await OneSignal.login(String(externalId));

    if (Notification.permission === "denied") {
      console.warn(
        "[OneSignal] Notifications are blocked for this site. Click the lock icon in the address bar and set Notifications to Allow."
      );
      return;
    }

    if (!OneSignal.Notifications.permission) {
      await OneSignal.Notifications.requestPermission();
    }

    if (OneSignal.Notifications.permission && !OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optIn();
    }

    console.log(
      "[OneSignal] subscribed:",
      OneSignal.User.PushSubscription.optedIn,
      "id:",
      OneSignal.User.PushSubscription.id
    );
  } catch (err) {
    console.warn("[OneSignal] enable failed:", err?.message || err);
  }
};

/* Call this on logout so the next person on this device is not linked to the old user. */
export const disableOneSignalForUser = async () => {
  try {
    const ready = await initOneSignal();
    if (ready) await OneSignal.logout();
  } catch (err) {
    console.warn("[OneSignal] logout failed:", err?.message || err);
  }
};