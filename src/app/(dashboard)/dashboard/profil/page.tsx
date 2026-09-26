"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, removeRestaurateurStorageFileIfOurs, uploadRestaurateurPhotoFile } from "@/lib/supabase";
import { VILLES_OPTIONS, VILLE_AUTRE, isVillePredefinie } from "@/lib/villes";
import ImageUpload from "@/components/ImageUpload";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

function padImageUrls(arr: string[] | null | undefined): string[] {
  if (!Array.isArray(arr)) return Array(MAX_IMAGES).fill("");
  const copy = [...arr];
  while (copy.length < MAX_IMAGES) copy.push("");
  return copy.slice(0, MAX_IMAGES);
}

function PhotoSlotEdit({
  index,
  displayUrl,
  onFileSelect,
  onClear,
  onDelete,
  hasPendingFile,
}: {
  index: number;
  displayUrl: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onDelete: () => void;
  hasPendingFile: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Format non supporté (JPG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Fichier trop volumineux (max 5 MB).");
      return;
    }
    onFileSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`Photo ${index + 1}`}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
            Photo {index + 1}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-50"
        >
          {displayUrl ? "Remplacer" : "Choisir une image"}
        </button>
        {displayUrl && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        )}
        {hasPendingFile && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-zinc-500 underline hover:no-underline"
          >
            Annuler la sélection
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [ville, setVille] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(() => Array(MAX_IMAGES).fill(""));
  const [billingPlan, setBillingPlan] = useState("");

  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingVille, setEditingVille] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [editingNom, setEditingNom] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editAddress, setEditAddress] = useState("");
  const [editVille, setEditVille] = useState("");
  const [editVilleAutre, setEditVilleAutre] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editImageUrls, setEditImageUrls] = useState<string[]>(() => Array(MAX_IMAGES).fill(""));
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<(File | null)[]>(() => Array(MAX_IMAGES).fill(null));
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<(string | null)[]>(() => Array(MAX_IMAGES).fill(null));
  const [editNom, setEditNom] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [restaurateurId, setRestaurateurId] = useState<string | null>(null);
  const [qrBaseUrl, setQrBaseUrl] = useState("");
  const [statut, setStatut] = useState<string>("en_attente");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrBaseUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setRestaurateurId(user.id);
      const { data, error } = await supabase
        .from("restaurateurs")
        .select("nom, logo_url, adresse, ville, site_web, images_urls, billing_plan, statut")
        .eq("id", user.id)
        .single();
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setNom(data.nom ?? "");
        setLogoUrl(data.logo_url ?? "");
        setAddress(data.adresse ?? "");
        const v = data.ville ?? "";
        setVille(v);
        if (isVillePredefinie(v)) {
          setEditVille(v);
          setEditVilleAutre("");
        } else {
          setEditVille(VILLE_AUTRE);
          setEditVilleAutre(v);
        }
        setWebsiteUrl(data.site_web ?? "");
        setImageUrls(padImageUrls(data.images_urls));
        setEditImageUrls(padImageUrls(data.images_urls));
        setEditAddress(data.adresse ?? "");
        setEditWebsiteUrl(data.site_web ?? "");
        setEditNom(data.nom ?? "");
        setEditLogoUrl(data.logo_url ?? "");
        setBillingPlan(data.billing_plan ?? "gratuit");
        setStatut(data.statut ?? "en_attente");
      }
      setLoading(false);
    })();
  }, []);

  async function saveToSupabase(updates: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaveError(null);
    const { error } = await supabase
      .from("restaurateurs")
      .update({ ...updates, statut: "en_attente", updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      setSaveError(error.message);
      throw error;
    }
    setStatut("en_attente");
  }

  function startEditPhotos() {
    setEditImageUrls([...imageUrls]);
    setPendingPhotoFiles(Array(MAX_IMAGES).fill(null));
    setPendingPreviewUrls(Array(MAX_IMAGES).fill(null));
    setEditingPhotos(true);
  }

  function revokePendingPreviews() {
    pendingPreviewUrls.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    setPendingPreviewUrls(Array(MAX_IMAGES).fill(null));
    setPendingPhotoFiles(Array(MAX_IMAGES).fill(null));
  }

  function setPendingPhoto(index: number, file: File | null) {
    if (pendingPreviewUrls[index]) URL.revokeObjectURL(pendingPreviewUrls[index]);
    setPendingPreviewUrls((prev) => {
      const next = [...prev];
      next[index] = file ? URL.createObjectURL(file) : null;
      return next;
    });
    setPendingPhotoFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }

  function clearPhotoSlot(index: number) {
    setEditImageUrls((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
    setPendingPhoto(index, null);
  }

  async function savePhotos() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const finalUrls = [...editImageUrls];

      for (let i = 0; i < MAX_IMAGES; i++) {
        if (pendingPhotoFiles[i]) {
          if (editImageUrls[i]) {
            await removeRestaurateurStorageFileIfOurs(editImageUrls[i]);
          }
          const publicUrl = await uploadRestaurateurPhotoFile(pendingPhotoFiles[i]!, user.id, i);
          finalUrls[i] = publicUrl;
        }
      }

      for (let i = 0; i < MAX_IMAGES; i++) {
        if (imageUrls[i] && imageUrls[i] !== finalUrls[i]) {
          await removeRestaurateurStorageFileIfOurs(imageUrls[i]);
        }
      }

      await saveToSupabase({ images_urls: finalUrls });
      setImageUrls(finalUrls);
      setEditImageUrls(finalUrls);
      revokePendingPreviews();
      setEditingPhotos(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    }
  }

  function cancelPhotos() {
    revokePendingPreviews();
    setEditImageUrls([...imageUrls]);
    setEditingPhotos(false);
  }

  function startEditAddress() {
    setEditAddress(address);
    setEditingAddress(true);
  }

  async function saveAddress() {
    const value = editAddress.trim();
    try {
      await saveToSupabase({ adresse: value });
      setAddress(value);
      setEditingAddress(false);
    } catch {
      // saveError already set
    }
  }

  function cancelAddress() {
    setEditAddress(address);
    setEditingAddress(false);
  }

  function startEditVille() {
    setEditVille(isVillePredefinie(ville) ? ville : VILLE_AUTRE);
    setEditVilleAutre(isVillePredefinie(ville) ? "" : ville);
    setEditingVille(true);
  }

  async function saveVille() {
    const value = editVille === VILLE_AUTRE ? editVilleAutre.trim() : editVille;
    try {
      await saveToSupabase({ ville: value || "" });
      setVille(value || "");
      setEditingVille(false);
    } catch {
      // saveError already set
    }
  }

  function cancelVille() {
    setEditVille(isVillePredefinie(ville) ? ville : VILLE_AUTRE);
    setEditVilleAutre(isVillePredefinie(ville) ? "" : ville);
    setEditingVille(false);
  }

  function startEditWebsite() {
    setEditWebsiteUrl(websiteUrl);
    setEditingWebsite(true);
  }

  async function saveWebsite() {
    const value = editWebsiteUrl.trim();
    try {
      await saveToSupabase({ site_web: value || "" });
      setWebsiteUrl(value || "");
      setEditingWebsite(false);
    } catch {
      // saveError already set
    }
  }

  function cancelWebsite() {
    setEditWebsiteUrl(websiteUrl);
    setEditingWebsite(false);
  }

  function startEditNom() {
    setEditNom(nom);
    setEditingNom(true);
  }

  async function saveNom() {
    const value = editNom.trim();
    try {
      await saveToSupabase({ nom: value });
      setNom(value);
      setEditingNom(false);
    } catch {
      // saveError already set
    }
  }

  function cancelNom() {
    setEditNom(nom);
    setEditingNom(false);
  }

  function startEditLogo() {
    setEditLogoUrl(logoUrl);
    setEditingLogo(true);
  }

  async function saveLogo() {
    const value = editLogoUrl.trim();
    try {
      await saveToSupabase({ logo_url: value || "" });
      setLogoUrl(value || "");
      setEditingLogo(false);
    } catch {
      // saveError already set
    }
  }

  function cancelLogo() {
    setEditLogoUrl(logoUrl);
    setEditingLogo(false);
  }

  async function handleDeconnexion() {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/connexion/restaurateur";
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Erreur lors de la déconnexion.");
      setIsLoggingOut(false);
    }
  }

  const displayUrl = websiteUrl.startsWith("http") ? websiteUrl : websiteUrl ? `https://${websiteUrl}` : "";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Chargement du profil...</p>
      </div>
    );
  }

  if (loadError) {
    const isNoRow = loadError.includes("PGRST116") || loadError.includes("0 rows");
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800" role="alert">
          {isNoRow
            ? "Profil restaurateur introuvable. Complétez l’onboarding pour créer votre profil."
            : loadError}
        </p>
        {isNoRow && (
          <a
            href="/dashboard/onboarding"
            className="inline-block rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Aller à l’onboarding
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {saveError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {saveError}
        </p>
      )}

      {statut === "en_attente" && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Votre restaurant est en attente de validation. Il n’apparaîtra pas dans l’Explorer tant qu’un administrateur ne l’aura pas validé.
        </div>
      )}

      {/* Logo + Nom du resto — chargés depuis Supabase, éditables */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              {(editingLogo ? editLogoUrl : logoUrl) ? (
                <img
                  src={editingLogo ? editLogoUrl : logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-sm font-medium text-zinc-500">Logo</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingNom ? (
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  placeholder="Nom du restaurant"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-lg font-bold text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              ) : (
                <h1 className="text-xl font-bold text-black">
                  {nom || "Nom du resto"}
                </h1>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editingNom && !editingLogo ? (
              <>
                <button
                  type="button"
                  onClick={startEditNom}
                  className="text-sm font-medium text-black underline hover:no-underline"
                >
                  Modifier le nom
                </button>
                <button
                  type="button"
                  onClick={startEditLogo}
                  className="text-sm font-medium text-black underline hover:no-underline"
                >
                  Modifier le logo
                </button>
              </>
            ) : editingNom ? (
              <>
                <button
                  type="button"
                  onClick={saveNom}
                  className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={cancelNom}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-100"
                >
                  Annuler
                </button>
              </>
            ) : (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <ImageUpload
                  currentImageUrl={logoUrl}
                  onUploadSuccess={async (publicUrl) => {
                    try {
                      if (logoUrl) {
                        await removeRestaurateurStorageFileIfOurs(logoUrl);
                      }
                      await saveToSupabase({ logo_url: publicUrl });
                      setLogoUrl(publicUrl);
                      setEditLogoUrl(publicUrl);
                      setEditingLogo(false);
                    } catch {
                      // saveError already set
                    }
                  }}
                  imageType="logo"
                  buttonText="Uploader un logo"
                  showPreview={false}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={cancelLogo}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-100"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QR code du restaurant */}
      {restaurateurId && qrBaseUrl && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">
            QR code du restaurant
          </h2>
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white p-2">
              <QRCodeSVG
                value={`${qrBaseUrl}/client/restaurant/${restaurateurId}`}
                size={192}
                className="h-full w-full"
              />
            </div>
            <p className="text-center text-xs text-zinc-500">
              Les clients scannent ce QR pour voir votre page et rejoindre votre programme.
            </p>
          </div>
        </section>
      )}

      {/* Images du resto (5 max) — modifiable */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Images du resto (5 maximum)
          </h2>
          {!editingPhotos ? (
            <button
              type="button"
              onClick={startEditPhotos}
              className="text-sm font-medium text-black underline hover:no-underline"
            >
              Modifier
            </button>
          ) : null}
        </div>

        {editingPhotos ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Les photos ne sont enregistrées qu’au clic sur « Enregistrer ». Annuler ne sauvegarde rien.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {editImageUrls.map((url, i) => (
                <PhotoSlotEdit
                  key={i}
                  index={i}
                  displayUrl={pendingPreviewUrls[i] ?? url}
                  onFileSelect={(file) => setPendingPhoto(i, file)}
                  onClear={() => setPendingPhoto(i, null)}
                  onDelete={() => clearPhotoSlot(i)}
                  hasPendingFile={!!pendingPhotoFiles[i]}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={savePhotos}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={cancelPhotos}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {imageUrls.map((url, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
              >
                {url ? (
                  <img
                    src={url}
                    alt={`Photo resto ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    Image {i + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adresse — modifiable */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Adresse
          </h2>
          {!editingAddress ? (
            <button
              type="button"
              onClick={startEditAddress}
              className="text-sm font-medium text-black underline hover:no-underline"
            >
              Modifier
            </button>
          ) : null}
        </div>

        {editingAddress ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="Adresse du restaurant"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveAddress}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={cancelAddress}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black">
            {address || "—"}
          </p>
        )}
      </section>

      {/* Ville — modifiable */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Ville
          </h2>
          {!editingVille ? (
            <button
              type="button"
              onClick={startEditVille}
              className="text-sm font-medium text-black underline hover:no-underline"
            >
              Modifier
            </button>
          ) : null}
        </div>

        {editingVille ? (
          <div className="space-y-2">
            <select
              value={editVille}
              onChange={(e) => setEditVille(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              {VILLES_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {editVille === VILLE_AUTRE && (
              <input
                type="text"
                value={editVilleAutre}
                onChange={(e) => setEditVilleAutre(e.target.value)}
                placeholder="Précisez la ville"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveVille}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={cancelVille}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black">
            {ville || "—"}
          </p>
        )}
      </section>

      {/* Site web — modifiable */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-zinc-500">
            Site web
          </h2>
          {!editingWebsite ? (
            <button
              type="button"
              onClick={startEditWebsite}
              className="text-sm font-medium text-black underline hover:no-underline"
            >
              Modifier
            </button>
          ) : null}
        </div>

        {editingWebsite ? (
          <div className="space-y-2">
            <input
              type="url"
              value={editWebsiteUrl}
              onChange={(e) => setEditWebsiteUrl(e.target.value)}
              placeholder="https://votre-site.com"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveWebsite}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={cancelWebsite}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          displayUrl ? (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-50"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ouvrir le site
            </a>
          ) : (
            <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              —
            </p>
          )
        )}
      </section>

      {/* Billing plan */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">
          Offre
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-black">
            {billingPlan || "Billing plan"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Plan actuel — détails à venir
          </p>
        </div>
      </section>

      {/* Déconnexion */}
      <section>
        {logoutError && (
          <p className="mb-2 text-sm text-red-600">{logoutError}</p>
        )}
        <button
          type="button"
          onClick={handleDeconnexion}
          disabled={isLoggingOut}
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
        </button>
      </section>
    </div>
  );
}
