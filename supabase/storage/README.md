# Configuration Supabase Storage

## Bucket : restaurateurs-images

Ce bucket stocke les images uploadées par les restaurateurs (logos et photos).

### Étapes de configuration dans Supabase Dashboard

1. **Créer le bucket**
   - Aller dans Storage → Create bucket
   - Nom : `restaurateurs-images`
   - Public : **Oui** (pour générer des URLs publiques)

2. **Configurer les politiques RLS (Row Level Security)**

   Aller dans Storage → restaurateurs-images → Policies et créer les politiques suivantes :

   **Politique INSERT (Upload)**
   ```sql
   CREATE POLICY "Restaurateurs peuvent uploader leurs images"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'restaurateurs-images' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Politique SELECT (Lecture)**
   ```sql
   CREATE POLICY "Images publiques en lecture"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'restaurateurs-images');
   ```

   **Politique UPDATE (Mise à jour)**
   ```sql
   CREATE POLICY "Restaurateurs peuvent modifier leurs images"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'restaurateurs-images' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **Politique DELETE (Suppression)**
   ```sql
   CREATE POLICY "Restaurateurs peuvent supprimer leurs images"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'restaurateurs-images' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

3. **Structure des chemins**
   - Format : `{user_id}/{type}/{filename}`
   - Exemple logo : `550e8400-e29b-41d4-a716-446655440000/logo/restaurant-logo.jpg`
   - Exemple photo : `550e8400-e29b-41d4-a716-446655440000/photos/photo-1.jpg`

4. **Limites recommandées**
   - Taille max par fichier : 5 MB
   - Types acceptés : image/jpeg, image/png, image/webp, image/gif
   - Nombre max de photos par resto : 5 (+ 1 logo)

## Utilisation dans le code

```typescript
import { supabase } from "@/lib/supabase";

// Upload d'une image
const { data: { user } } = await supabase.auth.getUser();
const filePath = `${user.id}/logo/logo.jpg`;

const { data, error } = await supabase.storage
  .from('restaurateurs-images')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: true
  });

// Récupérer l'URL publique
const { data: { publicUrl } } = supabase.storage
  .from('restaurateurs-images')
  .getPublicUrl(filePath);
```
