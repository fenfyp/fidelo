-- Validation des restaurateurs : statut, version publiée, table admins, RLS.

-- 1. Colonnes sur restaurateurs
ALTER TABLE public.restaurateurs
  ADD COLUMN IF NOT EXISTS statut text DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'valide', 'rejete'));

ALTER TABLE public.restaurateurs
  ADD COLUMN IF NOT EXISTS published_nom text,
  ADD COLUMN IF NOT EXISTS published_logo_url text,
  ADD COLUMN IF NOT EXISTS published_adresse text,
  ADD COLUMN IF NOT EXISTS published_site_web text,
  ADD COLUMN IF NOT EXISTS published_images_urls jsonb;

-- Valeur par défaut pour statut sur les lignes existantes (si besoin)
UPDATE public.restaurateurs SET statut = 'en_attente' WHERE statut IS NULL;

-- Backfill : restos existants déjà en base = considérés validés (published_* = current)
UPDATE public.restaurateurs
SET
  published_nom = nom,
  published_logo_url = logo_url,
  published_adresse = adresse,
  published_site_web = site_web,
  published_images_urls = images_urls,
  statut = 'valide'
WHERE published_nom IS NULL AND (nom IS NOT NULL AND trim(nom) <> '');

-- 2. Table admins
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin peut lire sa ligne"
  ON public.admins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. RLS restaurateurs : remplacer les policies de lecture publique/explorer

DROP POLICY IF EXISTS "Lecture liste restaurateurs pour explorer" ON public.restaurateurs;
DROP POLICY IF EXISTS "Lecture publique des restaurateurs pour page QR" ON public.restaurateurs;

-- Authenticated : propre ligne, ou statut valide, ou admin, ou a une carte chez ce resto
CREATE POLICY "Lecture restaurateurs selon statut et rôle"
  ON public.restaurateurs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR statut = 'valide'
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.cartes c WHERE c.restaurateur_id = restaurateurs.id AND c.consommateur_id = auth.uid())
  );

-- Anon : uniquement restos validés (page publique)
CREATE POLICY "Lecture publique restaurateurs validés"
  ON public.restaurateurs FOR SELECT
  TO anon
  USING (statut = 'valide');

-- Admin : peut mettre à jour toutes les lignes (statut, published_*)
CREATE POLICY "Admin peut mettre à jour restaurateurs"
  ON public.restaurateurs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
