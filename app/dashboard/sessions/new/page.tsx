'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ClassInfo {
  id: string
  name: string
  google_classroom_id: string | null
}

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
  question?: string | string[] // Questions au niveau racine
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

function NewSessionContent() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [content, setContent] = useState<Record<string, ContentNiveau> | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedNiveau, setSelectedNiveau] = useState<string>('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [exerciseDetail, setExerciseDetail] = useState<ExerciseDetail | null>(null)
  // Selection: Map<optionIndex, Set<questionVariantIndex>>
  const [selectedSubOptions, setSelectedSubOptions] = useState<Map<number, Set<number>>>(new Map())
  const [showModal, setShowModal] = useState(false)
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [title, setTitle] = useState('')
  const [nbQuestions, setNbQuestions] = useState(5)
  const [displayDuration, setDisplayDuration] = useState(8)
  const [publishToClassroom, setPublishToClassroom] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [prefilled, setPrefilled] = useState(false)
  const [classFromUrl, setClassFromUrl] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pré-sélectionner la classe si classId dans l'URL
  useEffect(() => {
    const classId = searchParams.get('classId')
    if (classId && classes.length > 0) {
      const classExists = classes.find(c => c.id === classId)
      if (classExists) {
        setSelectedClass(classId)
        setClassFromUrl(true)
      }
    }
  }, [searchParams, classes])

  // Charger config pré-remplie depuis /exercices
  useEffect(() => {
    if (searchParams.get('prefill') === 'true') {
      const configStr = sessionStorage.getItem('exerciseConfig')
      if (configStr) {
        try {
          const config = JSON.parse(configStr)
          setSelectedExercise({
            u: config.exerciseFile,
            t: config.exerciseTitle
          })
          setTitle(config.exerciseTitle || '')
          setSelectedNiveau(config.niveau || '')
          setNbQuestions(config.nbQuestions || 5)
          setDisplayDuration(config.displayDuration || 8)
          if (config.selectedOptions) {
            const newSelection = new Map<number, Set<number>>()
            Object.entries(config.selectedOptions).forEach(([k, v]) => {
              newSelection.set(parseInt(k), new Set(v as number[]))
            })
            setSelectedSubOptions(newSelection)
          }
          setPrefilled(true)
          sessionStorage.removeItem('exerciseConfig')
        } catch (e) {
          console.error('Erreur parsing config:', e)
        }
      }
    }
  }, [searchParams])

  // Charger les détails d'un exercice
  const loadExerciseDetail = async (exercise: Exercise) => {
    setLoadingExercise(true)
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
      }
    } catch (err) {
      console.error('Erreur chargement exercice:', err)
    } finally {
      setLoadingExercise(false)
    }
  }

  // Obtenir le nombre de variantes de questions
  const getQuestionVariantCount = (detail: ExerciseDetail, optionIndex: number): number => {
    const option = detail.options[optionIndex]
    // Si l'option a sa propre question
    if (option?.question) {
      return Array.isArray(option.question) ? option.question.length : 1
    }
    // Sinon utiliser la question racine
    if (detail.question) {
      return Array.isArray(detail.question) ? detail.question.length : 1
    }
    return 1
  }

  // Obtenir les labels des variantes
  const getQuestionVariantLabels = (detail: ExerciseDetail, optionIndex: number): string[] => {
    const count = getQuestionVariantCount(detail, optionIndex)
    const option = detail.options[optionIndex]
    const questions = option?.question || detail.question

    if (Array.isArray(questions)) {
      // Simplifier les formules LaTeX pour l'affichage
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

  // Ouvrir la modale de configuration
  const openExerciseModal = async (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowModal(true)
    await loadExerciseDetail(exercise)
  }

  // Confirmer la sélection
  const confirmExercise = () => {
    if (selectedExercise && exerciseDetail) {
      if (!title) setTitle(exerciseDetail.title)
      setShowModal(false)
    }
  }

  // Toggle une sous-option (optionIndex, variantIndex)
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

  // Toggle toute une option (sélectionne/désélectionne toutes ses variantes)
  const toggleOption = (optionIndex: number) => {
    if (!exerciseDetail) return
    const newSelection = new Map(selectedSubOptions)
    const variants = newSelection.get(optionIndex) || new Set<number>()
    const count = getQuestionVariantCount(exerciseDetail, optionIndex)

    if (variants.size === count) {
      // Tout désélectionner
      newSelection.set(optionIndex, new Set())
    } else {
      // Tout sélectionner
      newSelection.set(optionIndex, new Set(Array.from({ length: count }, (_, i) => i)))
    }
    setSelectedSubOptions(newSelection)
  }

  // Sélectionner/désélectionner tout
  const toggleAll = (select: boolean) => {
    if (!exerciseDetail) return
    const newSelection = new Map<number, Set<number>>()
    exerciseDetail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(exerciseDetail, optIdx)
      newSelection.set(optIdx, select ? new Set(Array.from({ length: count }, (_, i) => i)) : new Set())
    })
    setSelectedSubOptions(newSelection)
  }

  // Toggle toutes les variantes d'un certain index (ex: toutes les "Options 1")
  const toggleAllVariant = (variantIndex: number) => {
    if (!exerciseDetail) return
    const newSelection = new Map(selectedSubOptions)

    // Vérifier si toutes sont sélectionnées
    let allSelected = true
    exerciseDetail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(exerciseDetail, optIdx)
      if (variantIndex < count) {
        const variants = newSelection.get(optIdx) || new Set<number>()
        if (!variants.has(variantIndex)) allSelected = false
      }
    })

    // Toggle
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

  // Compter le nombre total de sélections
  const getTotalSelected = (): number => {
    let total = 0
    selectedSubOptions.forEach(variants => {
      total += variants.size
    })
    return total
  }

  // Obtenir le nombre max de variantes
  const getMaxVariants = (): number => {
    if (!exerciseDetail) return 1
    return Math.max(...exerciseDetail.options.map((_, i) => getQuestionVariantCount(exerciseDetail, i)))
  }

  const niveaux = [
    { id: '6', nom: '6eme' },
    { id: '5', nom: '5eme' },
    { id: '4', nom: '4eme' },
    { id: '3', nom: '3eme' },
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Charger les classes
      const classesRes = await fetch('/api/classes')
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        setClasses(classesData.classes || [])
      }

      // Charger le contenu des exercices
      const contentRes = await fetch('/library/content.json')
      if (contentRes.ok) {
        const contentData = await contentRes.json()
        setContent(contentData)
      }
    } catch (err) {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClass || !selectedExercise) {
      setError('Veuillez selectionner une classe et un exercice')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
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
          selectedOptions: Object.fromEntries(
            Array.from(selectedSubOptions.entries()).map(([k, v]) => [k, Array.from(v)])
          )
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la creation')
        return
      }

      setSuccess(data.message || 'Session creee avec succes!')

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Erreur lors de la creation')
    } finally {
      setSubmitting(false)
    }
  }

  const niveauData = selectedNiveau && content ? content[selectedNiveau] : null

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
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Nouvelle session d&apos;exercices</h1>
          <p className="text-gray-600 mb-6">
            Creez une session et publiez-la dans Google Classroom
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selection de la classe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classe *
              </label>
              {classes.length === 0 ? (
                <p className="text-gray-500">
                  Aucune classe. <Link href="/dashboard/classroom" className="text-primary-600 hover:underline">Importez une classe</Link> d&apos;abord.
                </p>
              ) : classFromUrl ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 py-3 px-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
                    <span className="font-medium text-primary-700">
                      {classes.find(c => c.id === selectedClass)?.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClassFromUrl(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  required
                >
                  <option value="">Selectionnez une classe</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.google_classroom_id && '(Google Classroom)'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selection du niveau */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau *
              </label>
              <div className="flex gap-2">
                {niveaux.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedNiveau(n.id)
                      setSelectedExercise(null)
                    }}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      selectedNiveau === n.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {n.nom}
                  </button>
                ))}
              </div>
            </div>

            {/* Selection de l'exercice */}
            {niveauData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercice *
                </label>

                {/* Barre de recherche */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un exercice..."
                    className="w-full py-2 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* Exercice sélectionné */}
                {selectedExercise && (
                  <div className="mb-3 p-3 bg-primary-50 border-2 border-primary-500 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-primary-700">{selectedExercise.t}</div>
                        {selectedExercise.d && <div className="text-sm text-primary-600">{selectedExercise.d}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedExercise(null)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Liste des thèmes et exercices */}
                <div className="max-h-96 overflow-y-auto border rounded-xl">
                  {Object.entries(niveauData.themes).map(([themeId, theme]) => {
                    const themeExercises = Object.entries(theme.chapitres).flatMap(([chapId, chap]) =>
                      chap.e.filter(ex =>
                        !searchQuery ||
                        ex.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (ex.d && ex.d.toLowerCase().includes(searchQuery.toLowerCase()))
                      ).map(ex => ({ ...ex, chapId, chapName: chap.n }))
                    )

                    if (searchQuery && themeExercises.length === 0) return null

                    const isThemeExpanded = expandedThemes.has(themeId) || searchQuery.length > 0

                    return (
                      <div key={themeId} className="border-b last:border-b-0">
                        {/* En-tête du thème */}
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedThemes)
                            if (isThemeExpanded && !searchQuery) {
                              newExpanded.delete(themeId)
                            } else {
                              newExpanded.add(themeId)
                            }
                            setExpandedThemes(newExpanded)
                          }}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {themeId.includes('N') ? '🔢' :
                               themeId.includes('G') ? '📐' :
                               themeId.includes('M') ? '📏' :
                               themeId.includes('D') ? '📊' : '📚'}
                            </span>
                            <span className="font-semibold">{theme.nom}</span>
                            <span className="text-sm text-gray-500">({themeExercises.length})</span>
                          </div>
                          <span className={`transition-transform ${isThemeExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>

                        {/* Contenu du thème */}
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
                                  {/* En-tête du chapitre */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedChapters)
                                      if (isChapExpanded && !searchQuery) {
                                        newExpanded.delete(chapId)
                                      } else {
                                        newExpanded.add(chapId)
                                      }
                                      setExpandedChapters(newExpanded)
                                    }}
                                    className="w-full flex items-center justify-between p-2 pl-6 hover:bg-gray-50 transition-all"
                                  >
                                    <span className="text-sm font-medium text-gray-700">{chapitre.n}</span>
                                    <span className="text-xs text-gray-400">{chapExercises.length} ex.</span>
                                  </button>

                                  {/* Liste des exercices */}
                                  {isChapExpanded && (
                                    <div className="pl-8 pr-2 pb-2 space-y-1">
                                      {chapExercises.map((ex, idx) => (
                                        <button
                                          key={`${ex.u}-${idx}`}
                                          type="button"
                                          onClick={() => openExerciseModal(ex)}
                                          className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                                            selectedExercise?.u === ex.u
                                              ? 'bg-primary-100 border-2 border-primary-500'
                                              : 'hover:bg-gray-100 border-2 border-transparent'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{ex.t}</span>
                                            {ex.new && (
                                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                Nouveau
                                              </span>
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
              </div>
            )}

            {/* Titre personnalise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la session
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedExercise?.t || 'Titre de la session'}
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              />
            </div>

            {/* Publier dans Classroom */}
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
                  Publier dans Google Classroom (les eleves verront le lien)
                </label>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={submitting || !selectedClass || !selectedExercise}
              className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creation en cours...' : 'Creer la session'}
            </button>
          </form>
        </div>
      </main>

      {/* Modale de configuration de l'exercice */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* En-tête de la modale */}
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

              {/* Sliders durée et nombre */}
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

            {/* Contenu de la modale */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
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

                    {/* Options 1, Options 2 si plusieurs variantes */}
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

                  {/* Liste des options avec sous-options */}
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {exerciseDetail.options.map((option, optIdx) => {
                      const variantCount = getQuestionVariantCount(exerciseDetail, optIdx)
                      const selectedVariants = selectedSubOptions.get(optIdx) || new Set<number>()
                      const labels = getQuestionVariantLabels(exerciseDetail, optIdx)
                      const isFullySelected = selectedVariants.size === variantCount

                      return (
                        <div key={optIdx} className="border rounded-lg p-3">
                          {/* En-tête de l'option */}
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

                          {/* Sous-options (variantes de questions) */}
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
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Cet exercice n&apos;a pas d&apos;options configurables.
                </div>
              )}
            </div>

            {/* Pied de la modale */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {getTotalSelected()} type(s) de question(s) sélectionné(s)
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmExercise}
                  disabled={getTotalSelected() === 0}
                  className="px-5 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  C&apos;est parti !
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
