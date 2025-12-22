import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verifier l'authentification
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const {
      exerciceId,
      exerciceTitle,
      niveau,
      score,
      totalQuestions,
      timeSpent,
      answers,
    } = body

    // Valider les donnees
    if (!exerciceId || typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return NextResponse.json(
        { error: 'Donnees invalides' },
        { status: 400 }
      )
    }

    // Enregistrer le resultat
    const { data, error } = await supabase
      .from('student_results')
      .insert({
        student_id: user.id,
        session_id: null, // Exercice libre, pas de session
        score,
        total_questions: totalQuestions,
        time_spent: Math.round(timeSpent),
        answers: answers || [],
        exercice_id: exerciceId,
        exercice_title: exerciceTitle,
        niveau,
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur sauvegarde resultat:', error)
      // Si la table n'existe pas ou erreur, on retourne quand meme succes
      // pour ne pas bloquer l'utilisateur
      return NextResponse.json({ success: true, saved: false })
    }

    return NextResponse.json({ success: true, saved: true, data })
  } catch (error) {
    console.error('Erreur API results:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verifier l'authentification
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      )
    }

    // Recuperer les resultats de l'utilisateur
    const { data, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('student_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erreur recuperation resultats:', error)
      return NextResponse.json({ results: [] })
    }

    return NextResponse.json({ results: data })
  } catch (error) {
    console.error('Erreur API results:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
