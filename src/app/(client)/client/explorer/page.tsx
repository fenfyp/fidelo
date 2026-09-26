"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { VILLES_LIST, VILLE_AUTRE } from "@/lib/villes";

type RestaurateurCard = {
  id: string;
  nom: string;
  logo_url: string;
  adresse: string;
  ville: string | null;
  image_presentation: string;
};

function firstImageUrl(imagesUrls: unknown): string {
  if (!Array.isArray(imagesUrls) || imagesUrls.length === 0) return "";
  const first = imagesUrls[0];
  return typeof first === "string" ? first : "";
}

export default function ClientExplorerPage() {
  const [restos, setRestos] = useState<RestaurateurCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [villeFilter, setVilleFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      setError(null);
      const { data, error: err } = await supabase
        .from("restaurateurs")
        .select("id, published_nom, published_logo_url, published_adresse, published_images_urls, ville")
        .eq("statut", "valide")
        .order("published_nom", { ascending: true });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setRestos(
        (data ?? []).map((row) => ({
          id: row.id,
          nom: row.published_nom ?? "",
          logo_url: row.published_logo_url ?? "",
          adresse: row.published_adresse ?? "",
          ville: row.ville ?? null,
          image_presentation: firstImageUrl(row.published_images_urls),
        }))
      );
      setLoading(false);
    })();
  }, []);

  const filteredRestos = useMemo(() => {
    let list = restos;
    if (villeFilter) {
      if (villeFilter === VILLE_AUTRE) {
        list = list.filter(
          (r) => r.ville != null && r.ville !== "" && !VILLES_LIST.includes(r.ville as (typeof VILLES_LIST)[number])
        );
      } else {
        list = list.filter((r) => r.ville === villeFilter);
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.nom && r.nom.toLowerCase().includes(q)) ||
          (r.adresse && r.adresse.toLowerCase().includes(q)) ||
          (r.ville && r.ville.toLowerCase().includes(q))
      );
    }
    return list;
  }, [restos, searchQuery, villeFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Chargement des restaurants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-black">Explorer</h1>
      <p className="text-sm text-zinc-500">
        Découvrez les restaurants partenaires et rejoignez leur programme de fidélité.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <label htmlFor="explorer-search" className="sr-only">
            Rechercher un restaurant
          </label>
          <input
            id="explorer-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, adresse ou ville..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-4 pr-4 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            aria-label="Rechercher un restaurant"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="explorer-ville" className="text-sm font-medium text-zinc-600">
            Ville
          </label>
          <select
            id="explorer-ville"
            value={villeFilter}
            onChange={(e) => setVilleFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            aria-label="Filtrer par ville"
          >
            <option value="">Toutes les villes</option>
            {VILLES_LIST.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value={VILLE_AUTRE}>Autre</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredRestos.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-zinc-500">
            {restos.length === 0
              ? "Aucun restaurant pour le moment."
              : "Aucun restaurant ne correspond à votre recherche ou au filtre sélectionné."}
          </p>
        ) : (
          filteredRestos.map((resto) => (
            <Link
              key={resto.id}
              href={`/client/restaurant/${resto.id}`}
              className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
            >
              {/* Image de présentation (première image ou placeholder) */}
              <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                {resto.image_presentation ? (
                  <img
                    src={resto.image_presentation}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={`h-full w-full flex items-center justify-center bg-zinc-200 text-zinc-500 ${
                    resto.image_presentation ? "hidden" : ""
                  }`}
                >
                  <span className="text-sm">Photo</span>
                </div>
              </div>
              {/* Logo + nom + adresse */}
              <div className="flex gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  {resto.logo_url ? (
                    <img
                      src={resto.logo_url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <span className={resto.logo_url ? "hidden text-xs text-zinc-500" : "text-xs text-zinc-500"}>
                    Logo
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-black truncate">{resto.nom || "Restaurant"}</h2>
                  {resto.ville && (
                    <p className="mt-0.5 text-xs font-medium text-zinc-600">{resto.ville}</p>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
                    {resto.adresse || "—"}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
