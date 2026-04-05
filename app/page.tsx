'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import QuickSessionCreator from '@/components/QuickSessionCreator'

interface SessionCreatorData {
  exerciseFile: string
  exerciseTitle: string
  niveau: string | null
  nbQuestions: number
  displayDuration: number
  selectedOptions: Record<string, number[]>
  exerciseUrl: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [sessionCreator, setSessionCreator] = useState<SessionCreatorData | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      setUser(data.user)
      setAuthChecked(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sauvegarder un résultat d'exercice
  const saveResult = useCallback(async (data: {
    score: number
    total: number
    exerciseUrl: string
    exerciseTitle: string
  }) => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return

      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciceId: 'mm-' + extractActivityId(data.exerciseUrl),
          exerciceTitle: data.exerciseTitle || 'MathsMentales',
          niveau: '',
          score: data.score,
          totalQuestions: data.total,
          timeSpent: 0,
          answers: [],
        }),
      })
    } catch (err) {
      console.error('Erreur sauvegarde résultat:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Écouter les postMessage de bridge.js (via fenêtres ouvertes par window.open)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'mathsmentales-result') {
        const score = data.score ?? 0
        const total = data.total ?? 0
        if (total > 0) {
          saveResult({
            score,
            total,
            exerciseUrl: data.exerciseUrl || '',
            exerciseTitle: data.exerciseTitle || '',
          })
        }
      }

      if (data.type === 'mm-create-session') {
        const rawUrl = data.exerciseUrl || ''
        const parsed = parseExerciseUrl(rawUrl)
        setSessionCreator({
          exerciseFile: parsed.exerciseFile,
          exerciseTitle: data.exerciseTitle || 'Exercice MathsMentales',
          niveau: parsed.niveau,
          nbQuestions: parsed.nbQuestions,
          displayDuration: parsed.displayDuration,
          selectedOptions: parsed.selectedOptions,
          exerciseUrl: rawUrl,
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [saveResult])

  return (
    <div className="h-screen flex flex-col">
      {/* Barre de navigation Next.js */}
      <nav className="h-12 min-h-[48px] flex items-center justify-between px-4 bg-slate-800 text-white z-[100]">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">MathsMentales</span>
          <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">
            COLLEGE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {authChecked && (
            user ? (
              <Link
                href="/dashboard"
                className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold no-underline hover:bg-blue-600 transition-colors"
              >
                Mon espace
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold no-underline hover:bg-blue-600 transition-colors"
              >
                Se connecter
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Site MathsMentales original en iframe */}
      <iframe
        src="/mathsmentales/index.html"
        className="flex-1 border-none w-full"
        allow="fullscreen"
        title="MathsMentales"
      />

      {/* Modale de création de session */}
      {sessionCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-5">
          <div className="bg-white rounded-2xl p-6 max-w-[480px] w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-1">
              Créer une session
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {sessionCreator.exerciseTitle}
            </p>
            <QuickSessionCreator
              exerciseFile={sessionCreator.exerciseFile}
              exerciseTitle={sessionCreator.exerciseTitle}
              niveau={sessionCreator.niveau}
              nbQuestions={sessionCreator.nbQuestions}
              displayDuration={sessionCreator.displayDuration}
              selectedOptions={sessionCreator.selectedOptions}
              exerciseUrl={sessionCreator.exerciseUrl}
              onClose={() => setSessionCreator(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Extraire l'ID d'activité depuis une URL MathsMentales */
function extractActivityId(url: string): string {
  try {
    const match = url.match(/_i=(\w+)~/) || url.match(/i=(\w+)~/)
    if (match) return match[1]
    const jsonMatch = url.match(/(\w+)\.json/)
    if (jsonMatch) return jsonMatch[1]
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/** Parser une URL MathsMentales pour extraire les paramètres d'exercice */
function parseExerciseUrl(url: string): {
  exerciseFile: string
  niveau: string | null
  nbQuestions: number
  displayDuration: number
  selectedOptions: Record<string, number[]>
} {
  const defaults = {
    exerciseFile: '',
    niveau: null as string | null,
    nbQuestions: 5,
    displayDuration: 8,
    selectedOptions: {} as Record<string, number[]>,
  }

  try {
    const idMatch = url.match(/_i=(\w+)~/) || url.match(/[&?]i=(\w+)/)
    if (!idMatch) return defaults

    const activityId = idMatch[1]
    const niveauMatch = activityId.match(/^(\d)/)
    const niveau = niveauMatch ? niveauMatch[1] : null
    const exerciseFile = `N${niveau}/${activityId}.json`

    // Extraire nb questions (~n=5)
    const nbMatch = url.match(/~n=(\d+)/)
    const nbQuestions = nbMatch ? parseInt(nbMatch[1]) : 5

    // Extraire durée (~t=8)
    const tMatch = url.match(/~t=(\d+)/)
    const displayDuration = tMatch ? parseInt(tMatch[1]) : 8

    // Extraire options (~o=0,1,2)
    const oMatch = url.match(/_i=\w+~o=([^~]*)/)
    const selectedOptions: Record<string, number[]> = {}
    if (oMatch && oMatch[1]) {
      oMatch[1].split(',').forEach((v, i) => {
        if (v !== '') selectedOptions[String(i)] = [parseInt(v)]
      })
    }

    return { exerciseFile, niveau, nbQuestions, displayDuration, selectedOptions }
  } catch {
    return defaults
  }
}
