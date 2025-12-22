'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface SessionResult {
  id: string
  student_name: string
  student_email: string
  score: number
  total_questions: number
  time_spent: number
  completed_at: string
}

interface SessionDetails {
  id: string
  title: string
  exercise_title: string
  niveau: string
  nb_questions: number
  code: string
  status: string
  created_at: string
  class_name: string
  results: SessionResult[]
}

export default function SessionResultsPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/results`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors du chargement')
        return
      }

      setSession(data.session)
    } catch (err) {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session non trouvee'}</p>
          <Link href="/dashboard" className="text-primary-600 hover:underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const averageScore = session.results.length > 0
    ? Math.round(session.results.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / session.results.length)
    : 0

  const averageTime = session.results.length > 0
    ? Math.round(session.results.reduce((sum, r) => sum + r.time_spent, 0) / session.results.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            MathsMentales
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Retour au tableau de bord
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* En-tete session */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <p className="text-gray-600">{session.class_name}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-primary-100 text-primary-800 px-4 py-2 rounded-lg font-mono text-lg">
                {session.code}
              </div>
              <p className="text-sm text-gray-500 mt-1">Code de session</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{session.results.length}</div>
              <div className="text-sm text-gray-500">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{averageScore}%</div>
              <div className="text-sm text-gray-500">Moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{averageTime}s</div>
              <div className="text-sm text-gray-500">Temps moyen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{session.nb_questions}</div>
              <div className="text-sm text-gray-500">Questions</div>
            </div>
          </div>
        </div>

        {/* Lien de partage */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">Lien a partager avec les eleves:</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/s/${session.code}`}
              className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${session.code}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-all"
            >
              Copier
            </button>
          </div>
        </div>

        {/* Resultats */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Resultats des eleves</h2>
          </div>

          {session.results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun resultat pour le moment. Les eleves n&apos;ont pas encore complete l&apos;exercice.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Eleve</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Score</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Temps</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {session.results.map((result) => {
                  const percentage = Math.round((result.score / result.total_questions) * 100)
                  return (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{result.student_name}</div>
                        <div className="text-sm text-gray-500">{result.student_email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          percentage >= 80 ? 'text-green-600' :
                          percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {result.score}/{result.total_questions}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">({percentage}%)</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {result.time_spent}s
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-sm">
                        {new Date(result.completed_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
