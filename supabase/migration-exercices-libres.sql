-- Migration pour permettre les exercices libres (sans session)
-- A executer dans l'editeur SQL de Supabase

-- 1. Supprimer la contrainte NOT NULL sur session_id
ALTER TABLE student_results
  ALTER COLUMN session_id DROP NOT NULL;

-- 2. Ajouter les colonnes pour les exercices libres
ALTER TABLE student_results
  ADD COLUMN IF NOT EXISTS exercice_id TEXT,
  ADD COLUMN IF NOT EXISTS exercice_title TEXT,
  ADD COLUMN IF NOT EXISTS niveau TEXT;

-- 3. Supprimer la contrainte UNIQUE sur (session_id, student_id) car on peut avoir plusieurs resultats
ALTER TABLE student_results
  DROP CONSTRAINT IF EXISTS student_results_session_id_student_id_key;

-- 4. Mettre a jour la policy pour permettre aux eleves de sauvegarder des exercices libres
DROP POLICY IF EXISTS "Eleves peuvent soumettre leurs resultats" ON student_results;

CREATE POLICY "Eleves peuvent soumettre leurs resultats" ON student_results
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND (
      -- Exercice dans une session de classe
      (session_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM exercise_sessions es
        JOIN class_students cs ON cs.class_id = es.class_id
        WHERE es.id = student_results.session_id AND cs.student_id = auth.uid()
      ))
      OR
      -- Exercice libre (sans session)
      session_id IS NULL
    )
  );

-- 5. Mettre a jour la policy de lecture pour inclure les exercices libres
DROP POLICY IF EXISTS "Resultats visibles par l'eleve et le professeur de la classe" ON student_results;

CREATE POLICY "Resultats visibles par l'eleve et le professeur" ON student_results
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM exercise_sessions es
      JOIN classes c ON c.id = es.class_id
      WHERE es.id = student_results.session_id AND c.teacher_id = auth.uid()
    )
  );

-- 6. Creer un index pour les exercices par eleve
CREATE INDEX IF NOT EXISTS idx_student_results_exercice_id ON student_results(exercice_id);
CREATE INDEX IF NOT EXISTS idx_student_results_completed_at ON student_results(completed_at);
