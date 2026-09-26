-- Permettre au consommateur de quitter un programme (supprimer sa carte).

CREATE POLICY "Consommateur peut supprimer sa carte"
  ON public.cartes FOR DELETE
  TO authenticated
  USING (auth.uid() = consommateur_id);

-- Permettre aux consommateurs de lire les récompenses (affichage sur la page restaurant).

CREATE POLICY "Lecture des récompenses pour affichage"
  ON public.recompenses FOR SELECT
  TO authenticated
  USING (true);
