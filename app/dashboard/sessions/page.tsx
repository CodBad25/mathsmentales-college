'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  exercise_title: string
  niveau: string
  nb_questions: number
  code: string
  status: string
  created_at: string
  classes: {
    id: string
    name: string
  }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors du chargement')
        return
      }

      setSessions(data.sessions || [])
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mes sessions</h1>
          <Link
            href="/dashboard/sessions/new"
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
          >
            + Nouvelle session
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">Aucune session</h2>
            <p className="text-gray-600 mb-6">
              Créez votre première session pour commencer à évaluer vos élèves.
            </p>
            <Link
              href="/dashboard/sessions/new"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
            >
              Créer une session
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/sessions/${session.id}`}
                className="block bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold mb-1">{session.title}</h2>
                    <p className="text-gray-600 text-sm mb-2">
                      {session.classes?.name} - {session.niveau}eme
                    </p>
                    <p className="text-gray-500 text-sm">
                      {session.nb_questions} questions
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-primary-100 text-primary-800 px-3 py-1 rounded-lg font-mono">
                      {session.code}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(session.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
