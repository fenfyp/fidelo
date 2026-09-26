"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Page de retour après OAuth (Google, etc.).
 * Supabase redirige ici avec les tokens dans le hash (#access_token=...).
 * On parse le hash, on enregistre la session avec setSession(), puis on redirige.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const next = searchParams.get("next") ?? "/client";

    (async () => {
      const hash = window.location.hash?.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
            router.replace(next);
            return;
          } catch {
            setError("Connexion échouée. Réessayez.");
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      setError("Connexion échouée. Réessayez.");
    })();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <a href="/connexion/consommateur" className="mt-4 inline-block text-sm underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <p className="text-neutral-600">Connexion en cours...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
          <p className="text-neutral-600">Connexion en cours...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
