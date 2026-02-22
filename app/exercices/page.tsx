'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useExerciseDetail, type Exercise } from '@/hooks/useExerciseDetail'
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
  { id: '6', nom: '6e', emoji: '🟢' },
  { id: '5', nom: '5e', emoji: '🔵' },
  { id: '4', nom: '4e', emoji: '🟣' },
  { id: '3', nom: '3e', emoji: '🔴' },
]

const themeIcons: Record<string, string> = {
  N: '🔢', G: '📐', M: '📏', D: '📊', A: '🔤',
}

function getThemeIcon(themeId: string): string {
  for (const [key, icon] of Object.entries(themeIcons)) {
    if (themeId.includes(key)) return icon
  }
  return '📚'
}

function ExercicesCatalogueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [content, setContent] = useState<Record<string, ContentNiveau> | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNiveau, setSelectedNiveau] = useState(searchParams.get('niveau') || '6')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showSessionCreator, setShowSessionCreator] = useState(false)
  const [copied, setCopied] = useState(false)

  const { exerciseDetail, loadingExercise, exerciseLoadError, loadExerciseDetail } = useExerciseDetail()
  const {
    selectedSubOptions, nbQuestions, displayDuration,
    setNbQuestions, setDisplayDuration, initializeSelection,
    toggleSubOption, toggleOption, toggleAll, toggleAllVariant,
    getTotalSelected, getMaxVariants, getSelectedOptionsObject,
  } = useExerciseOptions()

  useEffect(() => {
    fetch('/library/content.json')
      .then(r => r.json())
      .then(data => setContent(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Restore from URL params (shareable link)
  useEffect(() => {
    const file = searchParams.get('file')
    if (file && content) {
      // Find exercise in content by file path
      for (const [niveauId, niveauData] of Object.entries(content)) {
        for (const theme of Object.values(niveauData.themes)) {
          for (const chapitre of Object.values(theme.chapitres)) {
            const found = chapitre.e.find(ex => ex.u === file)
            if (found) {
              setSelectedNiveau(niveauId)
              openExerciseModal(found)
              return
            }
          }
        }
      }
    }
  }, [content, searchParams])

  const openExerciseModal = useCallback(async (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowModal(true)
    setShowSessionCreator(false)
    const detail = await loadExerciseDetail(exercise)
    if (detail) initializeSelection(detail)
  }, [loadExerciseDetail, initializeSelection])

  const buildPlayUrl = useCallback(() => {
    if (!selectedExercise) return ''
    const params = new URLSearchParams()
    params.set('file', selectedExercise.u)
    params.set('n', String(nbQuestions))
    params.set('d', String(displayDuration))
    if (selectedNiveau) params.set('niveau', selectedNiveau)

    const opts = getSelectedOptionsObject()
    if (Object.keys(opts).length > 0) {
      params.set('opts', JSON.stringify(opts))
    }
    return `/exercices/play?${params.toString()}`
  }, [selectedExercise, nbQuestions, displayDuration, selectedNiveau, getSelectedOptionsObject])

  const handlePlay = () => {
    router.push(buildPlayUrl())
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${buildPlayUrl()}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreateSession = () => {
    setShowSessionCreator(true)
  }

  // Quand on cherche, inclure le niveau sélectionné + les niveaux inférieurs
  // Ex: 5e → cherche dans 5e + 6e, 4e → 4e + 5e + 6e, 3e → tout
  const niveauOrder = ['6', '5', '4', '3']
  const getSearchNiveaux = (niveau: string): string[] => {
    const idx = niveauOrder.indexOf(niveau)
    return idx >= 0 ? niveauOrder.slice(0, idx + 1) : [niveau]
  }

  const niveauData = selectedNiveau && content ? (() => {
    if (!searchQuery) return content[selectedNiveau]
    // Fusionner les thèmes de tous les niveaux concernés
    const niveauxToSearch = getSearchNiveaux(selectedNiveau)
    const mergedThemes: Record<string, ContentNiveau['themes'][string]> = {}
    for (const niv of niveauxToSearch) {
      const data = content[niv]
      if (!data) continue
      for (const [themeId, theme] of Object.entries(data.themes)) {
        const key = `${niv}_${themeId}`
        mergedThemes[key] = {
          nom: niveauxToSearch.length > 1 ? `${theme.nom} (${niv}e)` : theme.nom,
          chapitres: theme.chapitres,
        }
      }
    }
    return { nom: content[selectedNiveau].nom, themes: mergedThemes } as ContentNiveau
  })() : null

  const modalActions = [
    {
      label: copied ? 'Lien copié !' : 'Copier le lien',
      onClick: handleCopyLink,
      variant: 'gray' as const,
      disabled: getTotalSelected() === 0,
    },
    {
      label: 'Créer session',
      onClick: handleCreateSession,
      variant: 'blue' as const,
      disabled: getTotalSelected() === 0,
    },
    {
      label: "C'est parti !",
      onClick: handlePlay,
      variant: 'green' as const,
      disabled: getTotalSelected() === 0,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des exercices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600">MathsMentales</span>
            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">COLLEGE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/play" className="text-sm text-gray-500 hover:text-gray-700">
              Mode diaporama
            </Link>
            <Link href="/dashboard" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all">
              Mon espace
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Title + Search */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Exercices de calcul mental</h1>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Niveaux */}
            <div className="flex gap-1.5">
              {niveaux.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNiveau(n.id)
                    setExpandedThemes(new Set())
                    setExpandedChapters(new Set())
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedNiveau === n.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {n.emoji} {n.nom}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un exercice..."
                className="w-full py-2 px-4 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Exercise tree */}
        {niveauData && (
          <div className="space-y-2">
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
                <div key={themeId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => {
                      const next = new Set(expandedThemes)
                      if (isThemeExpanded && !searchQuery) next.delete(themeId)
                      else next.add(themeId)
                      setExpandedThemes(next)
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{getThemeIcon(themeId)}</span>
                      <span className="font-semibold text-gray-900">{theme.nom}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {themeExercises.length}
                      </span>
                    </div>
                    <span className={`text-gray-400 text-xs transition-transform ${isThemeExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {isThemeExpanded && (
                    <div className="border-t border-gray-100">
                      {Object.entries(theme.chapitres).map(([chapId, chapitre]) => {
                        const chapExercises = chapitre.e.filter(ex =>
                          !searchQuery ||
                          ex.t.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (ex.d && ex.d.toLowerCase().includes(searchQuery.toLowerCase()))
                        )

                        if (searchQuery && chapExercises.length === 0) return null
                        const isChapExpanded = expandedChapters.has(chapId) || searchQuery.length > 0

                        return (
                          <div key={chapId}>
                            <button
                              onClick={() => {
                                const next = new Set(expandedChapters)
                                if (isChapExpanded && !searchQuery) next.delete(chapId)
                                else next.add(chapId)
                                setExpandedChapters(next)
                              }}
                              className="w-full flex items-center justify-between px-4 py-2 pl-8 hover:bg-gray-50 transition-all border-t border-gray-50"
                            >
                              <span className="text-sm font-medium text-gray-700">{chapitre.n}</span>
                              <span className="text-xs text-gray-400">{chapExercises.length} ex.</span>
                            </button>

                            {isChapExpanded && (
                              <div className="pl-10 pr-3 pb-2 space-y-1">
                                {chapExercises.map((ex, idx) => (
                                  <button
                                    key={`${ex.u}-${idx}`}
                                    onClick={() => openExerciseModal(ex)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                                      selectedExercise?.u === ex.u
                                        ? 'bg-indigo-50 ring-2 ring-indigo-500'
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                                          {ex.t}
                                        </span>
                                        {ex.new && (
                                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-semibold">
                                            Nouveau
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Configurer →
                                      </span>
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

        {niveauData && Object.keys(niveauData.themes).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun exercice disponible pour ce niveau.
          </div>
        )}
      </main>

      {/* Exercise Modal */}
      <ExerciseModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setShowSessionCreator(false) }}
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
        actions={showSessionCreator ? [] : modalActions}
      >
        {showSessionCreator && selectedExercise && (
          <div className="p-4 border-t bg-indigo-50/50">
            <QuickSessionCreator
              exerciseFile={selectedExercise.u}
              exerciseTitle={exerciseDetail?.title || selectedExercise.t}
              niveau={selectedNiveau}
              nbQuestions={nbQuestions}
              displayDuration={displayDuration}
              selectedOptions={getSelectedOptionsObject()}
              onClose={() => setShowSessionCreator(false)}
            />
          </div>
        )}
      </ExerciseModal>
    </div>
  )
}

export default function ExercicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExercicesCatalogueContent />
    </Suspense>
  )
}
