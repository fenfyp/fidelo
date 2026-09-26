"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import DashboardBottomNav from "./DashboardBottomNav";
import DashboardOnboardingGuard from "./DashboardOnboardingGuard";

export default function DashboardLayout({
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
      <main className="pb-20">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
          <DashboardOnboardingGuard>{children}</DashboardOnboardingGuard>
        </div>
      </main>
      <DashboardBottomNav />
    </div>
  );
}
