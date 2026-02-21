'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useExerciseDetail, type Exercise, type ExerciseDetail } from '@/hooks/useExerciseDetail'
import { useExerciseOptions } from '@/hooks/useExerciseOptions'
import ExerciseModal from '@/components/ExerciseModal'
import QuickSessionCreator from '@/components/QuickSessionCreator'

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
  { id: '6', nom: '6eme', couleur: 'bg-green-500' },
  { id: '5', nom: '5eme', couleur: 'bg-blue-500' },
  { id: '4', nom: '4eme', couleur: 'bg-purple-500' },
  { id: '3', nom: '3eme', couleur: 'bg-red-500' },
]

export default function ExercicesPage() {
  const router = useRouter()
  const [content, setContent] = useState<Record<string, ContentNiveau> | null>(null)
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showQuickSession, setShowQuickSession] = useState(false)

  const { exerciseDetail, loadingExercise, exerciseLoadError, loadExerciseDetail } = useExerciseDetail()
  const {
    selectedSubOptions, nbQuestions, displayDuration,
    setNbQuestions, setDisplayDuration, initializeSelection,
    toggleSubOption, toggleOption, toggleAll, toggleAllVariant,
    getTotalSelected, getMaxVariants, getSelectedOptionsArray, getSelectedOptionsObject,
  } = useExerciseOptions()

  // Recherche intelligente
  const searchExercises = (query: string, exercises: Exercise[]): Exercise[] => {
    if (!query.trim()) return exercises
    const normalizedQuery = query.toLowerCase().trim()
    const queryWords = normalizedQuery.split(/\s+/)

    return exercises.filter(ex => {
      const combined = `${ex.t.toLowerCase()} ${(ex.d || '').toLowerCase()}`
      return queryWords.every(word => combined.includes(word))
    }).sort((a, b) => {
      const aExact = a.t.toLowerCase().includes(normalizedQuery)
      const bExact = b.t.toLowerCase().includes(normalizedQuery)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return 0
    })
  }

  const getFilteredExercises = () => {
    if (!selectedNiveau || !content) return []
    const niveauData = content[selectedNiveau]
    if (!niveauData) return []

    const allExercises: { exercise: Exercise; theme: string; chapitre: string }[] = []
    Object.entries(niveauData.themes).forEach(([, theme]) => {
      Object.entries(theme.chapitres).forEach(([, chapitre]) => {
        chapitre.e.forEach(ex => {
          allExercises.push({ exercise: ex, theme: theme.nom, chapitre: chapitre.n })
        })
      })
    })

    if (!searchQuery.trim()) return allExercises
    const filtered = searchExercises(searchQuery, allExercises.map(e => e.exercise))
    return allExercises.filter(e => filtered.includes(e.exercise))
  }

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch('/library/content.json')
        if (!response.ok) throw new Error('Impossible de charger les exercices')
        const data = await response.json()
        setContent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  const openExerciseModal = async (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowModal(true)
    setNbQuestions(5)
    setDisplayDuration(8)
    const detail = await loadExerciseDetail(exercise)
    if (detail) initializeSelection(detail)
  }

  const buildExerciseParams = () => {
    if (!selectedExercise) return null
    const params = new URLSearchParams({
      file: selectedExercise.u,
      niveau: selectedNiveau || '',
      n: nbQuestions.toString(),
      d: displayDuration.toString(),
    })
    const optionsObj = getSelectedOptionsObject()
    if (Object.keys(optionsObj).length > 0) {
      params.set('opts', JSON.stringify(optionsObj))
    }
    return params
  }

  const handlePlay = () => {
    const params = buildExerciseParams()
    if (!params) return
    params.set('autostart', 'true')
    router.push(`/exercices/play?${params.toString()}`)
  }

  const handleCreateSession = () => {
    setShowQuickSession(true)
  }

  const handleShareLink = async () => {
    const params = buildExerciseParams()
    if (!params) return
    const url = `${window.location.origin}/exercices/play?${params.toString()}`

    try {
      await navigator.clipboard.writeText(url)
      alert('Lien copié dans le presse-papier !')
    } catch {
      prompt('Copiez ce lien :', url)
    }
  }

  const hasError = !!exerciseLoadError || !exerciseDetail

  const modalActions = [
    { label: "C'est parti !", onClick: handlePlay, variant: 'green' as const, disabled: hasError },
    { label: 'Créer une session', onClick: handleCreateSession, variant: 'blue' as const, disabled: hasError },
    { label: 'Lien partageable', onClick: handleShareLink, variant: 'purple' as const, disabled: hasError },
    { label: 'Annuler', onClick: () => setShowModal(false), variant: 'gray' as const },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des exercices...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="text-primary-600 hover:underline">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const niveauData = selectedNiveau && content ? content[selectedNiveau] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">MathsMentales</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Mon espace</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Exercices de calcul mental</h1>

        {/* Selection du niveau */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Choisissez votre niveau</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {niveaux.map((niveau) => (
              <button
                key={niveau.id}
                onClick={() => setSelectedNiveau(niveau.id)}
                className={`p-6 rounded-xl text-white font-bold text-2xl transition-all hover:scale-105 ${niveau.couleur} ${
                  selectedNiveau === niveau.id ? 'ring-4 ring-offset-2 ring-gray-400' : ''
                }`}
              >
                {niveau.nom}
              </button>
            ))}
          </div>
        </div>

        {/* Exercices du niveau */}
        {niveauData && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Exercices de {niveaux.find(n => n.id === selectedNiveau)?.nom}
            </h2>

            {/* Recherche */}
            <div className="max-w-xl mx-auto mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un exercice... (ex: fraction, multiplication, aire)"
                  className="w-full py-3 px-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none text-lg"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Resultats */}
            {searchQuery.trim() ? (
              <div>
                {(() => {
                  const filteredResults = getFilteredExercises()
                  if (filteredResults.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-lg">Aucun exercice trouvé pour &quot;{searchQuery}&quot;</p>
                        <p className="text-sm mt-2">Essayez avec d&apos;autres mots-clés</p>
                      </div>
                    )
                  }
                  return (
                    <>
                      <p className="text-sm text-gray-500 mb-4 text-center">
                        {filteredResults.length} exercice{filteredResults.length > 1 ? 's' : ''} trouvé{filteredResults.length > 1 ? 's' : ''}
                      </p>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredResults.map(({ exercise, theme, chapitre }, index) => (
                          <button
                            key={`${exercise.u}-${index}`}
                            onClick={() => openExerciseModal(exercise)}
                            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-500 text-left"
                          >
                            <div className="font-semibold text-gray-900 mb-1">{exercise.t}</div>
                            {exercise.d && <p className="text-sm text-gray-600">{exercise.d}</p>}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{theme}</span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{chapitre}</span>
                            </div>
                            {exercise.new && (
                              <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Nouveau</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              Object.entries(niveauData.themes).map(([themeId, theme]) => (
                <div key={themeId} className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 text-primary-700">{theme.nom}</h3>
                  {Object.entries(theme.chapitres).map(([chapitreId, chapitre]) => (
                    <div key={chapitreId} className="mb-6">
                      <h4 className="text-lg font-medium mb-3 text-gray-700">{chapitre.n}</h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {chapitre.e.map((exercice, index) => (
                          <button
                            key={`${exercice.u}-${index}`}
                            onClick={() => openExerciseModal(exercice)}
                            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-500 text-left"
                          >
                            <div className="font-semibold text-gray-900 mb-1">{exercice.t}</div>
                            {exercice.d && <p className="text-sm text-gray-600">{exercice.d}</p>}
                            {exercice.new && (
                              <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Nouveau</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {!selectedNiveau && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg">Sélectionnez un niveau pour voir les exercices disponibles</p>
          </div>
        )}
      </main>

      <ExerciseModal
        isOpen={showModal && !showQuickSession}
        onClose={() => setShowModal(false)}
        selectedExercise={selectedExercise}
        exerciseDetail={exerciseDetail}
        loadingExercise={loadingExercise}
        exerciseLoadError={exerciseLoadError}
        selectedSubOptions={selectedSubOptions}
        nbQuestions={nbQuestions}
        displayDuration={displayDuration}
        onNbQuestionsChange={setNbQuestions}
        onDisplayDurationChange={setDisplayDuration}
        onToggleSubOption={toggleSubOption}
        onToggleOption={(optIdx) => exerciseDetail && toggleOption(optIdx, exerciseDetail)}
        onToggleAll={(select) => exerciseDetail && toggleAll(select, exerciseDetail)}
        onToggleAllVariant={(varIdx) => exerciseDetail && toggleAllVariant(varIdx, exerciseDetail)}
        getTotalSelected={getTotalSelected}
        getMaxVariants={() => getMaxVariants(exerciseDetail)}
        actions={modalActions}
      />

      {/* Quick session creator modal */}
      {showQuickSession && selectedExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">{selectedExercise.t}</h2>
            <p className="text-sm text-gray-500 mb-4">{nbQuestions} questions, {displayDuration}s par question</p>
            <QuickSessionCreator
              exerciseFile={selectedExercise.u}
              exerciseTitle={selectedExercise.t}
              niveau={selectedNiveau}
              nbQuestions={nbQuestions}
              displayDuration={displayDuration}
              selectedOptions={getSelectedOptionsObject()}
              onClose={() => {
                setShowQuickSession(false)
                setShowModal(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
