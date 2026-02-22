'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface SessionContext {
  sessionId: string
  sessionCode: string
  studentId: string
  title: string
}

interface ExerciseResult {
  score: number
  total: number
  exerciseUrl: string
  exerciseTitle: string
}

/**
 * Convertit une URL iframe MathsMentales en URL partageable de l'app.
 * Ex: /mathsmentales/diaporama.html?c=... → /play?mode=diaporama&c=...
 */
function makeShareableUrl(iframeUrl: string): string {
  try {
    const url = new URL(iframeUrl, window.location.origin)
    const pathname = url.pathname

    // Extraire le mode depuis le pathname (ex: /mathsmentales/diaporama.html → diaporama)
    const match = pathname.match(/\/mathsmentales\/(\w+)\.html/)
    if (!match) return window.location.href

    const mode = match[1]
    const params = url.search // ?c=... etc.

    // Construire l'URL partageable avec le mode et les params d'exercice
    return `${window.location.origin}/play?mode=${mode}${params ? '&' + params.slice(1) : ''}`
  } catch {
    return window.location.href
  }
}

function PlayContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const supabase = createClient()

  const sessionCode = searchParams.get('session')
  const mode = searchParams.get('mode') || 'index'
  // Déterminer si c'est un lien partagé (a des params d'exercice)
  const hasExerciseParams = searchParams.has('c') || searchParams.has('u') || searchParams.has('n')
  const isSharedLink = hasExerciseParams && mode !== 'index'

  const [sessionCtx, setSessionCtx] = useState<SessionContext | null>(null)
  const [resultSaved, setResultSaved] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [result, setResult] = useState<ExerciseResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u)
        // Si lien partagé et pas connecté → auth prompt
        if (isSharedLink && !u) {
          setShowAuthPrompt(true)
        }
      } catch {
        if (isSharedLink) setShowAuthPrompt(true)
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [])

  // Charger le contexte de session si présent
  useEffect(() => {
    if (!sessionCode) return
    const loadSession = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) return
        const res = await fetch(`/api/sessions/${sessionCode}`)
        if (!res.ok) return
        const data = await res.json()
        setSessionCtx({
          sessionId: data.session.id,
          sessionCode: sessionCode,
          studentId: u.id,
          title: data.session.title || data.session.exercise_title,
        })
      } catch { /* continue sans contexte */ }
    }
    loadSession()
  }, [sessionCode])

  // Sauvegarder les résultats
  const saveResult = useCallback(async (score: number, total: number, exerciseUrl: string, exerciseTitle: string) => {
    if (resultSaved) return
    setResultSaved(true)

    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return

      if (sessionCtx) {
        await fetch('/api/sessions/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionCode: sessionCtx.sessionCode,
            score,
            totalQuestions: total,
            timeSpent: 0,
            details: [],
          }),
        })
      } else {
        // Exercice libre : extraire un ID plus parlant depuis l'URL
        const exerciceId = exerciseUrl
          ? 'mm-' + extractExerciseId(exerciseUrl)
          : 'mathsmentales-' + mode
        await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciceId,
            exerciceTitle: exerciseTitle || 'MathsMentales - ' + mode,
            niveau: '',
            score,
            totalQuestions: total,
            timeSpent: 0,
            answers: [],
          }),
        })
      }
    } catch (err) {
      console.error('Erreur sauvegarde résultat:', err)
    }
  }, [sessionCtx, resultSaved, mode])

  // Écouter les postMessage du bridge.js
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'mathsmentales-result') {
        const score = data.score ?? data.nbBonnesReponses ?? 0
        const total = data.total ?? (score + (data.nbMauvaisesReponses ?? 0))
        const exerciseUrl = data.exerciseUrl || data.url || ''
        const exerciseTitle = data.exerciseTitle || ''

        if (total > 0) {
          saveResult(score, total, exerciseUrl, exerciseTitle)

          // Générer l'URL partageable et afficher l'overlay
          const url = makeShareableUrl(exerciseUrl)
          setShareUrl(url)
          setResult({ score, total, exerciseUrl, exerciseTitle })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [saveResult])

  // Construire l'URL de l'iframe avec les params d'exercice
  const getIframeUrl = () => {
    const validModes = [
      'index', 'diaporama', 'exercices', 'ceinture', 'wall',
      'puzzle', 'duel', 'cartesflash', 'courseauxnombres',
      'dominos', 'jaiquia', 'fichememo', 'exam', 'editor', 'editoryaml'
    ]
    const page = validModes.includes(mode) ? mode : 'index'

    // Transmettre les paramètres d'exercice à l'iframe
    const exerciseParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key !== 'mode' && key !== 'session') {
        exerciseParams.set(key, value)
      }
    })

    const queryString = exerciseParams.toString()
    return `/mathsmentales/${page}.html${queryString ? '?' + queryString : ''}`
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback pour navigateurs sans clipboard API
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogin = () => {
    // Sauvegarder l'URL actuelle pour revenir après connexion
    sessionStorage.setItem('mathsmentales_redirect', window.location.pathname + window.location.search)
    router.push('/auth/login')
  }

  const handlePlayWithoutAccount = () => {
    setShowAuthPrompt(false)
  }

  const dismissOverlay = () => {
    setResult(null)
    setResultSaved(false) // Permettre de sauvegarder un nouveau résultat
  }

  // Attendre la vérification d'auth
  if (!authChecked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  // Auth prompt pour les liens partagés
  if (showAuthPrompt) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: 'white', borderRadius: 20,
          padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧮</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' }}>
            Exercice de maths
          </h1>
          <p style={{ color: '#666', marginBottom: 32, lineHeight: 1.5 }}>
            Connecte-toi avec ton compte Google pour que ton professeur puisse voir tes résultats.
          </p>

          <button
            onClick={handleLogin}
            style={{
              width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600,
              background: '#4f46e5', color: 'white', border: 'none', borderRadius: 12,
              cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Se connecter avec Google
          </button>

          <button
            onClick={handlePlayWithoutAccount}
            style={{
              width: '100%', padding: '12px 24px', fontSize: 14, fontWeight: 500,
              background: 'transparent', color: '#888', border: '1px solid #ddd',
              borderRadius: 12, cursor: 'pointer'
            }}
          >
            Continuer sans compte
          </button>
          <p style={{ marginTop: 12, fontSize: 12, color: '#aaa' }}>
            Sans connexion, tes résultats ne seront pas enregistrés.
          </p>
        </div>
      </div>
    )
  }

  const scorePercent = result ? Math.round((result.score / result.total) * 100) : 0
  const scoreColor = scorePercent >= 80 ? '#22c55e' : scorePercent >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <iframe
        ref={iframeRef}
        src={getIframeUrl()}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', border: 'none' }}
        allow="fullscreen"
        title="MathsMentales"
      />

      {/* Overlay de résultat avec lien de partage */}
      {result && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: 20
        }}>
          <div style={{
            maxWidth: 480, width: '100%', background: 'white', borderRadius: 20,
            padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Score */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 80, height: 80, borderRadius: '50%',
                background: scoreColor + '15', border: `3px solid ${scoreColor}`,
                fontSize: 28, fontWeight: 700, color: scoreColor, marginBottom: 12
              }}>
                {result.score}/{result.total}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                {scorePercent >= 80 ? 'Excellent !' : scorePercent >= 50 ? 'Pas mal !' : 'Continue tes efforts !'}
              </h2>
              {result.exerciseTitle && (
                <p style={{ color: '#666', marginTop: 4, fontSize: 14 }}>{result.exerciseTitle}</p>
              )}
              {user && (
                <p style={{ color: '#22c55e', marginTop: 8, fontSize: 13 }}>
                  ✓ Résultat enregistré
                </p>
              )}
            </div>

            {/* Lien de partage */}
            <div style={{
              background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 16
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Lien pour refaire cet exercice :
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid #ddd',
                    borderRadius: 8, background: 'white', color: '#374151',
                    overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    background: copied ? '#22c55e' : '#4f46e5', color: 'white',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'background 0.2s'
                  }}
                >
                  {copied ? '✓ Copié !' : 'Copier'}
                </button>
              </div>
            </div>

            {/* Info pour le prof */}
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20, lineHeight: 1.4 }}>
              Collez ce lien dans Pronote, Google Classroom ou votre cahier de texte.
              Les élèves devront se connecter avec Google pour que leurs résultats soient suivis.
            </p>

            {/* Bouton fermer */}
            <button
              onClick={dismissOverlay}
              style={{
                width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600,
                background: '#f3f4f6', color: '#374151', border: 'none',
                borderRadius: 12, cursor: 'pointer'
              }}
            >
              Fermer et continuer
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Extraire un ID d'exercice lisible depuis l'URL MathsMentales
 * Ex: /mathsmentales/diaporama.html?c=N6/6NC2.json~... → diaporama-6NC2
 */
function extractExerciseId(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost')
    const pathname = parsed.pathname
    const mode = pathname.match(/\/(\w+)\.html/)?.[1] || 'unknown'

    // Essayer d'extraire l'ID de l'exercice depuis les params
    const c = parsed.searchParams.get('c') || ''
    const match = c.match(/(\w+)\.json/)
    if (match) return mode + '-' + match[1]

    const u = parsed.searchParams.get('u') || ''
    const matchU = u.match(/(\w+)\.json/)
    if (matchU) return mode + '-' + matchU[1]

    return mode
  } catch {
    return 'unknown'
  }
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement...
      </div>
    }>
      <PlayContent />
    </Suspense>
  )
}
