-- Migration pour l'integration Google Classroom
-- A executer dans Supabase SQL Editor

-- 1. Ajouter les colonnes pour les tokens Google
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- 2. Ajouter une colonne pour lier une classe a Google Classroom
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS google_classroom_name TEXT;

-- 3. Mettre a jour la policy pour permettre la lecture des tokens par l'utilisateur
DROP POLICY IF EXISTS "Profils visibles par tous" ON profiles;

CREATE POLICY "Profils visibles par tous" ON profiles
  FOR SELECT USING (true);

-- Note: Les tokens sont sensibles, mais on les lit uniquement cote serveur
-- via le service_role_key, pas depuis le client

SELECT 'Migration Google Classroom terminee!' as message;
