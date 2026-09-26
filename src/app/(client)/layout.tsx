"use client";

import { useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ClientBottomNav from "./ClientBottomNav";
import FCMTokenRegistration from "./FCMTokenRegistration";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Vérifier et restaurer la session au chargement de l'app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Session restaurée automatiquement depuis localStorage
        // L'utilisateur reste connecté même après fermeture de l'app
      }
    });

    // Écouter les changements d'auth (connexion, déconnexion, refresh token, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // La session change (connexion, déconnexion, refresh token, etc.)
      // Cette fonction permet de réagir aux changements d'état d'authentification
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <FCMTokenRegistration />
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <Link
            href="/client/cartes"
            className="text-xl font-semibold text-black"
          >
            Fidelo
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
        {children}
      </main>
      <ClientBottomNav />
    </div>
  );
}
