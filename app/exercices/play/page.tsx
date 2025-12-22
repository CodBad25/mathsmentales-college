'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ExerciceJSON } from '@/lib/exercises'
import { generateQuestion, type Question } from '@/lib/exercises'

interface GameState {
  status: 'loading' | 'config' | 'ready_to_start' | 'playing' | 'finished'
  exercice: ExerciceJSON | null
  questions: Question[]
  currentIndex: number
  answers: {
    question: Question
    userAnswer: string
    isCorrect: boolean
    timeSpent: number
  }[]
  startTime: number
  questionStartTime: number
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

function PlayContent() {
  const searchParams = useSearchParams()
  const file = searchParams.get('file')
  const niveau = searchParams.get('niveau')
  const sessionCode = searchParams.get('session')
  const nbQuestionsParam = searchParams.get('n')
  const autostart = searchParams.get('autostart') === 'true'
  const optionsParam = searchParams.get('options') // Liste des options sélectionnées: "0,1,2"

  const [state, setState] = useState<GameState>({
    status: 'loading',
    exercice: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    startTime: 0,
    questionStartTime: 0,
  })

  const [nbQuestions, setNbQuestions] = useState(nbQuestionsParam ? parseInt(nbQuestionsParam) : 10)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<number[]>(
    optionsParam ? optionsParam.split(',').map(n => parseInt(n)).filter(n => !isNaN(n)) : []
  )
  const [userAnswer, setUserAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Ref pour focus automatique sur l'input
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus automatique sur l'input quand le jeu démarre ou après chaque question
  useEffect(() => {
    if (state.status === 'playing' && !showFeedback) {
      // Petit délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [state.status, state.currentIndex, showFeedback])

  // Sauvegarder les resultats
  const saveResults = useCallback(async () => {
    if (!state.exercice || state.answers.length === 0) return

    setSaving(true)
    try {
      const scoreValue = state.answers.filter(a => a.isCorrect).length
      const totalTimeSpent = state.answers.reduce((sum, a) => sum + a.timeSpent, 0)

      // Sauvegarder dans l'historique general
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciceId: state.exercice.ID,
          exerciceTitle: state.exercice.title,
          niveau,
          score: scoreValue,
          totalQuestions: state.questions.length,
          timeSpent: totalTimeSpent,
          answers: state.answers.map(a => ({
            question: a.question.question,
            studentAnswer: a.userAnswer,
            correctAnswer: a.question.value,
            isCorrect: a.isCorrect,
            timeTaken: a.timeSpent,
          })),
        }),
      })

      // Si c'est une session, sauvegarder aussi dans session_results
      if (sessionCode) {
        await fetch('/api/sessions/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionCode,
            score: scoreValue,
            totalQuestions: state.questions.length,
            timeSpent: Math.round(totalTimeSpent),
            details: state.answers.map(a => ({
              question: a.question.question,
              studentAnswer: a.userAnswer,
              correctAnswer: a.question.value,
              isCorrect: a.isCorrect,
              timeTaken: a.timeSpent,
            })),
          }),
        })
      }

      if (response.ok) {
        setSaved(true)
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
    } finally {
      setSaving(false)
    }
  }, [state.exercice, state.answers, state.questions.length, niveau, sessionCode])

  // Sauvegarder quand le jeu est termine
  useEffect(() => {
    if (state.status === 'finished' && !saved && !saving) {
      saveResults()
    }
  }, [state.status, saved, saving, saveResults])

  // Charger l'exercice
  useEffect(() => {
    async function loadExercice() {
      if (!file) {
        setError('Aucun exercice specifie')
        return
      }

      try {
        const response = await fetch(`/library/${file}`)
        if (!response.ok) {
          throw new Error('Impossible de charger l\'exercice')
        }
        const data: ExerciceJSON = await response.json()
        // Si autostart ou sessionCode, aller directement au jeu
        const shouldAutoStart = autostart || !!sessionCode
        setState(prev => ({
          ...prev,
          status: shouldAutoStart ? 'ready_to_start' : 'config',
          exercice: data,
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    }

    loadExercice()
  }, [file, sessionCode, autostart])

  // Auto-demarrer si autostart ou session
  useEffect(() => {
    if (state.status === 'ready_to_start' && state.exercice) {
      startGame()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.exercice])

  // Demarrer le jeu
  const startGame = useCallback(() => {
    if (!state.exercice) return

    const questions: Question[] = []
    // Si des options sont passées via URL, les utiliser pour la génération
    const optionsToUse = selectedOptions.length > 0 ? selectedOptions :
      (selectedOption !== null ? [selectedOption] : undefined)

    for (let i = 0; i < nbQuestions; i++) {
      try {
        // Choisir une option aléatoire parmi celles sélectionnées
        let optionIndex: number | undefined
        if (optionsToUse && optionsToUse.length > 0) {
          optionIndex = optionsToUse[Math.floor(Math.random() * optionsToUse.length)]
        }
        const q = generateQuestion(state.exercice, optionIndex)
        questions.push(q)
      } catch (err) {
        console.error('Erreur generation question:', err)
      }
    }

    if (questions.length === 0) {
      setError('Impossible de generer les questions')
      return
    }

    setState(prev => ({
      ...prev,
      status: 'playing',
      questions,
      currentIndex: 0,
      answers: [],
      startTime: Date.now(),
      questionStartTime: Date.now(),
    }))
  }, [state.exercice, nbQuestions, selectedOption, selectedOptions])

  // Verifier la reponse
  const checkAnswer = useCallback(() => {
    if (state.status !== 'playing') return

    const currentQuestion = state.questions[state.currentIndex]
    const timeSpent = (Date.now() - state.questionStartTime) / 1000

    // Normaliser les reponses pour comparaison
    const normalizedUser = userAnswer.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
    const normalizedCorrect = currentQuestion.value.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')

    const correct = normalizedUser === normalizedCorrect

    setIsCorrect(correct)
    setShowFeedback(true)

    setState(prev => ({
      ...prev,
      answers: [
        ...prev.answers,
        {
          question: currentQuestion,
          userAnswer,
          isCorrect: correct,
          timeSpent,
        },
      ],
    }))

    // Passer a la question suivante apres un delai
    setTimeout(() => {
      setShowFeedback(false)
      setUserAnswer('')

      setState(prev => {
        if (prev.currentIndex + 1 >= prev.questions.length) {
          return { ...prev, status: 'finished' }
        }
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          questionStartTime: Date.now(),
        }
      })
    }, 1500)
  }, [state, userAnswer])

  // Gerer la touche Entree
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showFeedback && userAnswer.trim()) {
      checkAnswer()
    }
  }

  // Calculer le score
  const score = state.answers.filter(a => a.isCorrect).length
  const totalTime = state.answers.reduce((sum, a) => sum + a.timeSpent, 0)

  // Affichage erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/exercices" className="text-primary-600 hover:underline">
            Retour aux exercices
          </Link>
        </div>
      </div>
    )
  }

  // Affichage chargement
  if (state.status === 'loading' || state.status === 'ready_to_start') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Affichage configuration
  if (state.status === 'config' && state.exercice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/exercices" className="text-primary-600 hover:underline">
              &larr; Retour aux exercices
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold mb-2">{state.exercice.title}</h1>
            <p className="text-gray-600 mb-6">Configurez votre session d&apos;entrainement</p>

            <div className="space-y-6">
              {/* Nombre de questions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de questions
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setNbQuestions(n)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        nbQuestions === n
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type de question */}
              {state.exercice.options.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de question
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedOption(null)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        selectedOption === null
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">Melange</span>
                      <span className="text-gray-500 text-sm ml-2">(tous les types)</span>
                    </button>
                    {state.exercice.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(idx)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          selectedOption === idx
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={startGame}
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all"
              >
                Commencer
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Affichage jeu en cours
  if (state.status === 'playing') {
    const currentQuestion = state.questions[state.currentIndex]

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
        {/* Barre de progression */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Question {state.currentIndex + 1} / {state.questions.length}
              </span>
              <span className="text-sm font-medium text-primary-600">
                Score: {score} / {state.answers.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${((state.currentIndex + 1) / state.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Zone de question */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
            {/* Question */}
            <div className="text-3xl md:text-4xl font-bold mb-8 min-h-[100px] flex items-center justify-center">
              <span>{currentQuestion.question}</span>
            </div>

            {/* Input reponse */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={showFeedback}
                autoFocus
                autoComplete="off"
                placeholder="Votre reponse..."
                className={`w-full text-center text-2xl py-4 px-6 rounded-xl border-2 transition-all outline-none ${
                  showFeedback
                    ? isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-primary-500'
                }`}
              />

              {/* Feedback */}
              {showFeedback && (
                <div className={`mt-4 text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect ? (
                    <span>Correct !</span>
                  ) : (
                    <span>
                      Incorrect. La reponse etait : <strong>{currentQuestion.value}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bouton valider */}
            {!showFeedback && (
              <button
                onClick={checkAnswer}
                disabled={!userAnswer.trim()}
                className="mt-6 bg-primary-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Affichage resultats
  if (state.status === 'finished') {
    const percentage = Math.round((score / state.questions.length) * 100)

    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Session terminee !</h1>
            <p className="text-gray-600 mb-2">{state.exercice?.title}</p>

            {/* Indicateur de sauvegarde */}
            {saving && (
              <p className="text-sm text-gray-500 mb-6">Sauvegarde en cours...</p>
            )}
            {saved && (
              <p className="text-sm text-green-600 mb-6">Resultat sauvegarde !</p>
            )}

            {/* Score principal */}
            <div className={`text-6xl font-bold mb-4 ${
              percentage >= 80 ? 'text-green-600' :
              percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {score} / {state.questions.length}
            </div>
            <div className="text-2xl text-gray-600 mb-8">
              {percentage}% de reussite
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Temps total</div>
                <div className="text-xl font-bold">{Math.round(totalTime)}s</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Temps moyen</div>
                <div className="text-xl font-bold">{Math.round(totalTime / state.questions.length)}s</div>
              </div>
            </div>

            {/* Detail des reponses */}
            <div className="text-left mb-8">
              <h2 className="font-bold text-lg mb-4">Detail des reponses</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {state.answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex justify-between items-center ${
                      answer.isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div>
                      <span className="text-sm text-gray-600">Q{idx + 1}: </span>
                      <span dangerouslySetInnerHTML={{ __html: answer.question.question.substring(0, 50) }} />
                    </div>
                    <div className="text-right">
                      <span className={`font-medium ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {answer.userAnswer}
                      </span>
                      {!answer.isCorrect && (
                        <span className="text-gray-500 text-sm ml-2">
                          ({answer.question.value})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSaved(false)
                  setState(prev => ({
                    ...prev,
                    status: 'config',
                    questions: [],
                    currentIndex: 0,
                    answers: [],
                  }))
                }}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all"
              >
                Recommencer
              </button>
              <Link
                href="/exercices"
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all text-center"
              >
                Autres exercices
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PlayContent />
    </Suspense>
  )
}
