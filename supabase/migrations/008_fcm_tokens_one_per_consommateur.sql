-- Un seul token FCM par consommateur : suppression des doublons puis contrainte unique.
-- Si la table n'existe pas encore, créez-la avant (consommateur_id uuid, token text).

-- 1) Supprimer les doublons : garder une seule ligne par consommateur_id (ordre arbitraire)
DELETE FROM public.fcm_tokens a
USING public.fcm_tokens b
WHERE a.consommateur_id = b.consommateur_id
  AND a.ctid < b.ctid;

-- 2) Supprimer l'ancienne contrainte unique sur consommateur_id si elle existe (évite erreur en rejouant la migration)
ALTER TABLE public.fcm_tokens
  DROP CONSTRAINT IF EXISTS fcm_tokens_consommateur_id_key;

-- 3) Imposer un seul token par consommateur
ALTER TABLE public.fcm_tokens
  ADD CONSTRAINT fcm_tokens_consommateur_id_key UNIQUE (consommateur_id);
