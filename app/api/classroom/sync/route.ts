import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { listStudents } from '@/lib/google-classroom'

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
    const { classId } = body

    if (!classId) {
      return NextResponse.json({ error: 'ID de classe manquant' }, { status: 400 })
    }

    // Récupérer la classe et vérifier que l'utilisateur est le professeur
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, google_classroom_id, teacher_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 })
    }

    if (classData.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (!classData.google_classroom_id) {
      return NextResponse.json({ error: 'Cette classe n\'est pas liée à Google Classroom' }, { status: 400 })
    }

    // Récupérer les tokens Google du professeur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('id', user.id)
      .single()

    if (!profile?.google_access_token) {
      return NextResponse.json({ error: 'Token Google manquant. Reconnectez-vous.' }, { status: 401 })
    }

    // Récupérer les élèves depuis Google Classroom
    let students
    try {
      students = await listStudents(
        profile.google_access_token,
        classData.google_classroom_id,
        profile.google_refresh_token || undefined
      )
    } catch (err) {
      console.error('Erreur récupération élèves Google:', err)
      return NextResponse.json({ error: 'Erreur lors de la récupération des élèves depuis Google Classroom' }, { status: 500 })
    }

    let studentsAdded = 0
    let studentsExisting = 0
    let profilesCreated = 0

    for (const student of students) {
      // Chercher ou créer le profil de l'élève
      let { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', student.email)
        .single()

      if (!studentProfile) {
        // Créer le profil
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            email: student.email,
            full_name: student.name,
            avatar_url: student.photoUrl || null,
            role: 'student',
          })
          .select()
          .single()

        if (!profileError && newProfile) {
          studentProfile = newProfile
          profilesCreated++
        }
      }

      if (studentProfile) {
        // Vérifier si l'élève est déjà dans la classe
        const { data: existing } = await supabaseAdmin
          .from('class_students')
          .select('id')
          .eq('class_id', classId)
          .eq('student_id', studentProfile.id)
          .single()

        if (existing) {
          studentsExisting++
        } else {
          // Ajouter l'élève à la classe
          const { error: joinError } = await supabaseAdmin
            .from('class_students')
            .insert({
              class_id: classId,
              student_id: studentProfile.id
            })

          if (!joinError) {
            studentsAdded++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalFromGoogle: students.length,
      studentsAdded,
      studentsExisting,
      profilesCreated,
      message: `Synchronisation terminée: ${studentsAdded} élève(s) ajouté(s), ${studentsExisting} déjà présent(s), ${profilesCreated} nouveau(x) compte(s) créé(s).`
    })
  } catch (error) {
    console.error('Erreur sync élèves:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
