'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Exercise {
  u: string
  t: string
  d?: string
  new?: boolean
}

interface ExerciseOption {
  name: string
  question?: string | string[]
  vars?: Record<string, any>
}

interface ExerciseDetail {
  title: string
  ID?: string
  description?: string
  options: ExerciseOption[]
  question?: string | string[]
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [exerciseDetail, setExerciseDetail] = useState<ExerciseDetail | null>(null)
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [selectedSubOptions, setSelectedSubOptions] = useState<Map<number, Set<number>>>(new Map())
  const [nbQuestions, setNbQuestions] = useState(5)
  const [displayDuration, setDisplayDuration] = useState(8)

  // Fonction de recherche intelligente
  const searchExercises = (query: string, exercises: Exercise[]): Exercise[] => {
    if (!query.trim()) return exercises

    const normalizedQuery = query.toLowerCase().trim()
    const queryWords = normalizedQuery.split(/\s+/)

    return exercises.filter(ex => {
      const title = ex.t.toLowerCase()
      const desc = (ex.d || '').toLowerCase()
      const combined = `${title} ${desc}`

      // Vérifie si tous les mots de la recherche sont présents
      return queryWords.every(word => combined.includes(word))
    }).sort((a, b) => {
      // Prioriser les correspondances exactes dans le titre
      const aExact = a.t.toLowerCase().includes(normalizedQuery)
      const bExact = b.t.toLowerCase().includes(normalizedQuery)
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return 0
    })
  }

