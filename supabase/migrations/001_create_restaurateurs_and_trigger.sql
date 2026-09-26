-- Table public.restaurateurs (profil resto, une ligne par compte restaurateur)
-- À exécuter dans Supabase : SQL Editor → New query → coller ce fichier → Run

CREATE TABLE IF NOT EXISTS public.restaurateurs (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text DEFAULT '',
  logo_url text DEFAULT '',
  adresse text DEFAULT '',
  site_web text DEFAULT '',
  images_urls jsonb DEFAULT '[]'::jsonb,
  billing_plan text DEFAULT 'gratuit',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS : un restaurateur ne voit que sa ligne
ALTER TABLE public.restaurateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurateur peut lire son profil"
  ON public.restaurateurs FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Restaurateur peut modifier son profil"
  ON public.restaurateurs FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fonction appelée par le trigger : crée une ligne restaurateurs si role = 'restaurateur'
CREATE OR REPLACE FUNCTION public.handle_new_restaurateur()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'restaurateur' THEN
    INSERT INTO public.restaurateurs (id, nom, logo_url, adresse, site_web, images_urls, billing_plan, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nom', ''),
      COALESCE(NEW.raw_user_meta_data->>'logo_url', ''),
      COALESCE(NEW.raw_user_meta_data->>'adresse', ''),
      COALESCE(NEW.raw_user_meta_data->>'site_web', ''),
      COALESCE((NEW.raw_user_meta_data->'images_urls')::jsonb, '[]'::jsonb),
      COALESCE(NEW.raw_user_meta_data->>'billing_plan', 'gratuit'),
      now(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users : après chaque nouvel utilisateur, appeler la fonction
DROP TRIGGER IF EXISTS on_auth_user_created_restaurateur ON auth.users;

CREATE TRIGGER on_auth_user_created_restaurateur
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_restaurateur();
