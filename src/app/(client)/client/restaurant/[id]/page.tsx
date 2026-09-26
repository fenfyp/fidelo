"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Recompense = { id: string; nom: string; points: number };

function imageUrlsFromJson(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

export default function ClientRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [recompenses, setRecompenses] = useState<Recompense[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAnonymous(true);
        const [restoRes, recompensesRes] = await Promise.all([
          supabase.from("restaurateurs").select("published_nom, published_logo_url, published_adresse, published_site_web, published_images_urls, ville").eq("id", id).eq("statut", "valide").single(),
          supabase.from("recompenses").select("id, nom, points").eq("restaurateur_id", id).order("ordre", { ascending: true }).order("created_at", { ascending: true }),
        ]);
        if (restoRes.error || !restoRes.data) {
          setError(restoRes.error?.message ?? "Ce restaurant n’est pas disponible.");
          setLoading(false);
          return;
        }
        const r = restoRes.data;
        setNom(r.published_nom ?? "");
        setLogoUrl(r.published_logo_url ?? "");
        setVille(r.ville ?? "");
        setAdresse(r.published_adresse ?? "");
        setSiteWeb(r.published_site_web ?? "");
        setImageUrls(imageUrlsFromJson(r.published_images_urls));
        if (!recompensesRes.error && recompensesRes.data) {
          setRecompenses(
            recompensesRes.data.map((row) => ({
              id: row.id,
              nom: row.nom ?? "",
              points: row.points ?? 0,
            }))
          );
        }
        setLoading(false);
        return;
      }

      setIsAnonymous(false);
      const [restoRes, recompensesRes, carteRes] = await Promise.all([
        supabase.from("restaurateurs").select("published_nom, published_logo_url, published_adresse, published_site_web, published_images_urls, ville").eq("id", id).eq("statut", "valide").single(),
        supabase.from("recompenses").select("id, nom, points").eq("restaurateur_id", id).order("ordre", { ascending: true }).order("created_at", { ascending: true }),
        supabase.from("cartes").select("id").eq("restaurateur_id", id).eq("consommateur_id", user.id).maybeSingle(),
      ]);

      if (restoRes.error || !restoRes.data) {
        setError(restoRes.error?.message ?? "Ce restaurant n’est pas disponible.");
        setLoading(false);
        return;
      }
      const r = restoRes.data;
      setNom(r.published_nom ?? "");
      setLogoUrl(r.published_logo_url ?? "");
      setVille(r.ville ?? "");
      setAdresse(r.published_adresse ?? "");
      setSiteWeb(r.published_site_web ?? "");
      setImageUrls(imageUrlsFromJson(r.published_images_urls));

      if (!recompensesRes.error && recompensesRes.data) {
        setRecompenses(
          recompensesRes.data.map((row) => ({
            id: row.id,
            nom: row.nom ?? "",
            points: row.points ?? 0,
          }))
        );
      }

      setIsSubscribed(!!carteRes.data);
      setLoading(false);
    })();
  }, [id]);

  async function handleRejoindre() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await supabase.from("cartes").insert({
      restaurateur_id: id,
      consommateur_id: user.id,
      points: 0,
    });
    setActionLoading(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setIsSubscribed(true);
    router.push("/client/cartes");
  }

  async function handleQuitter() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await supabase.from("cartes").delete().eq("restaurateur_id", id).eq("consommateur_id", user.id);
    setActionLoading(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setIsSubscribed(false);
  }

  const displaySiteUrl = siteWeb && (siteWeb.startsWith("http") ? siteWeb : `https://${siteWeb}`);

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/" className="inline-block text-sm font-medium text-zinc-500 hover:text-black">
          ← Retour
        </Link>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/" className="inline-block text-sm font-medium text-zinc-500 hover:text-black">
          ← Retour
        </Link>
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isAnonymous ? (
        <Link href="/" className="inline-block text-sm font-medium text-zinc-500 hover:text-black">
          ← Retour
        </Link>
      ) : (
        <Link href="/client/explorer" className="inline-block text-sm font-medium text-zinc-500 hover:text-black">
          ← Retour à l’explorer
        </Link>
      )}

      {/* Logo + nom */}
      <header className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <span className="text-sm font-medium text-zinc-500">Logo</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-black">{nom || "Restaurant"}</h1>
      </header>

      {/* Images : uniquement celles qui ont une URL, clic = agrandir */}
      {imageUrls.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Photos</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {imageUrls.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxUrl(url)}
                className="h-40 w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox : image agrandie au clic */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black transition-colors hover:bg-white"
            aria-label="Fermer"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Ville */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Ville</h2>
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black">{ville || "—"}</p>
      </section>

      {/* Adresse */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Adresse</h2>
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black">{adresse || "—"}</p>
      </section>

      {/* Site web */}
      {displaySiteUrl && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">Site web</h2>
          <a
            href={displaySiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-zinc-50"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ouvrir le site
          </a>
        </section>
      )}

      {/* Programme récompenses (scrollable) */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Programme récompenses</h2>
        {recompenses.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">Aucune récompense pour le moment.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recompenses.map((r) => (
              <div
                key={r.id}
                className="min-w-[180px] shrink-0 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <p className="font-medium text-black">{r.nom}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {r.points} point{r.points > 1 ? "s" : ""} nécessaire{r.points > 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bouton Rejoindre / Quitter ou lien vers connexion (anon) */}
      {actionError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}
      <section>
        {isAnonymous ? (
          <>
            <Link
              href={`/connexion/consommateur?redirect=${encodeURIComponent(`/client/restaurant/${id}`)}`}
              className="block w-full rounded-xl border border-black bg-black px-4 py-3 text-center text-sm font-medium text-white hover:bg-zinc-800"
            >
              Rejoindre le programme
            </Link>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Connectez-vous ou créez un compte pour rejoindre
            </p>
          </>
        ) : isSubscribed ? (
          <button
            type="button"
            onClick={handleQuitter}
            disabled={actionLoading}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {actionLoading ? "Chargement..." : "Quitter le programme"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRejoindre}
            disabled={actionLoading}
            className="w-full rounded-xl border border-black bg-black px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {actionLoading ? "Chargement..." : "Rejoindre le programme"}
          </button>
        )}
      </section>
    </div>
  );
}
