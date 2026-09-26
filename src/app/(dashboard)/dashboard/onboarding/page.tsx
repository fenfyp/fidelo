"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { VILLES_OPTIONS, VILLE_AUTRE, isVillePredefinie } from "@/lib/villes";

export default function OnboardingPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState<string>(VILLE_AUTRE);
  const [villeAutre, setVilleAutre] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion/restaurateur");
        return;
      }
      const { data: profil } = await supabase
        .from("restaurateurs")
        .select("nom, adresse, site_web, ville")
        .eq("id", user.id)
        .single();
      if (profil) {
        setNom(profil.nom ?? "");
        setAdresse(profil.adresse ?? "");
        const v = profil.ville ?? "";
        if (isVillePredefinie(v)) {
          setVille(v);
          setVilleAutre("");
        } else {
          setVille(VILLE_AUTRE);
          setVilleAutre(v);
        }
        setSiteWeb(profil.site_web ?? "");
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nomTrim = nom.trim();
    if (!nomTrim) {
      setError("Le nom du restaurant est obligatoire.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion/restaurateur");
        return;
      }
      const villeEnregistree = ville === VILLE_AUTRE ? villeAutre.trim() : ville;
      const { error: upsertError } = await supabase
        .from("restaurateurs")
        .upsert(
          {
            id: user.id,
            nom: nomTrim,
            adresse: adresse.trim(),
            ville: villeEnregistree || null,
            site_web: siteWeb.trim() || "",
            statut: "en_attente",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (upsertError) throw upsertError;
      router.replace("/dashboard/programme");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’enregistrement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black">
          Complétez votre profil
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Quelques informations pour personnaliser votre espace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="nom" className="mb-1 block text-sm font-medium text-black">
            Nom du restaurant <span className="text-red-500">*</span>
          </label>
          <input
            id="nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex. Le Bistrot"
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="adresse" className="mb-1 block text-sm font-medium text-black">
            Adresse
          </label>
          <input
            id="adresse"
            type="text"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Ex. 12 rue de la Paix, 75001 Paris"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="ville" className="mb-1 block text-sm font-medium text-black">
            Ville
          </label>
          <select
            id="ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            {VILLES_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {ville === VILLE_AUTRE && (
            <input
              type="text"
              value={villeAutre}
              onChange={(e) => setVilleAutre(e.target.value)}
              placeholder="Précisez la ville"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          )}
        </div>

        <div>
          <label htmlFor="siteWeb" className="mb-1 block text-sm font-medium text-black">
            Site web
          </label>
          <input
            id="siteWeb"
            type="url"
            value={siteWeb}
            onChange={(e) => setSiteWeb(e.target.value)}
            placeholder="https://votre-restaurant.com"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Continuer"}
        </button>
      </form>
    </div>
  );
}
