"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/lib/supabase";
import app from "@/lib/firebase";

const NOTIFICATION_DENIED_MESSAGE =
  "Vous avez bloqué les notifications. Pour les activer : ouvrez les paramètres de votre navigateur (icône cadenas ou « i » dans la barre d’adresse) → Paramètres du site → Notifications → Autoriser.";

export default function ClientProfilPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [nombreCartes, setNombreCartes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [hasNotificationToken, setHasNotificationToken] = useState(false);
  const [notificationActionLoading, setNotificationActionLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [qrBaseUrl, setQrBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrBaseUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        setUserId(user.id);
        setEmail(user.email ?? null);
        setPhone(user.phone ?? null);
        const { count } = await supabase
          .from("cartes")
          .select("id", { count: "exact", head: true })
          .eq("consommateur_id", user.id);
        setNombreCartes(count ?? 0);
        const { data: tokenRow } = await supabase
          .from("fcm_tokens")
          .select("token")
          .eq("consommateur_id", user.id)
          .maybeSingle();
        setHasNotificationToken(!!tokenRow?.token);
      }
      setLoading(false);
    })();
  }, []);

  async function handleActiverNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotificationActionLoading(true);
    setNotificationMessage(null);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setNotificationMessage(NOTIFICATION_DENIED_MESSAGE);
        return;
      }
      const supported = await isSupported();
      if (!supported) {
        setNotificationMessage("Les notifications ne sont pas supportées sur ce navigateur.");
        return;
      }
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        setNotificationMessage("Configuration des notifications manquante.");
        return;
      }
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey });
      if (!token) {
        setNotificationMessage("Impossible d’obtenir le token de notification.");
        return;
      }
      await supabase.from("fcm_tokens").upsert(
        { consommateur_id: user.id, token },
        { onConflict: "consommateur_id" }
      );
      setHasNotificationToken(true);
    } catch (e) {
      setNotificationMessage(
        e instanceof Error ? e.message : "Erreur lors de l’activation des notifications."
      );
    } finally {
      setNotificationActionLoading(false);
    }
  }

  async function handleDesactiverNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotificationActionLoading(true);
    setNotificationMessage(null);
    try {
      await supabase.from("fcm_tokens").delete().eq("consommateur_id", user.id);
      setHasNotificationToken(false);
    } catch (e) {
      setNotificationMessage(
        e instanceof Error ? e.message : "Erreur lors de la désactivation."
      );
    } finally {
      setNotificationActionLoading(false);
    }
  }

  async function handleDeconnexion() {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = "/connexion/consommateur";
    } finally {
      setIsLoggingOut(false);
    }
  }

  const contact = email || phone || "—";

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* 1. QR code de l'utilisateur */}
      <section className="w-full">
        <div className="flex justify-center">
          {isAuthenticated && userId && qrBaseUrl ? (
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white p-2">
              <QRCodeSVG
                value={`${qrBaseUrl}/dashboard/ajouter-points?c=${userId}`}
                size={192}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white text-center">
              <div className="text-sm font-medium text-zinc-500">
                QR code
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {isAuthenticated
            ? "Présentez ce QR code chez les restaurateurs pour cumuler des points"
            : "Vous obtiendrez un QR code une fois authentifié"}
        </p>
        {isAuthenticated && userId && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">Votre identifiant client</p>
            <p className="mt-1 break-all font-mono text-sm text-black" title={userId}>
              {userId}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Si le QR code ne fonctionne pas, le restaurateur peut saisir cet identifiant.
            </p>
          </div>
        )}
      </section>

      {/* 2. Nombre de cartes de fidélité */}
      <section className="w-full">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-sm text-zinc-500">Cartes de fidélité</p>
          <p className="text-2xl font-bold text-black">
            {loading ? "—" : nombreCartes !== null ? nombreCartes.toLocaleString("fr-FR") : "—"}
          </p>
        </div>
      </section>

      {/* 3. Email ou numéro de téléphone */}
      <section className="w-full">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-sm text-zinc-500">
            {email ? "Email" : phone ? "Téléphone" : "Contact"}
          </p>
          {loading ? (
            <p className="text-black">Chargement...</p>
          ) : (
            <p className="font-medium text-black">{contact}</p>
          )}
        </div>
      </section>

      {/* 4. Notifications */}
      <section className="w-full">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
          <p className="text-sm text-zinc-500">Notifications</p>
          {loading ? (
            <p className="text-black">—</p>
          ) : (
            <>
              <p className="font-medium text-black">
                {notificationPermission === "granted" && hasNotificationToken
                  ? "Activées"
                  : "Désactivées"}
              </p>
              {notificationMessage && (
                <p className="mt-2 text-xs text-amber-700">{notificationMessage}</p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {notificationPermission === "granted" && hasNotificationToken ? (
                  <button
                    type="button"
                    onClick={handleDesactiverNotifications}
                    disabled={notificationActionLoading}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {notificationActionLoading ? "Désactivation..." : "Désactiver les notifications"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleActiverNotifications}
                    disabled={notificationActionLoading}
                    className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {notificationActionLoading ? "Activation..." : "Activer les notifications"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 5. Déconnexion */}
      <section className="w-full pt-4">
        <button
          type="button"
          onClick={handleDeconnexion}
          disabled={isLoggingOut}
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
        </button>
      </section>
    </div>
  );
}
