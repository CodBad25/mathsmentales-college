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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = params

    // Récupérer le profil de l'élève
    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, avatar_url, gender, birth_date')
      .eq('id', id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Élève non trouvé' }, { status: 404 })
    }

    // Vérifier que le professeur a accès à cet élève (via une classe commune)
    const { data: teacherClasses } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)

    const teacherClassIds = (teacherClasses || []).map(c => c.id)

    const { data: studentClasses } = await supabaseAdmin
      .from('class_students')
      .select('class_id, classes(id, name)')
      .eq('student_id', id)
      .in('class_id', teacherClassIds)

    if (!studentClasses || studentClasses.length === 0) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Récupérer les sessions de ces classes
    const classIds = studentClasses.map(sc => sc.class_id)
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id, title, class_id, created_at')
      .in('class_id', classIds)
      .order('created_at', { ascending: true })

    const sessionMap = new Map((sessions || []).map(s => [s.id, s]))
    const sessionIds = Array.from(sessionMap.keys())

    // Récupérer TOUS les résultats de sessions assignées (tentatives multiples)
    let sessionResults: any[] = []
    if (sessionIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('session_results')
        .select('id, session_id, score, total_questions, time_spent, completed_at')
        .eq('student_id', id)
        .in('session_id', sessionIds)
        .order('completed_at', { ascending: false })

      sessionResults = data || []
    }

    // Grouper par session pour voir la progression
    const sessionGroups: Record<string, any[]> = {}
    for (const r of sessionResults) {
      if (!sessionGroups[r.session_id]) sessionGroups[r.session_id] = []
      sessionGroups[r.session_id].push(r)
    }

    const formattedSessionResults = Object.entries(sessionGroups).map(([sessionId, attempts]) => {
      const sess = sessionMap.get(sessionId)
      const scores = attempts.map(a => (a.score / a.total_questions) * 100)
      const bestScore = Math.max(...scores)
      const lastScore = scores[0] // already sorted desc
      const firstScore = scores[scores.length - 1]

      return {
        session_id: sessionId,
        session_title: sess?.title || 'Session',
        attempts: attempts.length,
        best_score: Math.round(bestScore),
        last_score: Math.round(lastScore),
        first_score: Math.round(firstScore),
        progression: Math.round(lastScore - firstScore),
        total_time: attempts.reduce((sum, a) => sum + (a.time_spent || 0), 0),
        last_completed: attempts[0].completed_at,
        details: attempts.map(a => ({
          score: a.score,
          total_questions: a.total_questions,
          time_spent: a.time_spent,
          completed_at: a.completed_at,
        })),
      }
    }).sort((a, b) => new Date(b.last_completed).getTime() - new Date(a.last_completed).getTime())

    // Récupérer les exercices autonomes (student_results)
    const { data: autonomousResults } = await supabaseAdmin
      .from('student_results')
      .select('id, exercice_id, exercice_title, niveau, score, total_questions, time_spent, completed_at')
      .eq('student_id', id)
      .order('completed_at', { ascending: false })
      .limit(100)

    // Calculer les stats globales
    const allScores = sessionResults.map(r => (r.score / r.total_questions) * 100)
    const autonomousScores = (autonomousResults || []).map(r => (r.score / r.total_questions) * 100)
    const combinedScores = [...allScores, ...autonomousScores]

    const totalAttempts = sessionResults.length
    const uniqueSessions = new Set(sessionResults.map(r => r.session_id)).size
    const totalAutonomous = (autonomousResults || []).length
    const averageScore = combinedScores.length > 0
      ? combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length
      : 0
    const bestScore = combinedScores.length > 0 ? Math.max(...combinedScores) : 0
    const totalTime = sessionResults.reduce((sum, r) => sum + (r.time_spent || 0), 0)
      + (autonomousResults || []).reduce((sum, r) => sum + (r.time_spent || 0), 0)

    // Timeline : combiner sessions + autonomes, triées par date
    const lastActivity = [...sessionResults, ...(autonomousResults || [])]
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]?.completed_at || null

    // Formatter les classes
    const classes = studentClasses.map(sc => {
      const classData = sc.classes as any
      return {
        id: Array.isArray(classData) ? classData[0]?.id : classData?.id,
        name: Array.isArray(classData) ? classData[0]?.name : classData?.name
      }
    }).filter(c => c.id && c.name)

    return NextResponse.json({
      student: {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        avatar_url: student.avatar_url,
        gender: student.gender,
        birth_date: student.birth_date,
        classes,
        session_results: formattedSessionResults,
        autonomous_results: (autonomousResults || []).map(r => ({
          id: r.id,
          exercice_id: r.exercice_id,
          exercice_title: r.exercice_title,
          niveau: r.niveau,
          score: r.score,
          total_questions: r.total_questions,
          percentage: Math.round((r.score / r.total_questions) * 100),
          time_spent: r.time_spent,
          completed_at: r.completed_at,
        })),
        stats: {
          total_attempts: totalAttempts,
          unique_sessions: uniqueSessions,
          total_autonomous: totalAutonomous,
          average_score: Math.round(averageScore),
          best_score: Math.round(bestScore),
          total_time: totalTime,
          last_activity: lastActivity,
        }
      }
    })
  } catch (error) {
    console.error('Erreur API student detail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
