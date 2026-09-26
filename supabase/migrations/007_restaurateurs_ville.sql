-- Ajout de la colonne ville pour les restaurateurs (Bruxelles, Liège, Louvain-la-Neuve, Charleroi, Namur ou autre).
ALTER TABLE public.restaurateurs
  ADD COLUMN IF NOT EXISTS ville text DEFAULT NULL;
