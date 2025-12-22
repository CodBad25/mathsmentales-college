'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GoogleCourse {
  id: string
  name: string
  section: string
  room: string
  color: string
}

interface ImportedClass {
  id: string
  name: string
  google_classroom_id: string
  student_count: number
}

export default function ClassroomPage() {
  const [courses, setCourses] = useState<GoogleCourse[]>([])
  const [importedClasses, setImportedClasses] = useState<ImportedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Charger les classes Google Classroom disponibles
      const coursesRes = await fetch('/api/classroom/courses')
      const coursesData = await coursesRes.json()

      if (!coursesRes.ok) {
        if (coursesData.needsReauth) {
          setNeedsReauth(true)
          setError(coursesData.error)
        } else {
          setError(coursesData.error || 'Erreur lors du chargement')
        }
      } else {
        setCourses(coursesData.courses || [])
      }

      // Charger les classes déjà importées
      const classesRes = await fetch('/api/classes/imported')
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setImportedClasses(classesData.classes || [])
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const importCourse = async (course: GoogleCourse) => {
    setImporting(course.id)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/classroom/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          courseName: course.name,
          courseSection: course.section
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'import')
        return
      }

      setSuccess(`Classe "${course.name}" importee avec succes! ${data.studentsImported} eleve(s) ajoute(s).`)

      // Retirer la classe de la liste et recharger
      setCourses(prev => prev.filter(c => c.id !== course.id))
      loadData()
    } catch (err) {
      setError('Erreur lors de l\'import')
    } finally {
      setImporting(null)
    }
  }

  const syncClass = async (classItem: ImportedClass) => {
    setSyncing(classItem.id)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/classroom/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: classItem.id })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la synchronisation')
        return
      }

      setSuccess(data.message)
      loadData() // Recharger pour mettre à jour le compteur
    } catch (err) {
      setError('Erreur lors de la synchronisation')
    } finally {
      setSyncing(null)
    }
  }

  const handleReauth = () => {
    // Rediriger vers la page de login pour se reconnecter
    router.push('/auth/login?reauth=classroom')
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
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">🔗</div>
            <div>
              <h1 className="text-2xl font-bold">Google Classroom</h1>
              <p className="text-gray-600">Importez vos classes depuis Google Classroom</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              {needsReauth && (
                <button
                  onClick={handleReauth}
                  className="mt-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Se reconnecter avec Google
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de vos classes Google Classroom...</p>
            </div>
          ) : courses.length === 0 && !error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">
                Aucune classe Google Classroom a importer.
              </p>
              <p className="text-sm text-gray-500">
                Toutes vos classes ont deja ete importees, ou vous n&apos;avez pas de classes actives dans Google Classroom.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Selectionnez les classes a importer :
              </p>

              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  style={{ borderLeftColor: course.color, borderLeftWidth: '4px' }}
                >
                  <div>
                    <h3 className="font-semibold">{course.name}</h3>
                    {course.section && (
                      <p className="text-sm text-gray-600">{course.section}</p>
                    )}
                    {course.room && (
                      <p className="text-xs text-gray-500">Salle: {course.room}</p>
                    )}
                  </div>

                  <button
                    onClick={() => importCourse(course)}
                    disabled={importing === course.id}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing === course.id ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Import...
                      </span>
                    ) : (
                      'Importer'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Classes déjà importées */}
          {importedClasses.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h2 className="font-semibold mb-4">Classes importées</h2>
              <div className="space-y-3">
                {importedClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-green-800">{classItem.name}</h3>
                      <p className="text-sm text-green-600">
                        {classItem.student_count} élève(s) synchronisé(s)
                      </p>
                    </div>
                    <button
                      onClick={() => syncClass(classItem)}
                      disabled={syncing === classItem.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {syncing === classItem.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sync...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Synchroniser
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <h2 className="font-semibold mb-2">Comment ca marche ?</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1. Selectionnez une classe Google Classroom a importer</li>
              <li>2. La classe sera creee dans MathsMentales avec un code de partage</li>
              <li>3. Les eleves deja inscrits seront automatiquement ajoutes</li>
              <li>4. Utilisez le bouton &quot;Synchroniser&quot; pour mettre a jour la liste des eleves</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
