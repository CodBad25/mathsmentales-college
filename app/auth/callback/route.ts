import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name)
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user && data.session) {
      // Recuperer les tokens Google pour l'API Classroom
      const providerToken = data.session.provider_token
      const providerRefreshToken = data.session.provider_refresh_token

      // Verifier si le profil existe deja
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      // Si le profil n'existe pas, creer un nouveau profil
      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata.full_name || data.user.user_metadata.name,
          avatar_url: data.user.user_metadata.avatar_url || data.user.user_metadata.picture,
          role: 'student',
          google_access_token: providerToken || null,
          google_refresh_token: providerRefreshToken || null,
        })
      } else {
        // Mettre a jour les tokens Google
        await supabase
          .from('profiles')
          .update({
            google_access_token: providerToken || null,
            google_refresh_token: providerRefreshToken || null,
          })
          .eq('id', data.user.id)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Si erreur, rediriger vers login avec message d'erreur
  return NextResponse.redirect(`${origin}/auth/login?error=authentication_failed`)
}
