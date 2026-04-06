'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Exercise {
  u: string
  t: string
  d?: string
  new?: boolean
}

interface ClassInfo {
  id: string
  name: string
  google_classroom_id: string | null
}

interface ContentNiveau {
  nom: string
  themes: Record<string, {
    nom: string
    chapitres: Record<string, {
      n: string
      e: Exercise[]
    }>
  }>
}

const niveaux = [
  { id: '6', nom: '6ème' },
  { id: '5', nom: '5ème' },
  { id: '4', nom: '4ème' },
  { id: '3', nom: '3ème' },
]

function NewSessionContent() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [content, setContent] = useState<Record<string, ContentNiveau> | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedNiveau, setSelectedNiveau] = useState<string>('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [title, setTitle] = useState('')
  const [nbQuestions, setNbQuestions] = useState(5)
  const [displayDuration, setDisplayDuration] = useState(30)
  const [publishToClassroom, setPublishToClassroom] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

  // Si exerciseUrl vient de bridge.js
  const [prefilledExerciseUrl, setPrefilledExerciseUrl] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlParam = searchParams.get('exerciseUrl')
    const titleParam = searchParams.get('exerciseTitle')
    if (urlParam) {
      setPrefilledExerciseUrl(urlParam.replace(/,s=\d,/, ',s=1,'))
      const idMatch = urlParam.match(/_i=(\w+)~/) || urlParam.match(/[&?]i=(\w+)/)
      const activityId = idMatch ? idMatch[1] : 'unknown'
      const niveauMatch = activityId.match(/^(\d)/)
      if (niveauMatch) setSelectedNiveau(niveauMatch[1])
      setSelectedExercise({ u: `N${niveauMatch?.[1] || '6'}/${activityId}.json`, t: titleParam || 'Exercice MathsMentales' })
      setTitle(titleParam || '')
    }
  }, [searchParams])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const classesRes = await fetch('/api/classes')
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData.classes || [])
      }
      const contentRes = await fetch('/library/content.json')
      if (contentRes.ok) {
        const contentData = await contentRes.json()
        setContent(contentData)
      }
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const selectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    if (!title) setTitle(exercise.t)
    setPrefilledExerciseUrl(null) // On utilise le catalogue, pas bridge.js
  }

  const buildExerciseUrl = () => {
    if (!selectedExercise) return ''
    const activityId = selectedExercise.u.replace(/^N\d+\//, '').replace('.json', '')
    const exerciseTitle = encodeURIComponent(title || selectedExercise.t)
    const globalParams = 'a=,fs=serif,i=321,e=correction,o=no,s=1,so=h,f=n,colors=,snd=null'
    const cartParams = `p=0~t=${exerciseTitle}~c=1~o=true~d=normal~at=${displayDuration}`
    const activityParams = `i=${activityId}~o=~q=~p=~t=${displayDuration}~n=${nbQuestions}`
    return `/mathsmentales/diaporama.html?${globalParams}&${cartParams}_${activityParams}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass || !selectedExercise) {
      setError('Veuillez sélectionner une classe et un exercice')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const exerciseUrl = prefilledExerciseUrl || buildExerciseUrl()

      const idMatch = exerciseUrl.match(/_i=(\w+)~/)
      const activityId = idMatch ? idMatch[1] : selectedExercise.u.replace(/^N\d+\//, '').replace('.json', '')

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          title: title || selectedExercise.t,
          exerciseFile: selectedExercise.u,
          exerciseTitle: selectedExercise.t,
          niveau: selectedNiveau,
          nbQuestions,
          displayDuration,
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

  const niveauData = selectedNiveau && content ? content[selectedNiveau] : null

  // Recherche cross-niveau
  const crossNiveauResults: { niveau: string; niveauNom: string; exercise: Exercise }[] = []
  if (searchQuery.length >= 2 && content) {
    for (const [niv, nivData] of Object.entries(content)) {
      if (selectedNiveau && niv === selectedNiveau) continue
      const nivLabel = niveaux.find(n => n.id === niv)?.nom || `${niv}ème`
      for (const theme of Object.values(nivData.themes)) {
        for (const chap of Object.values(theme.chapitres)) {
          for (const ex of chap.e) {
            if (
              ex.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (ex.d && ex.d.toLowerCase().includes(searchQuery.toLowerCase()))
            ) {
              crossNiveauResults.push({ niveau: niv, niveauNom: nivLabel, exercise: ex })
            }
          }
        }
      }
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
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">MathsMentales</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Retour au tableau de bord</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Nouvelle session</h1>
          <p className="text-gray-600 mb-6">Choisissez un exercice et assignez-le à une classe</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
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

            {/* Niveau */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau *</label>
              <div className="flex gap-2">
                {niveaux.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => { setSelectedNiveau(n.id); setSelectedExercise(null) }}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      selectedNiveau === n.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {n.nom}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercice */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exercice *</label>

              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un exercice dans tous les niveaux..."
                  className="w-full py-2 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              {selectedExercise && (
                <div className="mb-3 p-3 bg-primary-50 border-2 border-primary-500 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-primary-700">{selectedExercise.t}</div>
                      {selectedExercise.d && <div className="text-sm text-primary-600">{selectedExercise.d}</div>}
                    </div>
                    <button type="button" onClick={() => setSelectedExercise(null)} className="text-primary-600 hover:text-primary-800">
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Résultats cross-niveau */}
              {crossNiveauResults.length > 0 && (
                <div className="mb-3 border-2 border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Résultats dans d&apos;autres niveaux
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {crossNiveauResults.map((r, idx) => (
                      <button
                        key={`cross-${r.exercise.u}-${idx}`}
                        type="button"
                        onClick={() => { setSelectedNiveau(r.niveau); selectExercise(r.exercise) }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-all border-t first:border-t-0 ${
                          selectedExercise?.u === r.exercise.u ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium">{r.niveauNom}</span>
                          <span className="font-medium text-sm">{r.exercise.t}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!niveauData && searchQuery.length >= 2 && crossNiveauResults.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Aucun exercice trouvé pour &quot;{searchQuery}&quot;
                </div>
              )}

              {!niveauData && !searchQuery && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Sélectionnez un niveau ou tapez pour rechercher
                </div>
              )}

              {niveauData && (
                <div className="max-h-96 overflow-y-auto border rounded-xl">
                  {Object.entries(niveauData.themes).map(([themeId, theme]) => {
                    const themeExercises = Object.entries(theme.chapitres).flatMap(([, chap]) =>
                      chap.e.filter(ex =>
                        !searchQuery ||
                        ex.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (ex.d && ex.d.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                    )

                    if (searchQuery && themeExercises.length === 0) return null
                    const isThemeExpanded = expandedThemes.has(themeId) || searchQuery.length > 0

                    return (
                      <div key={themeId} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedThemes)
                            if (isThemeExpanded && !searchQuery) newExpanded.delete(themeId)
                            else newExpanded.add(themeId)
                            setExpandedThemes(newExpanded)
                          }}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {themeId.includes('N') ? '🔢' : themeId.includes('G') ? '📐' : themeId.includes('M') ? '📏' : themeId.includes('D') ? '📊' : '📚'}
                            </span>
                            <span className="font-semibold">{theme.nom}</span>
                            <span className="text-sm text-gray-500">({themeExercises.length})</span>
                          </div>
                          <span className={`transition-transform ${isThemeExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {isThemeExpanded && (
                          <div className="bg-white">
                            {Object.entries(theme.chapitres).map(([chapId, chapitre]) => {
                              const chapExercises = chapitre.e.filter(ex =>
                                !searchQuery ||
                                ex.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (ex.d && ex.d.toLowerCase().includes(searchQuery.toLowerCase()))
                              )

                              if (searchQuery && chapExercises.length === 0) return null
                              const isChapExpanded = expandedChapters.has(chapId) || searchQuery.length > 0

                              return (
                                <div key={chapId} className="border-t">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedChapters)
                                      if (isChapExpanded && !searchQuery) newExpanded.delete(chapId)
                                      else newExpanded.add(chapId)
                                      setExpandedChapters(newExpanded)
                                    }}
                                    className="w-full flex items-center justify-between p-2 pl-6 hover:bg-gray-50 transition-all"
                                  >
                                    <span className="text-sm font-medium text-gray-700">{chapitre.n}</span>
                                    <span className="text-xs text-gray-400">{chapExercises.length} ex.</span>
                                  </button>

                                  {isChapExpanded && (
                                    <div className="pl-8 pr-2 pb-2 space-y-1">
                                      {chapExercises.map((ex, idx) => (
                                        <button
                                          key={`${ex.u}-${idx}`}
                                          type="button"
                                          onClick={() => selectExercise(ex)}
                                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                                            selectedExercise?.u === ex.u
                                              ? 'bg-primary-100 border-2 border-primary-500'
                                              : 'hover:bg-gray-100 border-2 border-transparent'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{ex.t}</span>
                                            {ex.new && (
                                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Nouveau</span>
                                            )}
                                          </div>
                                          {ex.d && <div className="text-xs text-gray-500 mt-0.5">{ex.d}</div>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Paramètres */}
            {selectedExercise && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de questions</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={nbQuestions}
                    onChange={(e) => setNbQuestions(parseInt(e.target.value) || 5)}
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée d&apos;affichage (s)</label>
                  <input
                    type="number"
                    min={3}
                    max={60}
                    value={displayDuration}
                    onChange={(e) => setDisplayDuration(parseInt(e.target.value) || 30)}
                    className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la session</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedExercise?.t || 'Titre de la session'}
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
              disabled={submitting || !selectedClass || !selectedExercise}
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
