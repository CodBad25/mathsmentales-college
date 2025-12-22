import { createClient } from '@supabase/supabase-js'
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
    const { code } = params

    if (!code) {
      return NextResponse.json({ error: 'Code manquant' }, { status: 400 })
    }

    // Recuperer la session par code
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        title,
        exercise_file,
        exercise_title,
        niveau,
        nb_questions,
        status,
        selected_options,
        classes (
          id,
          name
        )
      `)
      .eq('code', code.toUpperCase())
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session non trouvee' }, { status: 404 })
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Cette session n\'est plus active' }, { status: 410 })
    }

    // Extraire le nom de la classe (peut etre un objet ou un tableau)
    const classData = session.classes as { id: string; name: string } | { id: string; name: string }[] | null
    const className = Array.isArray(classData) ? classData[0]?.name : classData?.name

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        exercise_file: session.exercise_file,
        exercise_title: session.exercise_title,
        niveau: session.niveau,
        nb_questions: session.nb_questions,
        selected_options: session.selected_options,
        class_name: className
      }
    })
  } catch (error) {
    console.error('Erreur API session by code:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
