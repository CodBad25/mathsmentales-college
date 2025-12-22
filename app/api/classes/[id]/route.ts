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
          avatar_url
        )
      `)
      .eq('class_id', id)

    if (studentsError) {
      console.error('Erreur récupération élèves:', studentsError)
    }

    // Récupérer les sessions de cette classe
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('class_id', id)

    const sessionIds = (sessions || []).map(s => s.id)

    // Récupérer les résultats pour ces sessions
    let allResults: any[] = []
    if (sessionIds.length > 0) {
      const { data: results } = await supabaseAdmin
        .from('session_results')
        .select('student_id, score, total_questions, completed_at')
        .in('session_id', sessionIds)
      allResults = results || []
    }

    // Formatter les élèves avec leurs stats
    const formattedStudents = (students || []).map(s => {
      const profileData = s.profiles as any
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      const studentId = profile?.id || ''

      // Calculer les stats pour cet élève
      const studentResults = allResults.filter(r => r.student_id === studentId)
      const sessionsCompleted = studentResults.length

      let averageScore = 0
      if (sessionsCompleted > 0) {
        const totalPercent = studentResults.reduce((sum, r) => {
          return sum + (r.score / r.total_questions) * 100
        }, 0)
        averageScore = totalPercent / sessionsCompleted
      }

      const lastActivity = studentResults.length > 0
        ? studentResults.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at
        : null

      return {
        id: studentId,
        full_name: profile?.full_name || 'Inconnu',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        sessions_completed: sessionsCompleted,
        average_score: averageScore,
        last_activity: lastActivity
      }
    }).sort((a, b) => a.full_name.localeCompare(b.full_name))

    // Pour les élèves, ne pas renvoyer la liste complète des autres élèves
    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        google_classroom_id: classData.google_classroom_id,
        students: isTeacher ? formattedStudents : [],
        studentCount: formattedStudents.length,
        isTeacher
      }
    })
  } catch (error) {
    console.error('Erreur API class detail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
