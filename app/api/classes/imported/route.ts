import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Récupérer les classes du professeur qui sont liées à Google Classroom
    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('id, name, google_classroom_id')
      .eq('teacher_id', user.id)
      .not('google_classroom_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération classes:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
    }

    // Pour chaque classe, compter les élèves
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (c) => {
        const { count } = await supabaseAdmin
          .from('class_students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', c.id)

        return {
          id: c.id,
          name: c.name,
          google_classroom_id: c.google_classroom_id,
          student_count: count || 0
        }
      })
    )

    return NextResponse.json({ classes: classesWithCounts })
  } catch (error) {
    console.error('Erreur API classes imported:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
