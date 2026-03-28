"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

interface UsePushOptions {
  adminKey?: string;
  userType?: string;
  userId?: string;
}

export function usePushNotifications(options: UsePushOptions = {}) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!supported || Notification.permission !== "granted") return;
    // Check for existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscription(sub);
      });
    });
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) return null;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return null;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return null;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    setSubscription(sub);

    // Send subscription to backend in the format the existing API expects
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.adminKey) headers["X-Admin-Key"] = options.adminKey;

    await fetch("/api/push-subscribe", {
      method: "POST",
      headers,
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userType: options.userType || "admin",
        userId: options.userId,
      }),
    });

    return sub;
  }, [supported, options.adminKey, options.userType, options.userId]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    await subscription.unsubscribe();
    setSubscription(null);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.adminKey) headers["X-Admin-Key"] = options.adminKey;

    await fetch("/api/push-subscribe", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  }, [subscription, options.adminKey]);

  return { supported, permission, subscription, subscribe, unsubscribe };
}
