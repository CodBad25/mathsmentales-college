import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { listCourses } from '@/lib/google-classroom'

// Forcer le runtime Node.js (googleapis ne fonctionne pas en Edge)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Client admin pour lire les tokens
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

    // Recuperer le profil avec les tokens Google (via admin)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_access_token, google_refresh_token, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil non trouve' }, { status: 404 })
    }

    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Acces reserve aux professeurs' }, { status: 403 })
    }

    if (!profile.google_access_token) {
      return NextResponse.json({
        error: 'Compte Google non connecte. Reconnectez-vous pour autoriser Google Classroom.',
        needsReauth: true
      }, { status: 400 })
    }

    // Appeler l'API Google Classroom
    const courses = await listCourses(
      profile.google_access_token,
      profile.google_refresh_token || undefined
    )

    return NextResponse.json({ courses })
  } catch (error: any) {
    console.error('Erreur API Classroom:', error)

    // Si token expire, demander reconnexion
    if (error.message?.includes('invalid_grant') || error.message?.includes('Token')) {
      return NextResponse.json({
        error: 'Session Google expiree. Reconnectez-vous.',
        needsReauth: true
      }, { status: 401 })
    }

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
