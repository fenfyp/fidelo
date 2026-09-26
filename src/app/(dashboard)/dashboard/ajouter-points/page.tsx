"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AjouterPointsPage() {
  const searchParams = useSearchParams();
  const consommateurIdFromUrl = searchParams.get("c")?.trim() || null;

  const [consommateurId, setConsommateurId] = useState(consommateurIdFromUrl || "");
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [pointsToRemove, setPointsToRemove] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (consommateurIdFromUrl) {
      setConsommateurId(consommateurIdFromUrl);
    }
  }, [consommateurIdFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cid = consommateurId.trim();
    if (!cid) {
      setError("Indiquez l’identifiant du client (ou scannez son QR code).");
      return;
    }

    const points = parseInt(pointsToAdd, 10);
    if (Number.isNaN(points) || points < 1) {
      setError("Entrez un nombre de points valide (au moins 1).");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Vous devez être connecté.");
        return;
      }

      const { data: carte, error: fetchError } = await supabase
        .from("cartes")
        .select("id, points")
        .eq("restaurateur_id", user.id)
        .eq("consommateur_id", cid)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      if (!carte) {
        setError("Ce client n’est pas abonné à votre programme.");
        return;
      }

      const newPoints = (carte.points ?? 0) + points;
      const { error: updateError } = await supabase
        .from("cartes")
        .update({ points: newPoints })
        .eq("id", carte.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(`${points} point${points > 1 ? "s" : ""} ajouté${points > 1 ? "s" : ""}.`);
      setPointsToAdd("");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cid = consommateurId.trim();
    if (!cid) {
      setError("Indiquez l'identifiant du client (ou scannez son QR code).");
      return;
    }

    const points = parseInt(pointsToRemove, 10);
    if (Number.isNaN(points) || points < 1) {
      setError("Entrez un nombre de points valide à retirer (au moins 1).");
      return;
    }

    setRemoveLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Vous devez être connecté.");
        return;
      }

      const { data: carte, error: fetchError } = await supabase
        .from("cartes")
        .select("id, points")
        .eq("restaurateur_id", user.id)
        .eq("consommateur_id", cid)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      if (!carte) {
        setError("Ce client n'est pas abonné à votre programme.");
        return;
      }

      const currentPoints = carte.points ?? 0;
      if (points > currentPoints) {
        setError(`Le client n'a que ${currentPoints} point${currentPoints > 1 ? "s" : ""}. Vous ne pouvez pas en retirer ${points}.`);
        return;
      }

      const newPoints = currentPoints - points;
      const { error: updateError } = await supabase
        .from("cartes")
        .update({ points: newPoints })
        .eq("id", carte.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(`${points} point${points > 1 ? "s" : ""} retiré${points > 1 ? "s" : ""}. Solde restant : ${newPoints}.`);
      setPointsToRemove("");
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/programme"
        className="inline-block text-sm font-medium text-zinc-500 hover:text-black"
      >
        ← Retour au programme
      </Link>

      <h1 className="text-xl font-bold text-black">Points</h1>
      <p className="text-sm text-zinc-500">
        Saisissez l’identifiant du client (ou ouvrez le lien après avoir scanné son QR code), puis ajoutez ou retirez des points (par ex. lorsqu’il utilise une récompense).
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800" role="status">
          {success}
        </p>
      )}

      <div>
        <label htmlFor="consommateur-id" className="mb-1 block text-sm font-medium text-zinc-700">
          Identifiant du client
        </label>
        <input
          id="consommateur-id"
          type="text"
          value={consommateurId}
          onChange={(e) => setConsommateurId(e.target.value)}
          placeholder="UUID du consommateur (ex. depuis le QR)"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        {consommateurIdFromUrl && (
          <p className="mt-1 text-xs text-zinc-500">
            Client scanné : {consommateurIdFromUrl.slice(0, 8)}…
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-black">Ajouter des points</h2>
          <div>
            <label htmlFor="points-add" className="mb-1 block text-xs font-medium text-zinc-600">
              Nombre de points à ajouter
            </label>
            <input
              id="points-add"
              type="number"
              min={1}
              step={1}
              value={pointsToAdd}
              onChange={(e) => setPointsToAdd(e.target.value)}
              placeholder="Ex. 10"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-black bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Ajout en cours…" : "Ajouter les points"}
          </button>
        </form>

        <form onSubmit={handleRemoveSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-black">Retirer des points</h2>
          <p className="text-xs text-zinc-500">
            Lorsqu&apos;un client utilise ses points (ex. pour une récompense), retirez-les ici.
          </p>
          <div>
            <label htmlFor="points-remove" className="mb-1 block text-xs font-medium text-zinc-600">
              Nombre de points à retirer
            </label>
            <input
              id="points-remove"
              type="number"
              min={1}
              step={1}
              value={pointsToRemove}
              onChange={(e) => setPointsToRemove(e.target.value)}
              placeholder="Ex. 50"
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <button
            type="submit"
            disabled={removeLoading}
            className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {removeLoading ? "Retrait en cours…" : "Retirer les points"}
          </button>
        </form>
      </div>

      {success && (
        <Link
          href="/dashboard/ajouter-points"
          className="inline-block text-sm font-medium text-zinc-600 hover:text-black"
        >
          Gérer les points d&apos;un autre client
        </Link>
      )}
    </div>
  );
}
