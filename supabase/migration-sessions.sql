-- Migration: Ajouter la table sessions
-- A executer dans Supabase SQL Editor

-- Table des sessions d'exercices
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exercise_file TEXT NOT NULL,
  exercise_title TEXT,
  niveau TEXT,
  nb_questions INTEGER DEFAULT 10,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  google_coursework_id TEXT,
  display_duration INTEGER DEFAULT 8, -- Duree d'affichage en secondes
  selected_options JSONB, -- Options selectionnees pour l'exercice
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la table existe deja, ajouter les colonnes manquantes
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS selected_options JSONB;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS display_duration INTEGER DEFAULT 8;

-- Index pour recherche rapide par code
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON sessions(teacher_id);

-- Table des resultats d'eleves
CREATE TABLE IF NOT EXISTS session_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER,
  time_spent INTEGER, -- en secondes
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB, -- details des reponses
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_results_session_id ON session_results(session_id);
CREATE INDEX IF NOT EXISTS idx_session_results_student_id ON session_results(student_id);

-- Politique RLS pour sessions (simplifiee)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_results ENABLE ROW LEVEL SECURITY;

-- Permettre aux professeurs de gerer leurs sessions
CREATE POLICY "teachers_manage_sessions" ON sessions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permettre aux eleves de voir et soumettre leurs resultats
CREATE POLICY "students_manage_results" ON session_results
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
