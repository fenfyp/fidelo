"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface ImageUploadProps {
  /** URL actuelle de l'image (affichée en preview) */
  currentImageUrl?: string;
  /** Callback appelé après un upload réussi avec l'URL publique */
  onUploadSuccess: (publicUrl: string) => void;
  /** Type d'image (logo ou photo) pour organiser les fichiers */
  imageType: "logo" | "photo";
  /** Index optionnel pour les photos multiples (photo-1, photo-2, etc.) */
  photoIndex?: number;
  /** Texte du bouton (par défaut : "Choisir une image") */
  buttonText?: string;
  /** Afficher la preview de l'image actuelle */
  showPreview?: boolean;
  /** Classes CSS additionnelles pour le conteneur */
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export default function ImageUpload({
  currentImageUrl,
  onUploadSuccess,
  imageType,
  photoIndex,
  buttonText = "Choisir une image",
  showPreview = true,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validation du type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.");
      return;
    }

    // Validation de la taille
    if (file.size > MAX_FILE_SIZE) {
      setError("Fichier trop volumineux (max 5 MB).");
      return;
    }

    // Preview locale
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Upload vers Supabase Storage
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utilisateur non connecté.");
      }

      // Générer le chemin du fichier
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      let filePath: string;

      if (imageType === "logo") {
        filePath = `${user.id}/logo/logo-${timestamp}.${fileExt}`;
      } else {
        const index = photoIndex !== undefined ? photoIndex + 1 : 1;
        filePath = `${user.id}/photos/photo-${index}-${timestamp}.${fileExt}`;
      }

      // Upload
      const { error: uploadError } = await supabase.storage
        .from("restaurateurs-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("restaurateurs-images")
        .getPublicUrl(filePath);

      // Callback avec l'URL
      onUploadSuccess(publicUrl);

      setError(null);
    } catch (err) {
      console.error("Erreur upload:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Preview */}
      {showPreview && displayUrl && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          <img
            src={displayUrl}
            alt="Preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Bouton + input caché */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={uploading}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          {uploading ? "Upload en cours..." : buttonText}
        </button>
        {uploading && (
          <span className="text-xs text-zinc-500">Téléversement...</span>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