  // Obtenir tous les exercices filtrés pour un niveau
  const getFilteredExercises = () => {
    if (!selectedNiveau || !content) return []

    const niveauData = content[selectedNiveau]
    if (!niveauData) return []

    const allExercises: { exercise: Exercise; theme: string; chapitre: string }[] = []

    Object.entries(niveauData.themes).forEach(([themeId, theme]) => {
      Object.entries(theme.chapitres).forEach(([chapId, chapitre]) => {
        chapitre.e.forEach(ex => {
          allExercises.push({
            exercise: ex,
            theme: theme.nom,
            chapitre: chapitre.n
          })
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
        if (!response.ok) {
          throw new Error('Impossible de charger les exercices')
        }
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

  // Charger les détails d'un exercice
  const [exerciseLoadError, setExerciseLoadError] = useState<string | null>(null)

  const loadExerciseDetail = async (exercise: Exercise) => {
    setLoadingExercise(true)
    setExerciseLoadError(null)
    try {
      const res = await fetch(`/library/${exercise.u}`)
      if (res.ok) {
        const data = await res.json()
        setExerciseDetail({
          title: data.title,
          ID: data.ID,
          description: data.description,
          options: data.options || [],
          question: data.question
        })
        // Initialiser toutes les sous-options comme sélectionnées
        const initialSelection = new Map<number, Set<number>>()
        const options = data.options || []
        options.forEach((_: any, optIdx: number) => {
          const questionCount = getQuestionVariantCount(data, optIdx)
          initialSelection.set(optIdx, new Set(Array.from({ length: questionCount }, (_, i) => i)))
        })
        setSelectedSubOptions(initialSelection)
      } else {
        setExerciseLoadError(`Fichier d'exercice introuvable: ${exercise.u}`)
        setExerciseDetail(null)
      }
    } catch (err) {
      console.error('Erreur chargement exercice:', err)
      setExerciseLoadError('Erreur lors du chargement de l\'exercice')
      setExerciseDetail(null)
    } finally {
      setLoadingExercise(false)
    }
  }

  const getQuestionVariantCount = (detail: ExerciseDetail, optionIndex: number): number => {
    const option = detail.options[optionIndex]
    if (option?.question) {
      return Array.isArray(option.question) ? option.question.length : 1
    }
    if (detail.question) {
      return Array.isArray(detail.question) ? detail.question.length : 1
    }
    return 1
  }

  const getQuestionVariantLabels = (detail: ExerciseDetail, optionIndex: number): string[] => {
    const count = getQuestionVariantCount(detail, optionIndex)
    const option = detail.options[optionIndex]
    const questions = option?.question || detail.question

    if (Array.isArray(questions)) {
      return questions.map((q, i) => {
        const simplified = q
          .replace(/\$\$/g, '')
          .replace(/\\\\/g, '')
          .replace(/\$\{:(\w+)\}/g, 'n')
          .replace(/\\times/g, '×')
          .replace(/\\color\{[^}]+\}/g, '')
          .trim()
        return simplified || `Option ${i + 1}`
      })
    }
    return count > 1 ? Array.from({ length: count }, (_, i) => `Option ${i + 1}`) : ['']
  }

  const openExerciseModal = async (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowModal(true)
    setNbQuestions(5)
    setDisplayDuration(8)
    await loadExerciseDetail(exercise)
  }

  const toggleSubOption = (optionIndex: number, variantIndex: number) => {
    const newSelection = new Map(selectedSubOptions)
    const variants = newSelection.get(optionIndex) || new Set<number>()
    const newVariants = new Set(variants)
    if (newVariants.has(variantIndex)) {
      newVariants.delete(variantIndex)
    } else {
      newVariants.add(variantIndex)
    }
    newSelection.set(optionIndex, newVariants)
    setSelectedSubOptions(newSelection)
  }

  const toggleOption = (optionIndex: number) => {
    if (!exerciseDetail) return
    const newSelection = new Map(selectedSubOptions)
    const variants = newSelection.get(optionIndex) || new Set<number>()
    const count = getQuestionVariantCount(exerciseDetail, optionIndex)
    if (variants.size === count) {
      newSelection.set(optionIndex, new Set())
    } else {
      newSelection.set(optionIndex, new Set(Array.from({ length: count }, (_, i) => i)))
    }
    setSelectedSubOptions(newSelection)
  }

  const toggleAll = (select: boolean) => {
    if (!exerciseDetail) return
    const newSelection = new Map<number, Set<number>>()
    exerciseDetail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(exerciseDetail, optIdx)
      newSelection.set(optIdx, select ? new Set(Array.from({ length: count }, (_, i) => i)) : new Set())
    })
    setSelectedSubOptions(newSelection)
  }

  const toggleAllVariant = (variantIndex: number) => {
    if (!exerciseDetail) return
    const newSelection = new Map(selectedSubOptions)
    let allSelected = true
    exerciseDetail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(exerciseDetail, optIdx)
      if (variantIndex < count) {
        const variants = newSelection.get(optIdx) || new Set<number>()
        if (!variants.has(variantIndex)) allSelected = false
      }
    })
    exerciseDetail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(exerciseDetail, optIdx)
      if (variantIndex < count) {
        const variants = newSelection.get(optIdx) || new Set<number>()
        const newVariants = new Set(variants)
        if (allSelected) {
          newVariants.delete(variantIndex)
        } else {
          newVariants.add(variantIndex)
        }
        newSelection.set(optIdx, newVariants)
      }
    })
    setSelectedSubOptions(newSelection)
  }

  const getTotalSelected = (): number => {
    let total = 0
    selectedSubOptions.forEach(variants => {
      total += variants.size
    })
    return total
  }

  const getMaxVariants = (): number => {
    if (!exerciseDetail) return 1
    return Math.max(...exerciseDetail.options.map((_, i) => getQuestionVariantCount(exerciseDetail, i)))
  }

  // Actions
  const handlePlay = () => {
    if (!selectedExercise) return
    // Passer les options sélectionnées et autostart pour démarrer immédiatement
    const selectedOptionsArray = Array.from(selectedSubOptions.entries())
      .filter(([_, variants]) => variants.size > 0)
      .map(([optIdx, _]) => optIdx)

    const params = new URLSearchParams({
      file: selectedExercise.u,
      niveau: selectedNiveau || '',
      n: nbQuestions.toString(),
      autostart: 'true'
    })
    // Ne passer options que si des options spécifiques sont sélectionnées
    if (selectedOptionsArray.length > 0) {
      params.set('options', selectedOptionsArray.join(','))
    }
    router.push(`/exercices/play?${params.toString()}`)
  }

