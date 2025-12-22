export type UserRole = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  description: string | null
  teacher_id: string
  google_classroom_id: string | null
  join_code: string
  created_at: string
}

export interface ClassStudent {
  id: string
  class_id: string
  student_id: string
  joined_at: string
}

export interface ExerciseSession {
  id: string
  class_id: string
  teacher_id: string
  title: string
  exercise_type: string
  config: ExerciseConfig
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export interface ExerciseConfig {
  niveau: string // '6eme' | '5eme' | '4eme' | '3eme'
  theme: string
  nb_questions: number
  duree_par_question: number
  options: Record<string, any>
}

export interface StudentResult {
  id: string
  session_id: string | null
  student_id: string
  answers: Answer[]
  score: number
  total_questions: number
  time_spent: number
  completed_at: string
  exercice_id?: string
  exercice_title?: string
  niveau?: string
}

export interface Answer {
  question: string
  student_answer: string | number
  correct_answer: string | number
  is_correct: boolean
  time_taken: number
}

export interface ClassWithStats extends Class {
  student_count: number
  teacher_name: string
}

export interface StudentStats {
  student_id: string
  student_name: string
  total_sessions: number
  average_score: number
  total_time: number
  last_activity: string | null
}
