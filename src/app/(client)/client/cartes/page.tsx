"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Recompense = { id: string; nom: string; points: number };

type CarteResto = {
  restaurateur_id: string;
  points: number;
  nom: string;
  logo_url: string;
  adresse: string;
  site_web: string;
  image_urls: string[];
  recompenses: Recompense[];
};

function imageUrlsFromJson(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

export default function ClientCartesPage() {
  const [cartes, setCartes] = useState<CarteResto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quittingId, setQuittingId] = useState<string | null>(null);
  const [selectedCarte, setSelectedCarte] = useState<CarteResto | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

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
        .select("restaurateur_id, points")
        .eq("consommateur_id", user.id);

      if (cartesError) {
        setError(cartesError.message);
        setLoading(false);
        return;
      }

      if (!cartesData?.length) {
        setCartes([]);
        setLoading(false);
        return;
      }

      const restoIds = cartesData.map((c) => c.restaurateur_id);

      const [restosRes, recompensesRes] = await Promise.all([
        supabase.from("restaurateurs").select("id, nom, logo_url, adresse, site_web, images_urls, published_nom, published_logo_url, published_adresse, published_site_web, published_images_urls").in("id", restoIds),
        supabase.from("recompenses").select("id, restaurateur_id, nom, points").in("restaurateur_id", restoIds).order("ordre", { ascending: true }).order("created_at", { ascending: true }),
      ]);

      const restosMap = new Map<string, { nom: string | null; logo_url: string | null; adresse: string | null; site_web: string | null; images_urls: unknown }>();
      (restosRes.data ?? []).forEach((r) => {
        if (!r?.id) return;
        restosMap.set(r.id, {
          nom: (r.published_nom ?? r.nom) ?? null,
          logo_url: (r.published_logo_url ?? r.logo_url) ?? null,
          adresse: (r.published_adresse ?? r.adresse) ?? null,
          site_web: (r.published_site_web ?? r.site_web) ?? null,
          images_urls: r.published_images_urls ?? r.images_urls,
        });
      });

      const recompensesByResto = new Map<string, Recompense[]>();
      (recompensesRes.data ?? []).forEach((row) => {
        if (!row?.restaurateur_id) return;
        const list = recompensesByResto.get(row.restaurateur_id) ?? [];
        list.push({ id: row.id, nom: row.nom ?? "", points: row.points ?? 0 });
        recompensesByResto.set(row.restaurateur_id, list);
      });

      const list: CarteResto[] = cartesData.map((c) => {
        const resto = restosMap.get(c.restaurateur_id);
        return {
          restaurateur_id: c.restaurateur_id,
          points: c.points ?? 0,
          nom: resto?.nom ?? "",
          logo_url: resto?.logo_url ?? "",
          adresse: resto?.adresse ?? "",
          site_web: resto?.site_web ?? "",
          image_urls: imageUrlsFromJson(resto?.images_urls),
          recompenses: recompensesByResto.get(c.restaurateur_id) ?? [],
        };
      });

      setCartes(list);
      setLoading(false);
    })();
  }, []);

  async function handleQuitter(restaurateurId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setQuittingId(restaurateurId);
    const { error } = await supabase.from("cartes").delete().eq("restaurateur_id", restaurateurId).eq("consommateur_id", user.id);
    setQuittingId(null);
    if (error) return;
    setSelectedCarte(null);
    setCartes((prev) => prev.filter((c) => c.restaurateur_id !== restaurateurId));
  }

  const filteredCartes = search.trim()
    ? cartes.filter((c) => c.nom.toLowerCase().includes(search.trim().toLowerCase()))
    : cartes;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Chargement des cartes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche : filtre les cartes par nom du restaurant */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un restaurant..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          aria-label="Rechercher un restaurant"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">{error}</p>
      )}

      {/* Vue détaillée : affichée quand on a cliqué sur une carte */}
      {selectedCarte ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setSelectedCarte(null)}
            className="text-sm font-medium text-zinc-500 hover:text-black"
          >
            ← Retour aux cartes
          </button>
          <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <header className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                {selectedCarte.logo_url ? (
                  <img src={selectedCarte.logo_url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <span className="text-xs font-medium text-zinc-500">Logo</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-black">{selectedCarte.nom || "Restaurant"}</h2>
            </header>
            {selectedCarte.image_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-4">
                {selectedCarte.image_urls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxImageUrl(url)}
                    className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 pb-2">
              <p className="text-sm text-zinc-500">Adresse</p>
              <p className="text-sm text-black">{selectedCarte.adresse || "—"}</p>
            </div>
            {selectedCarte.site_web && (
              <div className="px-4 pb-2">
                <p className="text-sm text-zinc-500">Site web</p>
                <a
                  href={selectedCarte.site_web.startsWith("http") ? selectedCarte.site_web : `https://${selectedCarte.site_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-black underline hover:no-underline"
                >
                  Ouvrir le site
                </a>
              </div>
            )}
            <div className="px-4 pb-4">
              <p className="mb-2 text-sm text-zinc-500">Programme récompenses</p>
              {selectedCarte.recompenses.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune récompense.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedCarte.recompenses.map((r) => (
                    <div key={r.id} className="min-w-[160px] shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <p className="font-medium text-black">{r.nom}</p>
                      <p className="text-xs text-zinc-500">{r.points} pts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-zinc-200 px-4 py-3">
              <p className="text-sm font-semibold text-black">
                Vos points : <span className="text-lg">{selectedCarte.points.toLocaleString("fr-FR")}</span>
              </p>
            </div>
            <div className="border-t border-zinc-200 p-4">
              <button
                type="button"
                onClick={() => handleQuitter(selectedCarte.restaurateur_id)}
                disabled={quittingId === selectedCarte.restaurateur_id}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {quittingId === selectedCarte.restaurateur_id ? "Chargement..." : "Quitter le programme"}
              </button>
            </div>
          </article>
        </div>
      ) : filteredCartes.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="text-sm text-zinc-500">
            {cartes.length === 0 ? "Vous n'avez aucune carte. Explorez les restaurants pour en rejoindre." : "Aucun restaurant ne correspond à la recherche."}
          </p>
          {cartes.length === 0 && (
            <Link href="/client/explorer" className="mt-4 inline-block rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Explorer les restaurants
            </Link>
          )}
        </div>
      ) : (
        /* Liste par défaut : cartes compactes scrollables (logo, titre, points) */
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">Cliquez sur une carte pour voir le détail.</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filteredCartes.map((carte) => (
              <button
                key={carte.restaurateur_id}
                type="button"
                onClick={() => setSelectedCarte(carte)}
                className="flex min-w-[160px] shrink-0 flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  {carte.logo_url ? (
                    <img src={carte.logo_url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <span className="text-xs font-medium text-zinc-500">Logo</span>
                  )}
                </div>
                <span className="w-full truncate text-center font-semibold text-black">{carte.nom || "Restaurant"}</span>
                <span className="text-sm font-medium text-zinc-600">{carte.points.toLocaleString("fr-FR")} pts</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox : image en grand au clic */}
      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-zinc-800 transition-colors hover:bg-white"
            aria-label="Fermer"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImageUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
