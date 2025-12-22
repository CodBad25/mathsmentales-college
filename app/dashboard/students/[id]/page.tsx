'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SessionResult {
  id: string
  session_title: string
  score: number
  total_questions: number
  time_spent: number
  completed_at: string
}

interface StudentDetails {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  classes: { id: string; name: string }[]
  results: SessionResult[]
  stats: {
    total_sessions: number
    average_score: number
    total_time: number
    best_score: number
  }
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStudent()
  }, [studentId])

  const loadStudent = async () => {
    try {
      const res = await fetch(`/api/students/${studentId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Élève non trouvé')
        return
      }

      setStudent(data.student)
    } catch (err) {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Élève non trouvé'}</p>
          <button onClick={() => router.back()} className="text-primary-600 hover:underline">
            Retour
          </button>
        </div>
      </div>
    )
  }

  const initials = student.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            MathsMentales
          </Link>
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            Retour
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profil élève */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-6">
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt={student.full_name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-2xl">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{student.full_name}</h1>
              <p className="text-gray-600">{student.email}</p>
              <div className="mt-2 flex gap-2">
                {student.classes.map(c => (
                  <Link
                    key={c.id}
                    href={`/dashboard/classes/${c.id}`}
                    className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary-600">
              {student.stats.total_sessions}
            </div>
            <div className="text-sm text-gray-500">Sessions</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className={`text-3xl font-bold ${
              student.stats.average_score >= 80 ? 'text-green-600' :
              student.stats.average_score >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(student.stats.average_score)}%
            </div>
            <div className="text-sm text-gray-500">Moyenne</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(student.stats.total_time / 60)}m
            </div>
            <div className="text-sm text-gray-500">Temps total</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {student.stats.best_score}%
            </div>
            <div className="text-sm text-gray-500">Meilleur score</div>
          </div>
        </div>

        {/* Historique des sessions */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Historique des sessions</h2>
          </div>

          {student.results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune session complétée pour le moment.
            </div>
          ) : (
            <div className="divide-y">
              {student.results.map((result) => {
                const percentage = Math.round((result.score / result.total_questions) * 100)
                return (
                  <div key={result.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{result.session_title}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(result.completed_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          percentage >= 80 ? 'text-green-600' :
                          percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {result.score}/{result.total_questions}
                        </div>
                        <div className="text-sm text-gray-500">
                          {result.time_spent}s
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
