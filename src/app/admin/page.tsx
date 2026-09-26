"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type RestoEnAttente = {
  id: string;
  nom: string;
  logo_url: string;
  adresse: string;
  ville: string | null;
  site_web: string;
  images_urls: unknown;
  published_nom: string | null;
  created_at: string;
};

function firstImageUrl(imagesUrls: unknown): string {
  if (!Array.isArray(imagesUrls) || imagesUrls.length === 0) return "";
  const first = imagesUrls[0];
  return typeof first === "string" ? first : "";
}

export default function AdminPage() {
  const [restos, setRestos] = useState<RestoEnAttente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [presentationBaseUrl, setPresentationBaseUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPresentationBaseUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

  async function loadPending() {
    setError(null);
    const { data, error: err } = await supabase
      .from("restaurateurs")
      .select("id, nom, logo_url, adresse, ville, site_web, images_urls, published_nom, created_at")
      .eq("statut", "en_attente")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setRestos((data ?? []) as RestoEnAttente[]);
  }

  useEffect(() => {
    loadPending().finally(() => setLoading(false));
  }, []);

  async function handleValider(resto: RestoEnAttente) {
    setActionId(resto.id);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("restaurateurs")
        .update({
          published_nom: resto.nom,
          published_logo_url: resto.logo_url,
          published_adresse: resto.adresse,
          published_site_web: resto.site_web,
          published_images_urls: resto.images_urls,
          statut: "valide",
          updated_at: new Date().toISOString(),
        })
        .eq("id", resto.id);
      if (updateError) throw updateError;
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la validation.");
    } finally {
      setActionId(null);
    }
  }

  async function handleRejeter(resto: RestoEnAttente) {
    setActionId(resto.id);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("restaurateurs")
        .update({
          statut: "rejete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", resto.id);
      if (updateError) throw updateError;
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du rejet.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Chargement...</p>
      </div>
    );
  }

  const presentationUrl = presentationBaseUrl ? `${presentationBaseUrl}/pour-restaurateurs` : "";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-black">Administration — Validation des restaurants</h1>
      <p className="text-sm text-zinc-500">
        Restaurants en attente de validation (nouveaux ou modifications). Validez pour les afficher sur l’Explorer.
      </p>

      {/* QR code page présentation restaurateurs */}
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold text-black">QR code — Page présentation restaurateurs</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Scannez pour partager la page des avantages Fidelo aux restaurateurs.
        </p>
        {presentationUrl && (
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white p-2">
              <QRCodeSVG value={presentationUrl} size={144} className="h-full w-full" />
            </div>
            <p className="break-all text-xs text-zinc-600 sm:self-center" title={presentationUrl}>
              {presentationUrl}
            </p>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {restos.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Aucun restaurant en attente de validation.
        </p>
      ) : (
        <ul className="space-y-4">
          {restos.map((resto) => (
            <li
              key={resto.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                      {resto.logo_url ? (
                        <img
                          src={resto.logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-zinc-500">Logo</span>
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-black">{resto.nom || "Sans nom"}</h2>
                      <p className="mt-0.5 text-sm text-zinc-500">{resto.adresse || "—"}</p>
                      <p className="mt-0.5 text-sm text-zinc-500">Ville : {resto.ville || "—"}</p>
                      {resto.site_web && (
                        <p className="mt-0.5 text-xs text-zinc-500">{resto.site_web}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {resto.published_nom ? "Modification en attente" : "Nouvelle inscription"} — id: {resto.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  {Array.isArray(resto.images_urls) && resto.images_urls.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {(resto.images_urls as string[]).slice(0, 3).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleValider(resto)}
                    disabled={actionId === resto.id}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {actionId === resto.id ? "..." : "Valider"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejeter(resto)}
                    disabled={actionId === resto.id}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
