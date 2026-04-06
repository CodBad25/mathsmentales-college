'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ClassInfo {
  id: string
  name: string
  google_classroom_id: string | null
}

function NewSessionContent() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [title, setTitle] = useState('')
  const [exerciseUrl, setExerciseUrl] = useState<string | null>(null)
  const [exerciseTitle, setExerciseTitle] = useState('')
  const [publishToClassroom, setPublishToClassroom] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Si exerciseUrl est dans les params (depuis bridge.js), on l'utilise directement
  useEffect(() => {
    const urlParam = searchParams.get('exerciseUrl')
    const titleParam = searchParams.get('exerciseTitle')
    if (urlParam) {
      // Forcer mode simple (s=1) pour les devoirs maison
      setExerciseUrl(urlParam.replace(/,s=\d,/, ',s=1,'))
      setExerciseTitle(titleParam || 'Exercice MathsMentales')
      setTitle(titleParam || '')
    }
  }, [searchParams])

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes || [])
      }
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !exerciseUrl) {
      setError('Veuillez sélectionner une classe et tester un exercice')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Extraire l'ID d'activité depuis l'URL réelle
      const idMatch = exerciseUrl.match(/_i=(\w+)~/) || exerciseUrl.match(/[&?]i=(\w+)/)
      const activityId = idMatch ? idMatch[1] : 'unknown'
      const niveauMatch = activityId.match(/^(\d)/)

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          title: title || exerciseTitle,
          exerciseFile: `N${niveauMatch?.[1] || '6'}/${activityId}.json`,
          exerciseTitle: exerciseTitle,
          niveau: niveauMatch?.[1] || '',
          nbQuestions: 5,
          displayDuration: 8,
          publishToClassroom,
          selectedOptions: {},
          exerciseUrl,
        })
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création')
        return
      }

      setSuccess(data.message || 'Session créée avec succès !')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      setError('Erreur lors de la création')
    } finally {
      setSubmitting(false)
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

  // Exercice déjà sélectionné (depuis bridge.js ou test dans l'iframe)
  if (exerciseUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/dashboard" className="text-2xl font-bold text-primary-600">MathsMentales</Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Retour au tableau de bord</Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-2">Créer la session</h1>

            {/* Exercice sélectionné */}
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-600 font-medium">Exercice sélectionné</div>
                  <div className="font-bold text-green-800">{exerciseTitle}</div>
                </div>
                <button
                  onClick={() => { setExerciseUrl(null); setExerciseTitle('') }}
                  className="text-green-600 hover:text-green-800 text-sm underline"
                >
                  Changer
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Classe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classe *</label>
                {classes.length === 0 ? (
                  <p className="text-gray-500">
                    Aucune classe. <Link href="/dashboard/classroom" className="text-primary-600 hover:underline">Importez une classe</Link> d&apos;abord.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClass(c.id)}
                        className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          selectedClass === c.id
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{c.name}</div>
                        {c.google_classroom_id && (
                          <div className="text-xs text-gray-400 mt-0.5">Google Classroom</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la session</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={exerciseTitle || 'Titre de la session'}
                  className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Classroom */}
              {classes.find(c => c.id === selectedClass)?.google_classroom_id && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="publishClassroom"
                    checked={publishToClassroom}
                    onChange={(e) => setPublishToClassroom(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <label htmlFor="publishClassroom" className="text-gray-700">
                    Publier dans Google Classroom
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedClass}
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Création en cours...' : 'Créer la session'}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // Pas d'exercice sélectionné → afficher MathsMentales dans un iframe
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">MathsMentales</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Retour au tableau de bord</Link>
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
        <p className="text-amber-800 font-medium">
          Choisissez un exercice ci-dessous, testez-le, puis cliquez &quot;Créer une session&quot; à la fin du diaporama.
        </p>
      </div>

      <iframe
        src="/mathsmentales/index.html"
        className="flex-1 border-none w-full"
        allow="fullscreen"
        title="MathsMentales"
      />
    </div>
  )
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NewSessionContent />
    </Suspense>
  )
}
