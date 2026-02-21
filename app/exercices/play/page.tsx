'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ExerciceJSON } from '@/lib/exercises'
import { generateQuestion, type Question } from '@/lib/exercises'

interface GameState {
  status: 'loading' | 'config' | 'ready_to_start' | 'countdown' | 'playing' | 'finished'
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

/** Render a string that may contain LaTeX (between $$ or inline) */
function MathDisplay({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || !text) return
    // Check if text contains LaTeX markers
    const hasLatex = text.includes('$$') || text.includes('\\') || text.includes('{')
    if (hasLatex) {
      try {
        // Remove $$ wrappers if present
        const cleaned = text.replace(/^\$\$|\$\$$/g, '').trim()
        katex.render(cleaned, ref.current, {
          throwOnError: false,
          displayMode: true,
          trust: true,
        })
        return
      } catch {
        // fallback to text
      }
    }
    ref.current.textContent = text
  }, [text])

  return <span ref={ref} className={className} />
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-lg">Chargement...</p>
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
  const optionsParam = searchParams.get('options')
  const optsParam = searchParams.get('opts')
  const durationParam = searchParams.get('d')

  const parsedSubOptions: Record<string, number[]> | null = (() => {
    if (optsParam) {
      try { return JSON.parse(optsParam) } catch { return null }
    }
    return null
  })()

  const displayDuration = durationParam ? parseInt(durationParam) : 8

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
    optionsParam ? optionsParam.split(',').map(n => parseInt(n)).filter(n => !isNaN(n)) :
    parsedSubOptions ? Object.keys(parsedSubOptions).map(Number) : []
  )
  const [userAnswer, setUserAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [timerProgress, setTimerProgress] = useState(100)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Focus input during play
  useEffect(() => {
    if (state.status === 'playing' && !showFeedback) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [state.status, state.currentIndex, showFeedback])

  // Timer visuel pour chaque question
  useEffect(() => {
    if (state.status === 'playing' && !showFeedback) {
      setTimerProgress(100)
      const startTime = Date.now()
      const duration = displayDuration * 1000

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
        setTimerProgress(remaining)
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }, 50)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [state.status, state.currentIndex, showFeedback, displayDuration])

  // Countdown animation
  useEffect(() => {
    if (state.status !== 'countdown') return
    if (countdown <= 0) {
      setState(prev => ({ ...prev, status: 'playing', questionStartTime: Date.now() }))
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 700)
    return () => clearTimeout(timer)
  }, [state.status, countdown])

  // Save results
  const saveResults = useCallback(async () => {
    if (!state.exercice || state.answers.length === 0) return

    setSaving(true)
    try {
      const scoreValue = state.answers.filter(a => a.isCorrect).length
      const totalTimeSpent = state.answers.reduce((sum, a) => sum + a.timeSpent, 0)

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

      if (response.ok) setSaved(true)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
    } finally {
      setSaving(false)
    }
  }, [state.exercice, state.answers, state.questions.length, niveau, sessionCode])

  useEffect(() => {
    if (state.status === 'finished' && !saved && !saving) saveResults()
  }, [state.status, saved, saving, saveResults])

  // Load exercise
  useEffect(() => {
    async function loadExercice() {
      if (!file) {
        setError('Aucun exercice spécifié')
        return
      }
      try {
        const response = await fetch(`/library/${file}`)
        if (!response.ok) throw new Error('Impossible de charger l\'exercice')
        const data: ExerciceJSON = await response.json()
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

  // Auto-start
  useEffect(() => {
    if (state.status === 'ready_to_start' && state.exercice) startGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.exercice])

  const startGame = useCallback(() => {
    if (!state.exercice) return

    const questions: Question[] = []
    const optionsToUse = selectedOptions.length > 0 ? selectedOptions :
      (selectedOption !== null ? [selectedOption] : undefined)

    for (let i = 0; i < nbQuestions; i++) {
      try {
        let optionIndex: number | undefined
        if (optionsToUse && optionsToUse.length > 0) {
          optionIndex = optionsToUse[Math.floor(Math.random() * optionsToUse.length)]
        }
        const q = generateQuestion(state.exercice, optionIndex)
        questions.push(q)
      } catch (err) {
        console.error('Erreur génération question:', err)
      }
    }

    if (questions.length === 0) {
      setError('Impossible de générer les questions')
      return
    }

    setCountdown(3)
    setState(prev => ({
      ...prev,
      status: 'countdown',
      questions,
      currentIndex: 0,
      answers: [],
      startTime: Date.now(),
      questionStartTime: Date.now(),
    }))
  }, [state.exercice, nbQuestions, selectedOption, selectedOptions])

  const checkAnswer = useCallback(() => {
    if (state.status !== 'playing') return
    if (timerRef.current) clearInterval(timerRef.current)

    const currentQuestion = state.questions[state.currentIndex]
    const timeSpent = (Date.now() - state.questionStartTime) / 1000

    const normalizedUser = userAnswer.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
    const normalizedCorrect = currentQuestion.value.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
    const correct = normalizedUser === normalizedCorrect

    setIsCorrect(correct)
    setShowFeedback(true)

    setState(prev => ({
      ...prev,
      answers: [...prev.answers, { question: currentQuestion, userAnswer, isCorrect: correct, timeSpent }],
    }))

    setTimeout(() => {
      setShowFeedback(false)
      setUserAnswer('')
      setState(prev => {
        if (prev.currentIndex + 1 >= prev.questions.length) {
          return { ...prev, status: 'finished' }
        }
        return { ...prev, currentIndex: prev.currentIndex + 1, questionStartTime: Date.now() }
      })
    }, 1500)
  }, [state, userAnswer])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showFeedback && userAnswer.trim()) checkAnswer()
  }

  const score = state.answers.filter(a => a.isCorrect).length
  const totalTime = state.answers.reduce((sum, a) => sum + a.timeSpent, 0)

  // === ERROR ===
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">&#x26A0;</div>
          <p className="text-xl mb-6">{error}</p>
          <Link href="/exercices" className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-all">
            Retour aux exercices
          </Link>
        </div>
      </div>
    )
  }

  // === LOADING ===
  if (state.status === 'loading' || state.status === 'ready_to_start') {
    return <LoadingSpinner />
  }

  // === CONFIG ===
  if (state.status === 'config' && state.exercice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">{state.exercice.title}</h1>
          <p className="text-gray-500 mb-6">Configurez votre session</p>

          <div className="space-y-6">
            {/* Nombre de questions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setNbQuestions(n)}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                      nbQuestions === n
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            {state.exercice.options.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de question</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedOption(null)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedOption === null
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">Mélange</span>
                    <span className="text-gray-500 text-sm ml-2">(tous les types)</span>
                  </button>
                  {state.exercice.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        selectedOption === idx
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-600/30"
            >
              C&apos;est parti !
            </button>
          </div>
        </div>
      </div>
    )
  }

  // === COUNTDOWN ===
  if (state.status === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 text-xl mb-4">{state.exercice?.title}</div>
          <div
            className="text-9xl font-black text-white animate-bounce"
            style={{ animationDuration: '0.5s' }}
          >
            {countdown > 0 ? countdown : ''}
          </div>
          {countdown === 0 && (
            <div className="text-4xl font-bold text-green-400 animate-pulse">GO !</div>
          )}
        </div>
      </div>
    )
  }

  // === PLAYING ===
  if (state.status === 'playing') {
    const currentQuestion = state.questions[state.currentIndex]
    const timerColor = timerProgress > 50 ? 'bg-green-400' : timerProgress > 20 ? 'bg-yellow-400' : 'bg-red-400'

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col">
        {/* Header compact */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex justify-between items-center text-white/70 text-sm mb-2">
            <span>Question {state.currentIndex + 1} / {state.questions.length}</span>
            <span className="font-mono text-lg text-white">
              {score} <span className="text-white/50">/ {state.answers.length}</span>
            </span>
          </div>
          {/* Timer bar */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${timerColor} transition-all duration-100 ease-linear rounded-full`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>

        {/* Question zone */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
          {/* Question display */}
          <div className={`mb-8 transition-all duration-300 ${showFeedback ? 'scale-95 opacity-50' : 'scale-100'}`}>
            <div className="text-white text-center">
              <MathDisplay
                text={currentQuestion.questionLatex || currentQuestion.question}
                className="text-4xl md:text-6xl font-bold"
              />
            </div>
          </div>

          {/* Input zone */}
          <div className="w-full max-w-md">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={showFeedback}
              autoFocus
              autoComplete="off"
              placeholder="?"
              className={`w-full text-center text-4xl py-5 px-6 rounded-2xl border-4 outline-none transition-all font-bold ${
                showFeedback
                  ? isCorrect
                    ? 'border-green-400 bg-green-500/20 text-green-300'
                    : 'border-red-400 bg-red-500/20 text-red-300'
                  : 'border-white/30 bg-white/10 text-white placeholder-white/30 focus:border-white/60 focus:bg-white/15'
              }`}
            />

            {/* Feedback */}
            {showFeedback && (
              <div className={`mt-4 text-center text-xl font-bold animate-in fade-in ${
                isCorrect ? 'text-green-400' : 'text-red-400'
              }`}>
                {isCorrect ? (
                  <span>Correct !</span>
                ) : (
                  <span>
                    Réponse : <MathDisplay text={currentQuestion.answerLatex || currentQuestion.value} className="inline" />
                  </span>
                )}
              </div>
            )}

            {/* Validate button */}
            {!showFeedback && (
              <button
                onClick={checkAnswer}
                disabled={!userAnswer.trim()}
                className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-2xl font-bold text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur"
              >
                Valider
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  // === FINISHED ===
  if (state.status === 'finished') {
    const percentage = Math.round((score / state.questions.length) * 100)
    const avgTime = totalTime / state.questions.length
    const scoreColor = percentage >= 80 ? 'text-green-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
    const scoreBg = percentage >= 80 ? 'from-green-500/20' : percentage >= 50 ? 'from-yellow-500/20' : 'from-red-500/20'

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          {/* Score principal */}
          <div className={`bg-gradient-to-b ${scoreBg} to-transparent rounded-3xl p-8 text-center mb-6`}>
            <p className="text-white/60 text-lg mb-2">{state.exercice?.title}</p>

            <div className={`text-8xl font-black ${scoreColor} mb-2`}>
              {percentage}%
            </div>
            <div className="text-white/80 text-2xl font-medium">
              {score} / {state.questions.length} correct{score > 1 ? 's' : ''}
            </div>

            {/* Save status */}
            {saving && <p className="text-white/50 text-sm mt-4">Sauvegarde en cours...</p>}
            {saved && <p className="text-green-400/80 text-sm mt-4">Résultat sauvegardé</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-white/50 text-xs uppercase tracking-wide">Temps total</div>
              <div className="text-white text-2xl font-bold mt-1">{Math.round(totalTime)}s</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-white/50 text-xs uppercase tracking-wide">Temps moyen</div>
              <div className="text-white text-2xl font-bold mt-1">{avgTime.toFixed(1)}s</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-white/50 text-xs uppercase tracking-wide">Meilleur</div>
              <div className="text-white text-2xl font-bold mt-1">
                {state.answers.length > 0 ? Math.min(...state.answers.map(a => a.timeSpent)).toFixed(1) : 0}s
              </div>
            </div>
          </div>

          {/* Détail des réponses */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
            <h2 className="text-white font-bold text-lg mb-3">Détail des réponses</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {state.answers.map((answer, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    answer.isCorrect ? 'bg-green-500/15' : 'bg-red-500/15'
                  }`}
                >
                  <span className={`text-lg ${answer.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {answer.isCorrect ? '\u2713' : '\u2717'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MathDisplay
                      text={answer.question.questionLatex || answer.question.question}
                      className="text-white/80 text-sm"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-mono text-sm ${answer.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {answer.userAnswer || '—'}
                    </span>
                    {!answer.isCorrect && (
                      <span className="text-white/40 text-xs ml-2">({answer.question.value})</span>
                    )}
                  </div>
                  <span className="text-white/30 text-xs">{answer.timeSpent.toFixed(1)}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSaved(false)
                startGame()
              }}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
            >
              Recommencer
            </button>
            <Link
              href="/exercices"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl font-bold text-lg transition-all text-center"
            >
              Autres exercices
            </Link>
          </div>
        </div>
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
