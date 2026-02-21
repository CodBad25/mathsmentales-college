'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AttemptDetail {
  score: number
  total_questions: number
  time_spent: number
  completed_at: string
}

interface SessionResult {
  session_id: string
  session_title: string
  attempts: number
  best_score: number
  last_score: number
  first_score: number
  progression: number
  total_time: number
  last_completed: string
  details: AttemptDetail[]
}

interface AutonomousResult {
  id: string
  exercice_id: string
  exercice_title: string
  niveau: string
  score: number
  total_questions: number
  percentage: number
  time_spent: number
  completed_at: string
}

interface StudentDetails {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  gender: 'M' | 'F' | null
  birth_date: string | null
  classes: { id: string; name: string }[]
  session_results: SessionResult[]
  autonomous_results: AutonomousResult[]
  stats: {
    total_attempts: number
    unique_sessions: number
    total_autonomous: number
    average_score: number
    best_score: number
    total_time: number
    last_activity: string | null
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200'
  if (score >= 60) return 'bg-blue-50 border-blue-200'
  if (score >= 40) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function attemptColor(attempts: number): string {
  if (attempts === 0) return 'bg-red-100 text-red-400'
  if (attempts === 1) return 'bg-orange-100 text-orange-600'
  if (attempts <= 3) return 'bg-blue-100 text-blue-600'
  if (attempts <= 5) return 'bg-green-200 text-green-700'
  return 'bg-green-500 text-white'
}

function computeAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m${s > 0 ? s + 's' : ''}`
  const h = Math.floor(m / 60)
  return `${h}h${m % 60}m`
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
  return `Il y a ${Math.floor(days / 30)} mois`
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.id as string
  const classId = searchParams.get('classId')
  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'sessions' | 'autonome'>('sessions')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    loadStudent()
  }, [studentId])

  const loadStudent = async () => {
    try {
      const res = await fetch(`/api/students/${studentId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Élève non trouvé'); return }
      setStudent(data.student)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Élève non trouvé'}</p>
          <button onClick={() => router.back()} className="text-indigo-600 hover:underline">Retour</button>
        </div>
      </div>
    )
  }

  const isFille = student.gender === 'F'
  const genderGradient = isFille
    ? 'from-pink-500 to-rose-600'
    : student.gender === 'M' ? 'from-blue-500 to-indigo-600' : 'from-indigo-600 to-purple-600'
  const genderBg = isFille ? 'bg-pink-100 text-pink-700' : student.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
  const age = student.birth_date ? computeAge(student.birth_date) : null
  const initials = student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec couleur genre */}
      <header className={`bg-gradient-to-r ${genderGradient} text-white`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold">MathsMentales</Link>
          <button
            onClick={() => classId ? router.push(`/dashboard/classes/${classId}`) : router.back()}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Retour à la classe
          </button>
        </div>

        <div className="container mx-auto px-4 pb-6 pt-2">
          <div className="flex items-center gap-4 mb-4">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{student.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {student.classes.map(c => (
                  <Link key={c.id} href={`/dashboard/classes/${c.id}`} className="bg-white/20 text-sm px-3 py-0.5 rounded-full hover:bg-white/30 transition-colors">
                    {c.name}
                  </Link>
                ))}
                {age !== null && <span className="text-white/60 text-sm">{age} ans</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Moyenne</div>
              <div className="text-2xl font-black mt-0.5">{student.stats.average_score}%</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Sessions</div>
              <div className="text-2xl font-black mt-0.5">{student.stats.unique_sessions}</div>
              <div className="text-xs text-white/50 mt-0.5">{student.stats.total_attempts} tentatives</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Autonome</div>
              <div className="text-2xl font-black mt-0.5">{student.stats.total_autonomous}</div>
              <div className="text-xs text-white/50 mt-0.5">exercices libres</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Meilleur</div>
              <div className="text-2xl font-black mt-0.5">{student.stats.best_score}%</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center hidden md:block">
              <div className="text-white/60 text-xs uppercase tracking-wide">Temps total</div>
              <div className="text-2xl font-black mt-0.5">{formatDuration(student.stats.total_time)}</div>
              <div className="text-xs text-white/50 mt-0.5">{daysSince(student.stats.last_activity)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Onglets */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setTab('sessions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'sessions' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Sessions assignées ({student.session_results.length})
          </button>
          <button
            onClick={() => setTab('autonome')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'autonome' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Exercices autonomes ({student.autonomous_results.length})
          </button>
        </div>

        {/* Sessions assignées */}
        {tab === 'sessions' && (
          student.session_results.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500">Aucune session complétée.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {student.session_results.map((sess) => {
                const isExpanded = expandedSession === sess.session_id
                return (
                  <div key={sess.session_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Ligne principale */}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : sess.session_id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Badge investissement */}
                      <div className={`w-10 h-10 rounded-lg ${attemptColor(sess.attempts)} flex flex-col items-center justify-center shrink-0`}>
                        <span className="text-xs font-black leading-none">×{sess.attempts}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{sess.session_title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Dernière tentative : {daysSince(sess.last_completed)}
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-4 shrink-0">
                        {sess.attempts > 1 && (
                          <div className="text-center hidden sm:block">
                            <div className="text-xs text-gray-400">Progression</div>
                            <div className={`text-sm font-bold ${sess.progression > 0 ? 'text-green-600' : sess.progression < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {sess.progression > 0 ? '+' : ''}{sess.progression}%
                            </div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-xs text-gray-400">Meilleur</div>
                          <div className={`text-lg font-black ${scoreColor(sess.best_score)}`}>{sess.best_score}%</div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Détails des tentatives */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <div className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
                          Détail des {sess.attempts} tentative{sess.attempts > 1 ? 's' : ''}
                        </div>
                        <div className="space-y-2">
                          {sess.details.map((attempt, i) => {
                            const pct = Math.round((attempt.score / attempt.total_questions) * 100)
                            return (
                              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${scoreBg(pct)}`}>
                                <span className="text-xs text-gray-400 w-6 shrink-0">#{sess.details.length - i}</span>
                                <div className="flex-1">
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                                <span className={`text-sm font-bold ${scoreColor(pct)} w-12 text-right`}>{pct}%</span>
                                <span className="text-xs text-gray-400 w-10 text-right">{attempt.time_spent}s</span>
                                <span className="text-xs text-gray-400 w-24 text-right hidden sm:block">{formatDate(attempt.completed_at)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Exercices autonomes */}
        {tab === 'autonome' && (
          student.autonomous_results.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-2">Aucun exercice autonome.</p>
              <p className="text-sm text-gray-400">Les exercices faits librement depuis le catalogue apparaîtront ici.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-500">Exercice</th>
                    <th className="text-center p-3 font-medium text-gray-500 w-20">Niveau</th>
                    <th className="text-center p-3 font-medium text-gray-500 w-20">Score</th>
                    <th className="text-center p-3 font-medium text-gray-500 w-20">Temps</th>
                    <th className="text-right p-3 font-medium text-gray-500 w-32">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {student.autonomous_results.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{r.exercice_title || r.exercice_id}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{r.niveau || '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${scoreColor(r.percentage)}`}>{r.percentage}%</span>
                      </td>
                      <td className="p-3 text-center text-gray-500">{r.time_spent}s</td>
                      <td className="p-3 text-right text-gray-400 text-xs">{formatDate(r.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  )
}
