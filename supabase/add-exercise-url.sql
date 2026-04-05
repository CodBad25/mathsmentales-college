-- Migration : ajouter exercise_url pour stocker l'URL complète de l'exercice MathsMentales
-- Cela permet de rejouer l'exercice à l'identique pour les élèves, sans reconstruire l'URL.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS exercise_url TEXT;
