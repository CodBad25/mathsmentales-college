'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

/**
 * Convertit une URL interne MathsMentales en URL /play pour le wrapper auth + tracking.
 * Ex: /mathsmentales/diaporama.html?a=,...  →  /play?mode=diaporama&a=,...
 * Ex: https://domain/mathsmentales/diaporama.html?...  →  /play?mode=diaporama&...
 */
function toPlayUrl(exerciseUrl: string, sessionCode: string | null): string {
  try {
    const url = new URL(exerciseUrl, 'http://localhost')
    const match = url.pathname.match(/\/mathsmentales\/(\w+)\.html/)
    if (!match) return exerciseUrl

    const mode = match[1]
    const params = url.search ? url.search.slice(1) : ''
    let playUrl = `/play?mode=${mode}${params ? '&' + params : ''}`
    if (sessionCode) playUrl += `&session=${sessionCode}`
    return playUrl
  } catch {
    return exerciseUrl
  }
}

/**
 * Fallback : construit l'URL /play depuis les champs individuels de la session.
 * Utilisé uniquement pour les anciennes sessions qui n'ont pas exercise_url.
 */
function buildFallbackPlayUrl(session: SessionData, sessionCode: string | null): string {
  const activityId = session.exercise_file.replace(/^N\d\//, '').replace('.json', '')
  const title = encodeURIComponent(session.title || session.exercise_title)
  const tempo = session.display_duration || 8
  const nbQ = session.nb_questions || 5
  const options = session.selected_options
    ? Object.keys(session.selected_options).join(',')
    : ''
  const q = session.selected_options
    ? Object.entries(session.selected_options)
        .map(([k, v]) => `${k}.${(v as number[]).join(',')}`)
        .join('-')
    : ''

  const globalParams = 'a=,fs=sansSerif,i=nothing,e=nothing,o=no,s=1,so=horizontal,f=false,snd=0'
  const cartParams = `p=0~t=${title}~c=0~o=true~d=normal~at=${tempo}`
  const activityParams = `i=${activityId}~o=${options}~q=${q}~p=~t=${tempo}~n=${nbQ}`

  let url = `/play?mode=diaporama&${globalParams}&${cartParams}_${activityParams}`
  if (sessionCode) url += `&session=${sessionCode}`
  return url
}

interface SessionData {
  id: string
  title: string
  exercise_file: string
  exercise_title: string
  niveau: string
  nb_questions: number
  display_duration: number
  selected_options: Record<string, number[]> | null
  exercise_url: string | null
  class_name: string
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [isStudent, setIsStudent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const getPlayUrl = (s: SessionData, sessionCode: string | null): string => {
    if (s.exercise_url) {
      return toPlayUrl(s.exercise_url, sessionCode)
    }
    return buildFallbackPlayUrl(s, sessionCode)
  }

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch(`/api/sessions/${code}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Session non trouvée')
        setLoading(false)
        return
      }

      setSession(data.session)
      setIsStudent(!!user)

      // Si l'utilisateur est connecté, rediriger vers l'exercice
      if (user && data.session) {
        const url = getPlayUrl(data.session, code)
        window.location.href = url
      }

      setLoading(false)
    } catch {
      setError('Erreur lors du chargement')
      setLoading(false)
    }
  }

  const handleLoginAndPlay = async () => {
    sessionStorage.setItem('mathsmentales_redirect', `/s/${code}`)
    router.push('/auth/login')
  }

  const handlePlayAsGuest = () => {
    if (session) {
      const url = getPlayUrl(session, null)
      window.location.href = url
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement de la session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session introuvable</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">🧮</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MathsMentales</h1>
        </div>

        {/* Session info */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {session?.title || session?.exercise_title}
          </h2>
          <p className="text-gray-600 mb-4">
            {session?.nb_questions} questions de calcul mental
          </p>
          {session?.class_name && (
            <p className="text-sm text-gray-500">
              Classe : {session.class_name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleLoginAndPlay}
            className="w-full flex items-center justify-center gap-3 bg-primary-600 text-white rounded-xl px-6 py-4 font-medium hover:bg-primary-700 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            Se connecter et commencer
          </button>

          <div className="text-center text-gray-500 text-sm">ou</div>

          <button
            onClick={handlePlayAsGuest}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-6 py-4 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Jouer sans compte (résultats non sauvegardés)
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Connecte-toi avec ton compte Google pour que ton professeur puisse voir tes résultats.
        </p>
      </div>
    </div>
  )
}
