'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface SessionData {
  id: string
  title: string
  exercise_file: string
  exercise_title: string
  niveau: string
  nb_questions: number
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
  }, [code])

  const loadSession = async () => {
    try {
      // Verifier si l'utilisateur est connecte
      const { data: { user } } = await supabase.auth.getUser()

      // Charger la session par code
      const res = await fetch(`/api/sessions/${code}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Session non trouvee')
        setLoading(false)
        return
      }

      setSession(data.session)
      setIsStudent(!!user)

      // Si l'utilisateur est connecte, rediriger vers l'exercice avec le contexte de session
      if (user && data.session) {
        // Stocker le contexte de session pour sauvegarder les resultats
        sessionStorage.setItem('mathsmentales_session', JSON.stringify({
          sessionId: data.session.id,
          sessionCode: code,
          studentId: user.id
        }))

        // Rediriger vers le player (iframe original)
        router.push(`/play?session=${code}`)
      }

      setLoading(false)
    } catch (err) {
      setError('Erreur lors du chargement')
      setLoading(false)
    }
  }

  const handleLoginAndPlay = async () => {
    // Stocker le code de session pour apres la connexion
    sessionStorage.setItem('mathsmentales_redirect', `/s/${code}`)

    // Rediriger vers la connexion
    router.push('/auth/login')
  }

  const handlePlayAsGuest = () => {
    if (session) {
      router.push(`/play`)
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
            Retour a l&apos;accueil
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
              Classe: {session.class_name}
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
