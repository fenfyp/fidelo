"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Annonce = {
  id: string;
  titre: string;
  description: string;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardAnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnonces = async () => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: err } = await supabase
      .from("annonces")
      .select("id, titre, description, created_at")
      .eq("restaurateur_id", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setAnnonces(
      (data ?? []).map((row) => ({
        id: row.id,
        titre: row.titre ?? "",
        description: row.description ?? "",
        created_at: row.created_at ?? "",
      }))
    );
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      await fetchAnnonces();
      setLoading(false);
    })();
  }, []);

  async function handleDelete(annonceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setDeletingId(annonceId);
    setError(null);
    const { error: err } = await supabase
      .from("annonces")
      .delete()
      .eq("id", annonceId)
      .eq("restaurateur_id", user.id);
    setDeletingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setAnnonces((prev) => prev.filter((a) => a.id !== annonceId));
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/programme"
        className="inline-block text-sm font-medium text-zinc-500 hover:text-black"
      >
        ← Retour au programme
      </Link>

      <h1 className="text-xl font-bold text-black">Historique des annonces</h1>
      <p className="text-sm text-zinc-500">
        Liste de toutes les annonces que vous avez envoyées à vos abonnés.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-zinc-500">Chargement...</p>
        </div>
      ) : annonces.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="text-sm text-zinc-500">Aucune annonce envoyée pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {annonces.map((a) => (
            <li key={a.id}>
              <article className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-black">{a.titre}</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{a.description}</p>
                    <p className="mt-2 text-xs text-zinc-400">{formatDate(a.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Supprimer l'annonce « ${a.titre} »`}
                  >
                    {deletingId === a.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
