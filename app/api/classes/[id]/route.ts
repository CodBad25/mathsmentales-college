import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { id } = params

    // Récupérer la classe
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, description, google_classroom_id, teacher_id')
      .eq('id', id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 })
    }

    const isTeacher = classData.teacher_id === user.id

    // Si pas professeur, vérifier si l'utilisateur est élève de la classe
    if (!isTeacher) {
      const { data: membership } = await supabaseAdmin
        .from('class_students')
        .select('id')
        .eq('class_id', id)
        .eq('student_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }
    }

    // Récupérer les élèves de la classe
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('class_students')
      .select(`
        profiles (
          id,
          full_name,
          email,
          avatar_url,
          gender,
          birth_date
        )
      `)
      .eq('class_id', id)

    if (studentsError) {
      console.error('Erreur récupération élèves:', studentsError)
    }

    // Récupérer les sessions de cette classe (avec détails)
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id, title, code, exercise_title, status, created_at')
      .eq('class_id', id)
      .order('created_at', { ascending: true })

    const sessionIds = (sessions || []).map(s => s.id)

    // Récupérer TOUS les résultats (tentatives multiples)
    let allResults: any[] = []
    if (sessionIds.length > 0) {
      const { data: results } = await supabaseAdmin
        .from('session_results')
        .select('session_id, student_id, score, total_questions, completed_at')
        .in('session_id', sessionIds)
      allResults = results || []
    }

    // Construire la grille : pour chaque élève × session, compter les tentatives et le meilleur score
    const grid: Record<string, Record<string, { attempts: number; bestScore: number; avgScore: number; lastScore: number }>> = {}

    for (const r of allResults) {
      if (!grid[r.student_id]) grid[r.student_id] = {}
      if (!grid[r.student_id][r.session_id]) {
        grid[r.student_id][r.session_id] = { attempts: 0, bestScore: 0, avgScore: 0, lastScore: 0 }
      }
      const cell = grid[r.student_id][r.session_id]
      const pct = (r.score / r.total_questions) * 100
      cell.attempts++
      cell.bestScore = Math.max(cell.bestScore, pct)
      cell.avgScore = ((cell.avgScore * (cell.attempts - 1)) + pct) / cell.attempts
      cell.lastScore = pct // sera écrasé par le dernier résultat chronologiquement
    }

    // Formatter les élèves avec leurs stats globales
    const formattedStudents = (students || []).map(s => {
      const profileData = s.profiles as any
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      const studentId = profile?.id || ''

      const studentResults = allResults.filter(r => r.student_id === studentId)
      const totalAttempts = studentResults.length
      const uniqueSessions = new Set(studentResults.map(r => r.session_id)).size

      let averageScore = 0
      if (totalAttempts > 0) {
        const totalPercent = studentResults.reduce((sum, r) => {
          return sum + (r.score / r.total_questions) * 100
        }, 0)
        averageScore = totalPercent / totalAttempts
      }

      const lastActivity = studentResults.length > 0
        ? studentResults.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at
        : null

      return {
        id: studentId,
        full_name: profile?.full_name || 'Inconnu',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        total_attempts: totalAttempts,
        sessions_completed: uniqueSessions,
        average_score: averageScore,
        last_activity: lastActivity,
        gender: profile?.gender || null,
        birth_date: profile?.birth_date || null,
        grid: grid[studentId] || {},
      }
    }).sort((a, b) => a.full_name.localeCompare(b.full_name))

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        google_classroom_id: classData.google_classroom_id,
        students: isTeacher ? formattedStudents : [],
        sessions: isTeacher ? (sessions || []).map(s => ({
          id: s.id,
          title: s.title,
          code: s.code,
          exercise_title: s.exercise_title,
          status: s.status,
          created_at: s.created_at,
        })) : [],
        studentCount: formattedStudents.length,
        isTeacher
      }
    })
  } catch (error) {
    console.error('Erreur API class detail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
