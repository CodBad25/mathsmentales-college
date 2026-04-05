import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Client admin : contourne le RLS pour lire les classes.
// Sécurisé car l'authentification est vérifiée via getUser() et les requêtes
// sont toujours filtrées par teacher_id = user.id.
// TODO: corriger les policies RLS dans Supabase pour pouvoir utiliser le client authentifié
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

    // Recuperer les classes du professeur (via admin pour eviter les problemes RLS)
    const { data: classes, error } = await supabaseAdmin
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
