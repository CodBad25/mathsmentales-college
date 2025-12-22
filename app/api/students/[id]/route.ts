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

    // Récupérer le profil de l'élève
    const { data: student, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
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
      .select('id, title')
      .in('class_id', classIds)

    const sessionMap = new Map((sessions || []).map(s => [s.id, s.title]))
    const sessionIds = Array.from(sessionMap.keys())

    // Récupérer les résultats de l'élève
    let results: any[] = []
    if (sessionIds.length > 0) {
      const { data: studentResults } = await supabaseAdmin
        .from('session_results')
        .select('id, session_id, score, total_questions, time_spent, completed_at')
        .eq('student_id', id)
        .in('session_id', sessionIds)
        .order('completed_at', { ascending: false })

      results = (studentResults || []).map(r => ({
        id: r.id,
        session_title: sessionMap.get(r.session_id) || 'Session',
        score: r.score,
        total_questions: r.total_questions,
        time_spent: r.time_spent,
        completed_at: r.completed_at
      }))
    }

    // Calculer les statistiques
    const totalSessions = results.length
    let averageScore = 0
    let totalTime = 0
    let bestScore = 0

    if (totalSessions > 0) {
      const scores = results.map(r => (r.score / r.total_questions) * 100)
      averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
      bestScore = Math.max(...scores)
      totalTime = results.reduce((sum, r) => sum + r.time_spent, 0)
    }

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
        classes,
        results,
        stats: {
          total_sessions: totalSessions,
          average_score: averageScore,
          total_time: totalTime,
          best_score: Math.round(bestScore)
        }
      }
    })
  } catch (error) {
    console.error('Erreur API student detail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
