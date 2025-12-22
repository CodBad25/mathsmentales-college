import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionCode, score, totalQuestions, timeSpent, details } = body

    if (!sessionCode || score === undefined || !totalQuestions) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // Trouver la session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, class_id')
      .eq('code', sessionCode.toUpperCase())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvee' }, { status: 404 })
    }

    // Verifier que l'eleve fait partie de la classe
    const { data: membership } = await supabaseAdmin
      .from('class_students')
      .select('id')
      .eq('class_id', session.class_id)
      .eq('student_id', user.id)
      .single()

    // On enregistre quand meme les resultats meme si l'eleve n'est pas dans la classe
    // (le prof pourra voir qui a fait l'exercice)

    // Sauvegarder ou mettre a jour le resultat
    const { data: existingResult } = await supabaseAdmin
      .from('session_results')
      .select('id, score')
      .eq('session_id', session.id)
      .eq('student_id', user.id)
      .single()

    if (existingResult) {
      // Mettre a jour uniquement si meilleur score
      if (score > existingResult.score) {
        await supabaseAdmin
          .from('session_results')
          .update({
            score,
            total_questions: totalQuestions,
            time_spent: timeSpent,
            details,
            completed_at: new Date().toISOString()
          })
          .eq('id', existingResult.id)
      }
    } else {
      // Creer nouveau resultat
      await supabaseAdmin
        .from('session_results')
        .insert({
          session_id: session.id,
          student_id: user.id,
          score,
          total_questions: totalQuestions,
          time_spent: timeSpent,
          details
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Resultat enregistre!',
      isClassMember: !!membership
    })
  } catch (error) {
    console.error('Erreur API session results:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
