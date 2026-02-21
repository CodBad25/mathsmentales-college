export type UserRole = 'student' | 'teacher'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  google_access_token: string | null
  google_refresh_token: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  description: string | null
  teacher_id: string
  google_classroom_id: string | null
  google_classroom_name: string | null
  join_code: string
  created_at: string
}

export interface ClassStudent {
  id: string
  class_id: string
  student_id: string
  joined_at: string
}

export interface Session {
  id: string
  class_id: string | null
  teacher_id: string | null
  title: string
  exercise_file: string
  exercise_title: string | null
  niveau: string | null
  nb_questions: number
  code: string
  status: 'active' | 'completed' | 'archived'
  google_coursework_id: string | null
  display_duration: number
  selected_options: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface SessionResult {
  id: string
  session_id: string | null
  student_id: string | null
  score: number | null
  total_questions: number | null
  time_spent: number | null
  completed_at: string
  details: Record<string, any> | null
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
