"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Recompense = {
  id: string;
  name: string;
  points: number;
};

export default function ProgrammePage() {
  const [recompenses, setRecompenses] = useState<Recompense[]>([]);
  const [loadingRecompenses, setLoadingRecompenses] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [abonnesCount, setAbonnesCount] = useState<number | null>(null);
  const [pointsDonnes, setPointsDonnes] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAnnonceForm, setShowAnnonceForm] = useState(false);
  const [annonceTitre, setAnnonceTitre] = useState("");
  const [annonceDescription, setAnnonceDescription] = useState("");
  const [annonceSending, setAnnonceSending] = useState(false);
  const [showAnnonceConfirm, setShowAnnonceConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingRecompenses(false);
        return;
      }
      setLoadError(null);

      const [recompensesRes, cartesRes, restoRes] = await Promise.all([
        supabase
          .from("recompenses")
          .select("id, nom, points")
          .eq("restaurateur_id", user.id)
          .order("ordre", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("cartes")
          .select("points")
          .eq("restaurateur_id", user.id),
        supabase
          .from("restaurateurs")
          .select("logo_url")
          .eq("id", user.id)
          .single(),
      ]);

      const { data: recompensesData, error: recompensesError } = recompensesRes;
      const { data: cartesData, error: cartesError } = cartesRes;
      const { data: restoData } = restoRes;

      if (recompensesError) {
        setLoadError(recompensesError.message);
      } else {
        setRecompenses(
          (recompensesData ?? []).map((row) => ({
            id: row.id,
            name: row.nom ?? "",
            points: row.points ?? 0,
          }))
        );
      }

      if (!cartesError && cartesData) {
        setAbonnesCount(cartesData.length);
        setPointsDonnes(
          cartesData.reduce((sum, row) => sum + (row.points ?? 0), 0)
        );
      }

      if (restoData?.logo_url) {
        setLogoUrl(restoData.logo_url);
      }

      setLoadingRecompenses(false);
    })();
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    const points = parseInt(newPoints, 10);
    if (!name || Number.isNaN(points) || points < 0) return;
    setActionError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("recompenses")
      .insert({
        restaurateur_id: user.id,
        nom: name,
        points,
      })
      .select("id, nom, points")
      .single();
    if (error) {
      setActionError(error.message);
      return;
    }
    setRecompenses((prev) => [
      ...prev,
      { id: data.id, name: data.nom ?? "", points: data.points ?? 0 },
    ]);
    setNewName("");
    setNewPoints("");
    setShowAddForm(false);
  }

  async function handleDelete(id: string) {
    setActionError(null);
    const { error } = await supabase
      .from("recompenses")
      .delete()
      .eq("id", id);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRecompenses((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function startEdit(r: Recompense) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPoints(String(r.points));
  }

  async function saveEdit() {
    if (!editingId) return;
    const name = editName.trim();
    const points = parseInt(editPoints, 10);
    if (!name || Number.isNaN(points) || points < 0) return;
    setActionError(null);
    const { error } = await supabase
      .from("recompenses")
      .update({ nom: name, points, updated_at: new Date().toISOString() })
      .eq("id", editingId);
    if (error) {
      setActionError(error.message);
      return;
    }
    setRecompenses((prev) =>
      prev.map((r) =>
        r.id === editingId ? { ...r, name, points } : r
      )
    );
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSendAnnonce() {
    const titre = annonceTitre.trim();
    const description = annonceDescription.trim();
    if (!titre) return;
    setActionError(null);
    setAnnonceSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAnnonceSending(false);
      return;
    }
    const { data: inserted, error } = await supabase
      .from("annonces")
      .insert({
        restaurateur_id: user.id,
        titre,
        description,
      })
      .select("id")
      .single();
    setAnnonceSending(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (inserted?.id) {
      try {
        // Récupérer la session et utiliser fetch directement avec le token
        // supabase.functions.invoke() ne transmet pas correctement le token dans certains cas
        const { data: { session } } = await supabase.auth.getSession();
        // #region agent log
        console.log('[DEBUG-A] Session récupérée:', {hasSession:!!session,hasAccessToken:!!session?.access_token,tokenLength:session?.access_token?.length||0});
        // #endregion
        if (!session || !session.access_token) {
          throw new Error("Session non disponible");
        }
        
        // Utiliser fetch directement avec le token dans les headers
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const functionUrl = `${supabaseUrl}/functions/v1/send-annonce-push`;
        const authHeader = `Bearer ${session.access_token}`;
        const requestHeaders = {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        };
        // #region agent log
        console.log('[DEBUG-B] Avant fetch:', {url:functionUrl,hasToken:!!session.access_token,tokenPrefix:session.access_token.substring(0,30),authHeaderPrefix:authHeader.substring(0,30),hasApikey:!!requestHeaders.apikey,annonceId:inserted.id});
        // #endregion
        
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({ annonce_id: inserted.id }),
        });
        
        // #region agent log
        console.log('[DEBUG-C] Réponse reçue:', {status:response.status,statusText:response.statusText,ok:response.ok,headers:Object.fromEntries(response.headers.entries())});
        // #endregion
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          // #region agent log
          console.log('[DEBUG-D] Erreur réponse:', {status:response.status,errorData});
          // #endregion
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json().catch(() => ({}));
        // #region agent log
        console.log('[DEBUG-E] Données reçues:', {data});
        // #endregion
      } catch (err) {
        // Les push sont best-effort ; l'annonce est déjà en base
        console.error("Erreur lors de l'envoi des notifications push:", err);
      }
    }
    setAnnonceTitre("");
    setAnnonceDescription("");
    setShowAnnonceConfirm(false);
    setShowAnnonceForm(false);
  }

  return (
    <div className="space-y-6">
      {/* En-tête : Logo resto | Envoyer une annonce */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo du restaurant"
              className="h-full w-full object-cover"
              onError={() => setLogoUrl("")}
            />
          ) : (
            <span className="text-xs font-medium text-zinc-500">Logo resto</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAnnonceForm(true)}
          className="rounded-lg border border-black bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Envoyer une annonce
        </button>
      </div>

      {/* Formulaire Envoyer une annonce (titre + description → tous les abonnés) */}
      {showAnnonceForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-black">Nouvelle annonce</h2>
          <p className="mb-3 text-xs text-zinc-500">Elle sera envoyée à tous les abonnés de votre programme et apparaîtra sur leur page Annonces.</p>

          {showAnnonceConfirm ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Confirmez-vous l'envoi de cette annonce à vos abonnés ?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendAnnonce}
                  disabled={annonceSending}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {annonceSending ? "Envoi..." : "Confirmer l'envoi"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnonceConfirm(false)}
                  disabled={annonceSending}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50"
                >
                  Retour
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="annonce-titre" className="mb-1 block text-xs font-medium text-zinc-500">Titre</label>
                <input
                  id="annonce-titre"
                  type="text"
                  value={annonceTitre}
                  onChange={(e) => setAnnonceTitre(e.target.value)}
                  placeholder="Ex. Offre du jour"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label htmlFor="annonce-description" className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
                <textarea
                  id="annonce-description"
                  value={annonceDescription}
                  onChange={(e) => setAnnonceDescription(e.target.value)}
                  placeholder="Ex. Aujourd'hui -20 % sur tous les plats du midi."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnonceConfirm(true)}
                  disabled={!annonceTitre.trim()}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Envoyer l'annonce
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAnnonceForm(false); setShowAnnonceConfirm(false); setAnnonceTitre(""); setAnnonceDescription(""); setActionError(null); }}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <hr className="border-zinc-200" />

      {/* Lien historique des annonces */}
      <div>
        <Link
          href="/dashboard/annonces"
          className="text-sm font-medium text-black underline hover:no-underline"
        >
          Historique des annonces
        </Link>
      </div>

      {/* Bloc : Clients | Points donnés */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <span aria-hidden>👥</span> Abonnés
          </p>
          <p className="text-2xl font-bold text-black">
            {abonnesCount !== null ? abonnesCount.toLocaleString("fr-FR") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <span aria-hidden>⭐</span> Points donnés
          </p>
          <p className="text-2xl font-bold text-black">
            {pointsDonnes !== null ? pointsDonnes.toLocaleString("fr-FR") : "—"}
          </p>
        </div>
      </div>

      {/* Section Programme récompenses */}
      <section>
        {actionError && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
            {actionError}
          </p>
        )}
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-black">
            Programme récompenses
          </h2>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-xl font-medium text-black transition-colors hover:bg-zinc-100"
            aria-label="Ajouter une récompense"
          >
            +
          </button>
        </div>

        {/* Formulaire d'ajout */}
        {showAddForm && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="new-name" className="mb-1 block text-xs font-medium text-zinc-500">
                  Nom de la récompense
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex. Café offert"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="w-24 sm:w-28">
                <label htmlFor="new-points" className="mb-1 block text-xs font-medium text-zinc-500">
                  Points
                </label>
                <input
                  id="new-points"
                  type="number"
                  min={0}
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewName(""); setNewPoints(""); }}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des récompenses */}
        <ul className="space-y-2">
          {loadingRecompenses ? (
            <li className="rounded-xl border border-zinc-200 bg-zinc-50 py-8 text-center text-sm text-zinc-500">
              Chargement des récompenses...
            </li>
          ) : loadError ? (
            <li className="rounded-xl border border-red-200 bg-red-50 py-8 px-4 text-center text-sm text-red-600" role="alert">
              {loadError}
            </li>
          ) : recompenses.length === 0 ? (
            <li className="rounded-xl border border-zinc-200 bg-zinc-50 py-8 text-center text-sm text-zinc-500">
              Aucune récompense. Cliquez sur + pour en ajouter.
            </li>
          ) : (
            recompenses.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
              >
                {editingId === r.id ? (
                  <>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <input
                        type="number"
                        min={0}
                        value={editPoints}
                        onChange={(e) => setEditPoints(e.target.value)}
                        className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-sm text-zinc-500">points</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-100"
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-black">{r.name}</p>
                      <p className="text-sm text-zinc-500">
                        {r.points} point{r.points > 1 ? "s" : ""} nécessaire{r.points > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-100"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
