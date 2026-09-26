-- Permettre aux utilisateurs connectés (consommateurs) de lire la liste des restaurateurs pour la page Explorer.
-- Les restaurateurs gardent le monopole sur l’édition de leur propre ligne (politiques existantes).

CREATE POLICY "Lecture liste restaurateurs pour explorer"
  ON public.restaurateurs FOR SELECT
  TO authenticated
  USING (true);
