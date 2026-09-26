"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ONBOARDING_PATH = "/dashboard/onboarding";

export default function DashboardOnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion/restaurateur");
        return;
      }

      if (pathname === ONBOARDING_PATH) {
        setReady(true);
        return;
      }

      const { data: profil } = await supabase
        .from("restaurateurs")
        .select("nom")
        .eq("id", user.id)
        .single();

      const isProfileEmpty =
        !profil || !profil.nom || String(profil.nom).trim() === "";

      if (isProfileEmpty) {
        router.replace(ONBOARDING_PATH);
        return;
      }

      setReady(true);
    };

    check();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Chargement...</p>
      </div>
    );
  }

  return <>{children}</>;
}
