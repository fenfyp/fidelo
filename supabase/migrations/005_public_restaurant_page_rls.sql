-- Lecture publique du profil restaurant et des récompenses (page QR, visiteur non connecté).
-- À exécuter dans Supabase : SQL Editor, ou via supabase db push.

-- Lecture publique des restaurateurs pour page QR
CREATE POLICY "Lecture publique des restaurateurs pour page QR"
  ON public.restaurateurs FOR SELECT
  TO anon
  USING (true);

-- Lecture publique des récompenses pour page QR
CREATE POLICY "Lecture publique des récompenses pour page QR"
  ON public.recompenses FOR SELECT
  TO anon
  USING (true);
