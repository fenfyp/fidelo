"use client";

import { useEffect } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/lib/supabase";
import app from "@/lib/firebase";

export default function FCMTokenRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      const supported = await isSupported();
      if (!supported || cancelled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey });
        if (!token || cancelled) return;

        await supabase.from("fcm_tokens").upsert(
          { consommateur_id: user.id, token },
          { onConflict: "consommateur_id" }
        );
      } catch (e) {
        console.warn("FCM registration failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
