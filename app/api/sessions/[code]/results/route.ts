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
  { params }: { params: { code: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { code } = params

    // Le code peut etre soit un UUID (id) soit un code de session
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)

    // Recuperer la session
    let query = supabaseAdmin
      .from('sessions')
      .select(`
        id,
        title,
        exercise_title,
        niveau,
        nb_questions,
        code,
        status,
        created_at,
        teacher_id,
        classes (
          id,
          name
        )
      `)

    if (isUUID) {
      query = query.eq('id', code)
    } else {
      query = query.eq('code', code.toUpperCase())
    }

    const { data: session, error: sessionError } = await query.single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvee' }, { status: 404 })
    }

    // Verifier que l'utilisateur est le professeur de cette session
    if (session.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 })
    }

    // Recuperer les resultats avec les infos des eleves
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('session_results')
      .select(`
        id,
        score,
        total_questions,
        time_spent,
        completed_at,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('session_id', session.id)
      .order('completed_at', { ascending: false })

    if (resultsError) {
      console.error('Erreur recuperation resultats:', resultsError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation' }, { status: 500 })
    }

    // Extraire le nom de la classe (peut etre un objet ou un tableau)
    const classData = session.classes as { id: string; name: string } | { id: string; name: string }[] | null
    const className = Array.isArray(classData) ? classData[0]?.name : classData?.name

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        exercise_title: session.exercise_title,
        niveau: session.niveau,
        nb_questions: session.nb_questions,
        code: session.code,
        status: session.status,
        created_at: session.created_at,
        class_name: className,
        results: (results || []).map(r => {
          const profile = r.profiles as { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null
          const profileData = Array.isArray(profile) ? profile[0] : profile
          return {
            id: r.id,
            student_name: profileData?.full_name || 'Inconnu',
            student_email: profileData?.email || '',
            score: r.score,
            total_questions: r.total_questions,
            time_spent: r.time_spent,
            completed_at: r.completed_at
          }
        })
      }
    })
  } catch (error) {
    console.error('Erreur API session results:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
