import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { listStudents } from '@/lib/google-classroom'

// Forcer le runtime Node.js
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Client admin pour operations privilegiees (peut creer des utilisateurs)
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
    const { courseId, courseName, courseSection } = body

    if (!courseId || !courseName) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // Verifier que l'utilisateur est professeur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, google_access_token, google_refresh_token')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Acces reserve aux professeurs' }, { status: 403 })
    }

    // Verifier si la classe existe deja
    const { data: existingClass } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('google_classroom_id', courseId)
      .single()

    if (existingClass) {
      return NextResponse.json({
        error: 'Cette classe Google Classroom est deja importee',
        classId: existingClass.id
      }, { status: 400 })
    }

    // Creer la classe avec supabaseAdmin pour eviter les problemes de RLS
    const className = courseSection ? `${courseName} - ${courseSection}` : courseName

    const { data: newClass, error: createError } = await supabaseAdmin
      .from('classes')
      .insert({
        name: className,
        description: `Importe depuis Google Classroom`,
        teacher_id: user.id,
        google_classroom_id: courseId,
        google_classroom_name: courseName,
      })
      .select()
      .single()

    if (createError) {
      console.error('Erreur creation classe:', createError)
      return NextResponse.json({ error: 'Erreur lors de la creation de la classe' }, { status: 500 })
    }

    // Importer TOUS les eleves automatiquement
    let studentsImported = 0
    let studentsCreated = 0

    if (profile.google_access_token) {
      try {
        const students = await listStudents(
          profile.google_access_token,
          courseId,
          profile.google_refresh_token || undefined
        )

        for (const student of students) {
          // Chercher l'eleve par email
          let { data: studentProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', student.email)
            .single()

          // Si l'eleve n'existe pas, le creer
          if (!studentProfile) {
            // Creer un profil "placeholder" pour l'eleve
            // Il sera mis a jour quand l'eleve se connectera avec Google
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
              studentsCreated++
            }
          }

          // Ajouter l'eleve a la classe
          if (studentProfile) {
            const { error: joinError } = await supabaseAdmin
              .from('class_students')
              .insert({
                class_id: newClass.id,
                student_id: studentProfile.id
              })

            if (!joinError) {
              studentsImported++
            }
          }
        }
      } catch (err) {
        console.error('Erreur import eleves:', err)
      }
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      studentsImported,
      studentsCreated,
      message: `Classe importee avec ${studentsImported} eleve(s). ${studentsCreated} nouveau(x) compte(s) cree(s).`
    })
  } catch (error) {
    console.error('Erreur import classe:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
