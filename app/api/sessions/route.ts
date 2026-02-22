import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { createAssignment } from '@/lib/google-classroom'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Client admin pour operations privilegiees
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
    const { classId, title, exerciseFile, exerciseTitle, niveau, nbQuestions, displayDuration, publishToClassroom, selectedOptions } = body

    if (!classId || !exerciseFile) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // Verifier que l'utilisateur est professeur de cette classe
    const { data: classData } = await supabaseAdmin
      .from('classes')
      .select('id, name, google_classroom_id, teacher_id')
      .eq('id', classId)
      .single()

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Classe non trouvee ou non autorise' }, { status: 403 })
    }

    // Generer un code unique pour la session
    const sessionCode = generateSessionCode()

    // Creer la session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        class_id: classId,
        teacher_id: user.id,
        title: title || exerciseTitle,
        exercise_file: exerciseFile,
        exercise_title: exerciseTitle,
        niveau: niveau,
        nb_questions: nbQuestions || 5,
        display_duration: displayDuration || 8,
        selected_options: selectedOptions || null,
        code: sessionCode,
        status: 'active'
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Erreur creation session:', sessionError)
      return NextResponse.json({ error: 'Erreur lors de la creation de la session' }, { status: 500 })
    }

    // URL directe pour les eleves
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const exerciseUrl = `${baseUrl}/s/${sessionCode}`

    // Publier dans Google Classroom si demande
    let classroomResult = null
    if (publishToClassroom && classData.google_classroom_id) {
      // Recuperer les tokens Google du professeur
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('google_access_token, google_refresh_token')
        .eq('id', user.id)
        .single()

      if (profile?.google_access_token) {
        try {
          classroomResult = await createAssignment(
            profile.google_access_token,
            classData.google_classroom_id,
            title || exerciseTitle,
            `Session de calcul mental - ${nbQuestions || 10} questions\n\nCliquez sur le lien pour commencer l'exercice.`,
            exerciseUrl,
            undefined, // pas de date limite
            undefined, // pas d'heure limite
            profile.google_refresh_token || undefined
          )

          // Mettre a jour la session avec l'ID du devoir Classroom
          await supabaseAdmin
            .from('sessions')
            .update({
              google_coursework_id: classroomResult.id
            })
            .eq('id', session.id)

        } catch (classroomError) {
          console.error('Erreur publication Classroom:', classroomError)
          // On continue meme si la publication echoue
        }
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        url: exerciseUrl
      },
      classroomPublished: !!classroomResult,
      message: classroomResult
        ? 'Session creee et publiee dans Google Classroom!'
        : 'Session creee avec succes!'
    })
  } catch (error) {
    console.error('Erreur API sessions:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Generer un code de session court et unique
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Recuperer les sessions du professeur
    const { data: sessions, error } = await supabaseAdmin
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
        classes (
          id,
          name
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur recuperation sessions:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation' }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Erreur API sessions GET:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
