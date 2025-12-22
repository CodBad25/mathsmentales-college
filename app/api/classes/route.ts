import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Recuperer les classes du professeur
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, description, google_classroom_id, google_classroom_name, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur recuperation classes:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation' }, { status: 500 })
    }

    return NextResponse.json({ classes: classes || [] })
  } catch (error) {
    console.error('Erreur API classes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