  const handleCreateSession = () => {
    if (!selectedExercise) return
    const config = {
      exerciseFile: selectedExercise.u,
      exerciseTitle: selectedExercise.t,
      niveau: selectedNiveau,
      nbQuestions,
      displayDuration,
      selectedOptions: Object.fromEntries(
        Array.from(selectedSubOptions.entries()).map(([k, v]) => [k, Array.from(v)])
      )
    }
    // Stocker la config dans sessionStorage et rediriger
    sessionStorage.setItem('exerciseConfig', JSON.stringify(config))
    router.push('/dashboard/sessions/new?prefill=true')
  }

  const handleShareLink = async () => {
    if (!selectedExercise) return
    const params = new URLSearchParams({
      file: selectedExercise.u,
      niveau: selectedNiveau || '',
      n: nbQuestions.toString()
    })
    const url = `${window.location.origin}/exercices/play?${params.toString()}`

    try {
      await navigator.clipboard.writeText(url)
      alert('Lien copié dans le presse-papier !')
    } catch {
      prompt('Copiez ce lien :', url)
    }
  }

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
          <Link href="/" className="text-primary-600 hover:underline">
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    )
  }

  const niveauData = selectedNiveau && content ? content[selectedNiveau] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            MathsMentales
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Mon espace
          </Link>
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

        {/* Liste des exercices du niveau selectionne */}
        {niveauData && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Exercices de {niveaux.find(n => n.id === selectedNiveau)?.nom}
            </h2>

            {/* Barre de recherche */}
            <div className="max-w-xl mx-auto mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un exercice... (ex: fraction, multiplication, aire)"
                  className="w-full py-3 px-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none text-lg"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Affichage des résultats */}
            {searchQuery.trim() ? (
              // Mode recherche : affichage plat des résultats
              <div>
                {(() => {
                  const filteredResults = getFilteredExercises()
                  if (filteredResults.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
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
                            <div className="font-semibold text-gray-900 mb-1">
                              {exercise.t}
                            </div>
                            {exercise.d && (
                              <p className="text-sm text-gray-600">{exercise.d}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {theme}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {chapitre}
                              </span>
                            </div>
                            {exercise.new && (
                              <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                                Nouveau
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              // Mode navigation : affichage par thèmes et chapitres
              Object.entries(niveauData.themes).map(([themeId, theme]) => (
                <div key={themeId} className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 text-primary-700">
                    {theme.nom}
                  </h3>

                  {Object.entries(theme.chapitres).map(([chapitreId, chapitre]) => (
                    <div key={chapitreId} className="mb-6">
                      <h4 className="text-lg font-medium mb-3 text-gray-700">
                        {chapitre.n}
                      </h4>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {chapitre.e.map((exercice, index) => (
                          <button
                            key={`${exercice.u}-${index}`}
                            onClick={() => openExerciseModal(exercice)}
                            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-500 text-left"
                          >
                            <div className="font-semibold text-gray-900 mb-1">
                              {exercice.t}
                            </div>
                            {exercice.d && (
                              <p className="text-sm text-gray-600">{exercice.d}</p>
                            )}
                            {exercice.new && (
                              <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                                Nouveau
                              </span>
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
            <p className="text-lg">Selectionnez un niveau pour voir les exercices disponibles</p>
          </div>
        )}
      </main>

      {/* Modale de configuration */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* En-tête */}
            <div className="p-4 border-b bg-gradient-to-r from-orange-100 to-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Activité {exerciseDetail?.ID}</div>
                  <h2 className="text-xl font-bold text-blue-600">
                    {loadingExercise ? 'Chargement...' : exerciseDetail?.title || selectedExercise?.t}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-2"
                >
                  &times;
                </button>
              </div>

              {/* Sliders */}
              {!loadingExercise && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-40">Durée d&apos;affichage :</span>
                    <span className="text-sm font-bold w-12">{displayDuration} s.</span>
                    <input
                      type="range"
                      min="3"
                      max="30"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-40">Nombre de questions :</span>
                    <span className="text-sm font-bold w-12">{nbQuestions}</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={nbQuestions}
                      onChange={(e) => setNbQuestions(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="p-4 overflow-y-auto max-h-[45vh]">
              {loadingExercise ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : exerciseDetail && exerciseDetail.options.length > 0 ? (
                <>
                  <h3 className="font-bold text-lg mb-3">Questions types</h3>

                  {/* Contrôles globaux */}
                  <div className="flex items-center gap-4 mb-4 p-2 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getTotalSelected() === exerciseDetail.options.reduce((sum, _, i) =>
                          sum + getQuestionVariantCount(exerciseDetail, i), 0)}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="font-medium">Tout (dé)sélectionner</span>
                    </label>

                    {getMaxVariants() > 1 && (
                      <div className="flex gap-3 ml-4">
                        {Array.from({ length: getMaxVariants() }, (_, i) => (
                          <label key={i} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={exerciseDetail.options.every((_, optIdx) => {
                                const count = getQuestionVariantCount(exerciseDetail, optIdx)
                                if (i >= count) return true
                                return (selectedSubOptions.get(optIdx) || new Set()).has(i)
                              })}
                              onChange={() => toggleAllVariant(i)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="text-sm">Options {i + 1}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Liste des options */}
                  <div className="space-y-3">
                    {exerciseDetail.options.map((option, optIdx) => {
                      const variantCount = getQuestionVariantCount(exerciseDetail, optIdx)
                      const selectedVariants = selectedSubOptions.get(optIdx) || new Set<number>()
                      const labels = getQuestionVariantLabels(exerciseDetail, optIdx)
                      const isFullySelected = selectedVariants.size === variantCount

                      return (
                        <div key={optIdx} className="border rounded-lg p-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isFullySelected}
                              ref={(el) => {
                                if (el) el.indeterminate = selectedVariants.size > 0 && !isFullySelected
                              }}
                              onChange={() => toggleOption(optIdx)}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="font-medium">{option.name} :</span>
                          </label>

                          {variantCount > 1 && (
                            <div className="ml-6 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              {labels.map((label, varIdx) => (
                                <label key={varIdx} className="flex items-center gap-1.5 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedVariants.has(varIdx)}
                                    onChange={() => toggleSubOption(optIdx, varIdx)}
                                    className="w-3.5 h-3.5 text-primary-600 rounded"
                                  />
                                  <span className="text-gray-600">{label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : exerciseLoadError ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">
                    {exerciseLoadError}
                  </div>
                  <p className="text-sm text-gray-500">
                    Ce fichier d&apos;exercice n&apos;est pas disponible dans la bibliothèque.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Cet exercice utilise toutes les options par défaut.</p>
                  <p className="text-sm mt-2">Cliquez sur &quot;C&apos;est parti !&quot; pour commencer.</p>
                </div>
              )}
            </div>

            {/* Pied avec actions */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-500">
                  {getTotalSelected()} type(s) de question(s) sélectionné(s)
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handlePlay}
                  disabled={!!exerciseLoadError || !exerciseDetail}
                  className="px-6 py-3 rounded-lg font-bold bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  C&apos;est parti !
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!!exerciseLoadError || !exerciseDetail}
                  className="px-6 py-3 rounded-lg font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Créer une session
                </button>
                <button
                  onClick={handleShareLink}
                  disabled={!!exerciseLoadError || !exerciseDetail}
                  className="px-6 py-3 rounded-lg font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lien partageable
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
