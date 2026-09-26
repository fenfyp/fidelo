import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase pour le navigateur (Auth + Database).
 * À utiliser dans les composants client ("use client").
 * 
 * Configuration de persistance de session :
 * - persistSession: true → La session est sauvegardée dans localStorage
 * - autoRefreshToken: true → Le token est rafraîchi automatiquement avant expiration
 * - detectSessionInUrl: true → Détecte la session dans l'URL (pour OAuth callback)
 * - storage: localStorage → Utilise localStorage côté navigateur pour persister la session
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

const STORAGE_BUCKET_RESTAURATEURS = "restaurateurs-images";

/**
 * Extrait le chemin du fichier dans le bucket à partir de l'URL publique Supabase.
 * Retourne null si l'URL ne correspond pas au bucket.
 */
export function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const prefix = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_RESTAURATEURS}/`;
  if (!publicUrl.startsWith(prefix)) return null;
  return publicUrl.slice(prefix.length);
}

/**
 * Supprime un fichier du bucket restaurateurs-images si l'URL pointe vers ce bucket.
 * Ne fait rien (et ne lance pas d'erreur) si l'URL est externe ou invalide.
 */
export async function removeRestaurateurStorageFileIfOurs(publicUrl: string): Promise<void> {
  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET_RESTAURATEURS).remove([path]);
}

/**
 * Upload un fichier photo dans le bucket restaurateurs-images et retourne l'URL publique.
 * Utilisé pour les 5 photos du resto (upload différé au clic sur Enregistrer).
 */
export async function uploadRestaurateurPhotoFile(
  file: File,
  userId: string,
  photoIndex: number
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const timestamp = Date.now();
  const filePath = `${userId}/photos/photo-${photoIndex + 1}-${timestamp}.${fileExt}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET_RESTAURATEURS)
    .upload(filePath, file, { cacheControl: "3600", upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET_RESTAURATEURS)
    .getPublicUrl(filePath);

  return publicUrl;
}
