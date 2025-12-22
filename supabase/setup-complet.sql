-- ============================================
-- SETUP COMPLET MATHSMENTALES COLLEGE
-- Copier-coller ce fichier dans Supabase SQL Editor
-- ============================================

-- Extension pour UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TABLES
-- ============================================

-- Profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  google_classroom_id TEXT UNIQUE,
  join_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Eleves dans les classes
CREATE TABLE IF NOT EXISTS class_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- Sessions d'exercices
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

-- Resultats des eleves
CREATE TABLE IF NOT EXISTS student_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  score NUMERIC NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_spent INTEGER NOT NULL DEFAULT 0,
  exercice_id TEXT,
  exercice_title TEXT,
  niveau TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_class_id ON exercise_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_student_results_exercice_id ON student_results(exercice_id);

-- ============================================
-- 3. FONCTIONS
-- ============================================

-- Generateur de code de classe
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

-- Trigger pour code automatique
CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_class_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_class_join_code ON classes;
CREATE TRIGGER trigger_set_class_join_code
BEFORE INSERT ON classes
FOR EACH ROW
EXECUTE FUNCTION set_class_join_code();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Profils visibles par tous" ON profiles;
CREATE POLICY "Profils visibles par tous" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateurs peuvent creer leur profil" ON profiles;
CREATE POLICY "Utilisateurs peuvent creer leur profil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leur profil" ON profiles;
CREATE POLICY "Utilisateurs peuvent modifier leur profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CLASSES
DROP POLICY IF EXISTS "Classes visibles" ON classes;
CREATE POLICY "Classes visibles" ON classes
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    id IN (SELECT class_id FROM class_students WHERE student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Classes visibles par code" ON classes;
CREATE POLICY "Classes visibles par code" ON classes
  FOR SELECT USING (join_code IS NOT NULL);

DROP POLICY IF EXISTS "Professeurs peuvent creer des classes" ON classes;
CREATE POLICY "Professeurs peuvent creer des classes" ON classes
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

DROP POLICY IF EXISTS "Professeurs peuvent modifier leurs classes" ON classes;
CREATE POLICY "Professeurs peuvent modifier leurs classes" ON classes
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Professeurs peuvent supprimer leurs classes" ON classes;
CREATE POLICY "Professeurs peuvent supprimer leurs classes" ON classes
  FOR DELETE USING (teacher_id = auth.uid());

-- CLASS_STUDENTS
DROP POLICY IF EXISTS "Membres visibles" ON class_students;
CREATE POLICY "Membres visibles" ON class_students
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "Eleves peuvent rejoindre" ON class_students;
CREATE POLICY "Eleves peuvent rejoindre" ON class_students
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Quitter la classe" ON class_students;
CREATE POLICY "Quitter la classe" ON class_students
  FOR DELETE USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM classes WHERE id = class_students.class_id AND teacher_id = auth.uid())
  );

-- EXERCISE_SESSIONS
DROP POLICY IF EXISTS "Sessions visibles" ON exercise_sessions;
CREATE POLICY "Sessions visibles" ON exercise_sessions
  FOR SELECT USING (
    teacher_id = auth.uid() OR
    class_id IN (SELECT class_id FROM class_students WHERE student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Professeurs peuvent creer des sessions" ON exercise_sessions;
CREATE POLICY "Professeurs peuvent creer des sessions" ON exercise_sessions
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Professeurs peuvent modifier leurs sessions" ON exercise_sessions;
CREATE POLICY "Professeurs peuvent modifier leurs sessions" ON exercise_sessions
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Professeurs peuvent supprimer leurs sessions" ON exercise_sessions;
CREATE POLICY "Professeurs peuvent supprimer leurs sessions" ON exercise_sessions
  FOR DELETE USING (teacher_id = auth.uid());

-- STUDENT_RESULTS
DROP POLICY IF EXISTS "Resultats visibles" ON student_results;
CREATE POLICY "Resultats visibles" ON student_results
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM exercise_sessions es
      JOIN classes c ON c.id = es.class_id
      WHERE es.id = student_results.session_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Eleves peuvent sauvegarder resultats" ON student_results;
CREATE POLICY "Eleves peuvent sauvegarder resultats" ON student_results
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- ============================================
-- 5. FIN
-- ============================================

SELECT 'Setup termine avec succes!' as message;
