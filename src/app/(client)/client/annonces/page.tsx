"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type AnnonceItem = {
  id: string;
  restaurateur_id: string;
  titre: string;
  description: string;
  created_at: string;
  resto_nom: string;
  resto_logo_url: string;
};

const PREVIEW_LENGTH = 60;

function previewText(text: string, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ClientAnnoncesPage() {
  const [annonces, setAnnonces] = useState<AnnonceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: cartesData, error: cartesError } = await supabase
        .from("cartes")
        .select("restaurateur_id")
        .eq("consommateur_id", user.id);

      if (cartesError) {
        setError(cartesError.message);
        setLoading(false);
        return;
      }

      const restoIds = [...new Set((cartesData ?? []).map((c) => c.restaurateur_id))];
      if (restoIds.length === 0) {
        setAnnonces([]);
        setLoading(false);
        return;
      }

      const [annoncesRes, restosRes] = await Promise.all([
        supabase
          .from("annonces")
          .select("id, restaurateur_id, titre, description, created_at")
          .in("restaurateur_id", restoIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("restaurateurs")
          .select("id, nom, logo_url, published_nom, published_logo_url")
          .in("id", restoIds),
      ]);

      if (annoncesRes.error) {
        setError(annoncesRes.error.message);
        setLoading(false);
        return;
      }

      const restosMap = new Map<string, { nom: string; logo_url: string }>();
      (restosRes.data ?? []).forEach((r) => {
        if (r?.id) restosMap.set(r.id, { nom: (r.published_nom ?? r.nom) ?? "", logo_url: (r.published_logo_url ?? r.logo_url) ?? "" });
      });

      const list: AnnonceItem[] = (annoncesRes.data ?? []).map((row) => {
        const resto = restosMap.get(row.restaurateur_id);
        return {
          id: row.id,
          restaurateur_id: row.restaurateur_id,
          titre: row.titre ?? "",
          description: row.description ?? "",
          created_at: row.created_at ?? "",
          resto_nom: resto?.nom ?? "Restaurant",
          resto_logo_url: resto?.logo_url ?? "",
        };
      });

      setAnnonces(list);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black">Annonces</h1>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-black">Annonces</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">{error}</p>
      )}

      {annonces.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="text-sm text-zinc-500">Aucune annonce. Rejoignez des programmes de fidélité pour recevoir les annonces des restaurants.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {annonces.map((annonce) => (
            <li key={annonce.id}>
              <article className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  {annonce.resto_logo_url ? (
                    <img src={annonce.resto_logo_url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <span className="text-xs font-medium text-zinc-500">{annonce.resto_nom.slice(0, 2)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-500">{annonce.resto_nom}</p>
                  <h2 className="font-semibold text-black">{annonce.titre}</h2>
                  <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">
                    {previewText(annonce.description, PREVIEW_LENGTH)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">{formatDate(annonce.created_at)}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
