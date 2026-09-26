# send-annonce-push

Edge Function qui envoie les notifications push FCM aux abonnés lorsqu’un restaurateur publie une annonce.

## Secret requis

Dans le dashboard Supabase : **Project Settings → Edge Functions → Secrets**, ajoutez :

- **Nom :** `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Valeur :** JSON du compte de service Firebase, par exemple :

```json
{
  "project_id": "fidelo-c1289",
  "client_email": "firebase-adminsdk-xxx@fidelo-c1289.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

(Utilisez le fichier JSON téléchargé depuis la console Firebase, ou construisez cet objet avec `project_id`, `client_email` et `private_key`.)

## Déploiement

```bash
# Désactiver la vérification JWT au niveau de l'infrastructure pour permettre l'authentification dans le code
supabase functions deploy send-annonce-push --no-verify-jwt
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}'
```

**Note importante :** Le flag `--no-verify-jwt` désactive la vérification JWT au niveau de l'infrastructure Supabase. L'authentification est gérée manuellement dans le code de la fonction pour plus de contrôle et de compatibilité avec les nouvelles clés de signature JWT.

## Déclenchement

La fonction est appelée depuis la page **Programme** du dashboard après l’insertion d’une annonce. Elle :

1. Récupère l’annonce par `annonce_id`
2. Récupère les `consommateur_id` abonnés (table `cartes`)
3. Récupère les tokens FCM (table `fcm_tokens`)
4. Envoie une notification à chaque token via l’API FCM HTTP v1
