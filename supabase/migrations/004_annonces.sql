-- Table des annonces envoyées par les restaurateurs à leurs abonnés.

CREATE TABLE IF NOT EXISTS public.annonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurateur_id uuid NOT NULL REFERENCES public.restaurateurs(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;

-- Le restaurateur peut créer et lire ses propres annonces
CREATE POLICY "Restaurateur gère ses annonces"
  ON public.annonces FOR ALL
  USING (auth.uid() = restaurateur_id)
  WITH CHECK (auth.uid() = restaurateur_id);

-- Les utilisateurs connectés peuvent lire les annonces (pour afficher celles des restos dont ils sont abonnés)
CREATE POLICY "Lecture des annonces pour affichage"
  ON public.annonces FOR SELECT
  TO authenticated
  USING (true);
