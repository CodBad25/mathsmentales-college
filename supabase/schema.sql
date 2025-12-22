-- Schema SQL pour MathsMentales Collège
-- À exécuter dans l'éditeur SQL de Supabase

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  google_classroom_id TEXT UNIQUE,
  join_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur teacher_id pour performances
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- Table de liaison élèves-classes
CREATE TABLE IF NOT EXISTS class_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- Table des sessions d'exercices
CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_class_id ON exercise_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_teacher_id ON exercise_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_is_active ON exercise_sessions(is_active);

-- Table des résultats des élèves
CREATE TABLE IF NOT EXISTS student_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  time_spent INTEGER NOT NULL, -- en secondes
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_student_results_session_id ON student_results(session_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON student_results(student_id);

-- Row Level Security (RLS) Policies

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Profils publics visibles par tous" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies pour classes
CREATE POLICY "Classes visibles par le professeur et ses élèves" ON classes
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    id IN (
      SELECT class_id FROM class_students WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Professeurs peuvent créer des classes" ON classes
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Professeurs peuvent modifier leurs classes" ON classes
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Professeurs peuvent supprimer leurs classes" ON classes
  FOR DELETE USING (teacher_id = auth.uid());

-- Policies pour class_students
CREATE POLICY "Membres de classe visibles par le professeur et les élèves de la classe" ON class_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE id = class_students.class_id
      AND (teacher_id = auth.uid() OR id IN (
        SELECT class_id FROM class_students WHERE student_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Élèves peuvent rejoindre une classe" ON class_students
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professeurs peuvent ajouter des élèves à leur classe" ON class_students
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Élèves et professeurs peuvent quitter/retirer de la classe" ON class_students
  FOR DELETE USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid())
  );

-- Policies pour exercise_sessions
CREATE POLICY "Sessions visibles par le professeur et les élèves de la classe" ON exercise_sessions
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    class_id IN (
      SELECT class_id FROM class_students WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Professeurs peuvent créer des sessions" ON exercise_sessions
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (SELECT 1 FROM classes WHERE id = exercise_sessions.class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Professeurs peuvent modifier leurs sessions" ON exercise_sessions
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "Professeurs peuvent supprimer leurs sessions" ON exercise_sessions
  FOR DELETE USING (teacher_id = auth.uid());

-- Policies pour student_results
CREATE POLICY "Résultats visibles par l'élève et le professeur de la classe" ON student_results
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM exercise_sessions es
      JOIN classes c ON c.id = es.class_id
      WHERE es.id = student_results.session_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Élèves peuvent soumettre leurs résultats" ON student_results
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM exercise_sessions es
      JOIN class_students cs ON cs.class_id = es.class_id
      WHERE es.id = student_results.session_id AND cs.student_id = auth.uid()
    )
  );

-- Fonction pour générer un code de classe unique
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement un code de classe
CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_class_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_class_join_code
BEFORE INSERT ON classes
FOR EACH ROW
EXECUTE FUNCTION set_class_join_code();

-- Vue pour les statistiques des élèves par classe
CREATE OR REPLACE VIEW class_student_stats AS
SELECT
  cs.class_id,
  cs.student_id,
  p.full_name AS student_name,
  p.email AS student_email,
  COUNT(DISTINCT sr.id) AS total_sessions_completed,
  COALESCE(AVG(sr.score), 0) AS average_score,
  COALESCE(SUM(sr.time_spent), 0) AS total_time_spent,
  MAX(sr.completed_at) AS last_activity
FROM class_students cs
JOIN profiles p ON p.id = cs.student_id
LEFT JOIN student_results sr ON sr.student_id = cs.student_id
LEFT JOIN exercise_sessions es ON es.id = sr.session_id AND es.class_id = cs.class_id
GROUP BY cs.class_id, cs.student_id, p.full_name, p.email;

-- Commentaires pour documentation
COMMENT ON TABLE profiles IS 'Profils des utilisateurs (élèves et professeurs)';
COMMENT ON TABLE classes IS 'Classes créées par les professeurs';
COMMENT ON TABLE class_students IS 'Relation entre les classes et les élèves';
COMMENT ON TABLE exercise_sessions IS 'Sessions d''exercices créées par les professeurs';
COMMENT ON TABLE student_results IS 'Résultats des élèves pour chaque session';
