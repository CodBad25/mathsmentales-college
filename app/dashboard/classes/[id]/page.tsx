'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface StudentStats {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  sessions_completed: number
  average_score: number
  last_activity: string | null
}

interface ClassDetails {
  id: string
  name: string
  google_classroom_id: string | null
  students: StudentStats[]
}

export default function ClassDetailPage() {
  const params = useParams()
  const classId = params.id as string
  const [classData, setClassData] = useState<ClassDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClass()
  }, [classId])

  const loadClass = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Classe non trouvée')
        return
      }

      setClassData(data.class)
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

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Classe non trouvée'}</p>
          <Link href="/dashboard" className="text-primary-600 hover:underline">
            Retour au tableau de bord
          </Link>
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{classData.name}</h1>
              <p className="text-gray-600">{classData.students.length} élève(s)</p>
            </div>
            {classData.google_classroom_id && (
              <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                Google Classroom
              </span>
            )}
          </div>
        </div>

        {/* Liste des élèves en cartes */}
        <div className="mb-4">
          <h2 className="font-bold text-lg">Élèves ({classData.students.length})</h2>
        </div>

        {classData.students.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            Aucun élève dans cette classe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classData.students.map((student) => {
              const initials = student.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              const scoreColor = student.average_score >= 80
                ? 'text-green-600 bg-green-100'
                : student.average_score >= 50
                ? 'text-yellow-600 bg-yellow-100'
                : student.average_score > 0
                ? 'text-red-600 bg-red-100'
                : 'text-gray-400 bg-gray-100'

              return (
                <Link
                  key={student.id}
                  href={`/dashboard/students/${student.id}`}
                  className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-200"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {student.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-3">
                    {student.sessions_completed > 0 ? (
                      <>
                        <div className={`px-2 py-1 rounded-lg text-sm font-medium ${scoreColor}`}>
                          {Math.round(student.average_score)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.sessions_completed} session{student.sessions_completed > 1 ? 's' : ''}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400 italic">
                        Aucune activité
                      </div>
                    )}
                  </div>

                  {/* Dernière activité */}
                  {student.last_activity && (
                    <div className="mt-2 text-xs text-gray-400">
                      Dernière activité : {new Date(student.last_activity).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex gap-4">
          <Link
            href={`/dashboard/sessions/new?classId=${classId}`}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
          >
            Créer une session pour cette classe
          </Link>
        </div>
      </main>
    </div>
  )
}
