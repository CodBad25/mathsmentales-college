'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SessionGridCell {
  attempts: number
  bestScore: number
  avgScore: number
  lastScore: number
}

interface StudentStats {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  total_attempts: number
  sessions_completed: number
  average_score: number
  last_activity: string | null
  gender?: 'M' | 'F' | null
  birth_date?: string | null
  grid: Record<string, SessionGridCell>
}

interface SessionInfo {
  id: string
  title: string
  code: string
  exercise_title: string
  status: string
  created_at: string
}

interface ClassDetails {
  id: string
  name: string
  google_classroom_id: string | null
  students: StudentStats[]
  sessions: SessionInfo[]
  studentCount?: number
}

// Couleur investissement : rouge (0) → orange (1) → bleu (2-3) → vert clair (4-5) → vert foncé (6+)
function attemptColor(attempts: number): string {
  if (attempts === 0) return 'bg-red-100 text-red-400'
  if (attempts === 1) return 'bg-orange-100 text-orange-600'
  if (attempts <= 3) return 'bg-blue-100 text-blue-600'
  if (attempts <= 5) return 'bg-green-200 text-green-700'
  return 'bg-green-500 text-white'
}

function attemptBorder(attempts: number): string {
  if (attempts === 0) return 'border-red-200'
  if (attempts === 1) return 'border-orange-200'
  if (attempts <= 3) return 'border-blue-200'
  if (attempts <= 5) return 'border-green-300'
  return 'border-green-500'
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-700'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

function computeAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export default function ClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.id as string
  const [classData, setClassData] = useState<ClassDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attempts'>('name')
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [view, setView] = useState<'grid' | 'cards'>('grid')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadClass()
  }, [classId])

  const loadClass = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Classe non trouvée'); return }
      setClassData(data.class)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text.includes('\u00c3\u00a9') || text.includes('\u00c3\u00a8') || text.includes('\u00c3\u00a0')) {
        const reader2 = new FileReader()
        reader2.onload = (e2) => setCsvContent(e2.target?.result as string)
        reader2.readAsText(file, 'windows-1252')
      } else {
        setCsvContent(text)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImportCsv = async () => {
    if (!csvContent.trim()) return
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch(`/api/classes/${classId}/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult({ success: true, message: data.message })
        loadClass()
      } else {
        setImportResult({ success: false, message: data.error })
      }
    } catch {
      setImportResult({ success: false, message: 'Erreur réseau' })
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Classe non trouvée'}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">Retour au tableau de bord</Link>
        </div>
      </div>
    )
  }

  const { students, sessions } = classData

  // Tri
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'score') return b.average_score - a.average_score
    if (sortBy === 'attempts') return b.total_attempts - a.total_attempts
    return a.full_name.localeCompare(b.full_name)
  })

  // Stats globales
  const activeStudents = students.filter(s => s.sessions_completed > 0).length
  const avgClassScore = activeStudents > 0
    ? Math.round(students.filter(s => s.sessions_completed > 0).reduce((sum, s) => sum + s.average_score, 0) / activeStudents)
    : 0
  const totalAttempts = students.reduce((sum, s) => sum + s.total_attempts, 0)
  const filles = students.filter(s => s.gender === 'F').length
  const garcons = students.filter(s => s.gender === 'M').length
  const hasGenderData = filles > 0 || garcons > 0

  const daysSince = (dateStr: string | null) => {
    if (!dateStr) return null
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Hier'
    if (days < 7) return `Il y a ${days}j`
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
    return `Il y a ${Math.floor(days / 30)} mois`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold">MathsMentales</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-white text-sm transition-colors">
            Tableau de bord
          </Link>
        </div>

        <div className="container mx-auto px-4 pb-6 pt-2">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold">{classData.name}</h1>
            {classData.google_classroom_id && (
              <span className="bg-white/20 text-sm px-3 py-0.5 rounded-full">Classroom</span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Élèves</div>
              <div className="text-2xl font-black mt-0.5">{students.length}</div>
              <div className="text-xs text-white/50 mt-0.5">
                {filles > 0 && <span className="text-pink-300">{filles}F</span>}
                {filles > 0 && garcons > 0 && ' · '}
                {garcons > 0 && <span className="text-blue-300">{garcons}G</span>}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Actifs</div>
              <div className="text-2xl font-black mt-0.5">{activeStudents}</div>
              <div className="text-xs text-white/50 mt-0.5">{students.length > 0 ? Math.round(activeStudents / students.length * 100) : 0}%</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Moyenne</div>
              <div className={`text-2xl font-black mt-0.5 ${avgClassScore >= 70 ? 'text-green-300' : avgClassScore >= 50 ? 'text-amber-300' : 'text-red-300'}`}>
                {avgClassScore}%
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs uppercase tracking-wide">Tentatives</div>
              <div className="text-2xl font-black mt-0.5">{totalAttempts}</div>
              <div className="text-xs text-white/50 mt-0.5">{students.length > 0 ? (totalAttempts / students.length).toFixed(1) : 0}/élève</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center hidden md:block">
              <div className="text-white/60 text-xs uppercase tracking-wide">Sessions</div>
              <div className="text-2xl font-black mt-0.5">{sessions.length}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-[95rem]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Trier :</span>
            {(['name', 'score', 'attempts'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortBy === s ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s === 'name' ? 'Nom' : s === 'score' ? 'Score' : 'Investissement'}
              </button>
            ))}
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-sm text-gray-500">Vue :</span>
            {(['grid', 'cards'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === v ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {v === 'grid' ? 'Grille' : 'Cartes'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCsvImport(!showCsvImport)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showCsvImport ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {!hasGenderData ? 'Importer CSV Pronote' : 'CSV'}
            </button>
            <Link
              href={`/dashboard/sessions/new?classId=${classId}`}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + Nouvelle session
            </Link>
          </div>
        </div>

        {/* Import CSV */}
        {showCsvImport && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Importer un CSV Pronote</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Format : <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">NOM;Prénom;Date de naissance;;Genre</code>
                </p>
              </div>
              <button onClick={() => setShowCsvImport(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                Choisir un fichier CSV
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              <span className="text-sm text-gray-400 self-center">ou coller le contenu ci-dessous</span>
            </div>
            <textarea
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder={`NOM;Prénom;Date de naissance;;Genre\nMARTIN;Emma;15/03/2012;;Féminin\nDUBOIS;Lucas;22/07/2011;;Masculin`}
              className="w-full h-32 border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleImportCsv}
                disabled={importing || !csvContent.trim()}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </button>
              {importResult && (
                <p className={`text-sm ${importResult.success ? 'text-green-600' : 'text-red-600'}`}>{importResult.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Légende investissement */}
        {sessions.length > 0 && view === 'grid' && (
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-gray-500">
            <span className="font-medium">Investissement :</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 border border-red-200" /> Pas fait</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-100 border border-orange-200" /> 1 fois</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-100 border border-blue-200" /> 2-3 fois</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-200 border border-green-300" /> 4-5 fois</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500 border border-green-500" /> 6+ fois</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="font-medium">Score :</span>
            <span>nombre dans la cellule = meilleur score /10</span>
          </div>
        )}

        {/* VUE GRILLE */}
        {view === 'grid' && sessions.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 min-w-[200px]">
                    Élève
                  </th>
                  {sessions.map(sess => (
                    <th key={sess.id} className="p-2 text-center font-medium text-gray-500 min-w-[70px]">
                      <div className="text-xs leading-tight truncate max-w-[80px] mx-auto" title={sess.title}>
                        {sess.title.length > 12 ? sess.title.slice(0, 12) + '...' : sess.title}
                      </div>
                    </th>
                  ))}
                  <th className="p-2 text-center font-semibold text-gray-700 min-w-[60px]">Moy.</th>
                  <th className="p-2 text-center font-semibold text-gray-700 min-w-[50px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => {
                  const isFille = student.gender === 'F'
                  const genderBg = isFille ? 'bg-pink-50' : student.gender === 'M' ? 'bg-blue-50' : 'bg-gray-50'
                  const genderText = isFille ? 'text-pink-600' : student.gender === 'M' ? 'text-blue-600' : 'text-gray-500'
                  const age = student.birth_date ? computeAge(student.birth_date) : null

                  return (
                    <tr
                      key={student.id}
                      onClick={() => router.push(`/dashboard/students/${student.id}?classId=${classId}`)}
                      className="border-b border-gray-50 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    >
                      <td className="p-2 sticky left-0 bg-white hover:bg-indigo-50/50 z-10">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${genderBg} ${genderText} flex items-center justify-center font-bold text-xs shrink-0`}>
                            {student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{student.full_name}</div>
                            <div className="text-xs text-gray-400">
                              {student.last_activity ? daysSince(student.last_activity) : 'Jamais'}
                              {age !== null && <span className="text-gray-300"> · {age} ans</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {sessions.map(sess => {
                        const cell = student.grid[sess.id]
                        const attempts = cell?.attempts || 0
                        const bestScore = cell ? Math.round(cell.bestScore / 10) : 0

                        return (
                          <td key={sess.id} className="p-1.5 text-center">
                            <div
                              className={`w-12 h-10 mx-auto rounded-lg border flex flex-col items-center justify-center ${attemptColor(attempts)} ${attemptBorder(attempts)} transition-all`}
                              title={attempts === 0
                                ? 'Pas fait'
                                : `${attempts} tentative${attempts > 1 ? 's' : ''} — Meilleur : ${Math.round(cell!.bestScore)}%`
                              }
                            >
                              {attempts > 0 ? (
                                <>
                                  <span className="text-xs font-black leading-none">{bestScore}</span>
                                  <span className="text-[9px] opacity-70 leading-none mt-0.5">×{attempts}</span>
                                </>
                              ) : (
                                <span className="text-xs">—</span>
                              )}
                            </div>
                          </td>
                        )
                      })}

                      {/* Moyenne */}
                      <td className="p-2 text-center">
                        {student.sessions_completed > 0 ? (
                          <span className={`text-sm font-black ${scoreColor(student.average_score)}`}>
                            {Math.round(student.average_score)}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Total tentatives */}
                      <td className="p-2 text-center">
                        <span className={`text-sm font-bold ${student.total_attempts >= 20 ? 'text-green-600' : student.total_attempts >= 10 ? 'text-blue-600' : student.total_attempts > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                          {student.total_attempts || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : view === 'grid' && sessions.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-3">Aucune session créée pour cette classe.</p>
            <Link href={`/dashboard/sessions/new?classId=${classId}`} className="text-indigo-600 hover:underline text-sm">
              Créer une première session
            </Link>
          </div>
        ) : null}

        {/* VUE CARTES */}
        {view === 'cards' && (
          sortedStudents.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-3">Aucun élève dans cette classe.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sortedStudents.map((student) => {
                const isFille = student.gender === 'F'
                const genderColor = isFille ? 'border-pink-300' : student.gender === 'M' ? 'border-blue-300' : 'border-gray-200'
                const genderBg = isFille ? 'bg-pink-50' : student.gender === 'M' ? 'bg-blue-50' : 'bg-gray-50'
                const genderText = isFille ? 'text-pink-600' : student.gender === 'M' ? 'text-blue-600' : 'text-gray-500'
                const initials = student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const isInactive = !student.last_activity
                const recentlyActive = student.last_activity && (Date.now() - new Date(student.last_activity).getTime()) < 3 * 86400000
                const age = student.birth_date ? computeAge(student.birth_date) : null
                const maxAttempts = Math.max(...students.map(s => s.total_attempts), 1)

                return (
                  <div
                    key={student.id}
                    onClick={() => router.push(`/dashboard/students/${student.id}?classId=${classId}`)}
                    className={`bg-white rounded-xl border-l-4 ${genderColor} shadow-sm hover:shadow-md transition-all p-4 cursor-pointer ${isInactive ? 'opacity-60' : ''}`}
                  >
                    {/* En-tête : avatar + nom */}
                    <div className="flex items-center gap-3 mb-3">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${genderBg} ${genderText} flex items-center justify-center font-bold text-sm`}>
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{student.full_name}</div>
                        <div className="flex items-center gap-1.5">
                          {recentlyActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Actif récemment" />
                          )}
                          <span className="text-xs text-gray-400 truncate">
                            {student.last_activity ? daysSince(student.last_activity) : 'Jamais connecté'}
                          </span>
                          {age !== null && <span className="text-xs text-gray-300 shrink-0">· {age} ans</span>}
                        </div>
                      </div>
                    </div>

                    {student.sessions_completed > 0 ? (
                      <>
                        {/* Score + sessions */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-lg font-black ${scoreColor(student.average_score)}`}>
                            {Math.round(student.average_score)}%
                          </span>
                          <span className="text-xs text-gray-400">
                            {student.total_attempts} tentative{student.total_attempts > 1 ? 's' : ''} · {student.sessions_completed} session{student.sessions_completed > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Barre de score */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              student.average_score >= 80 ? 'bg-green-500' :
                              student.average_score >= 60 ? 'bg-blue-500' :
                              student.average_score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.round(student.average_score)}%` }}
                          />
                        </div>

                        {/* Mini grille investissement */}
                        {sessions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {sessions.map(sess => {
                              const cell = student.grid[sess.id]
                              const attempts = cell?.attempts || 0
                              return (
                                <div
                                  key={sess.id}
                                  className={`w-6 h-6 rounded ${attemptColor(attempts)} flex items-center justify-center`}
                                  title={`${sess.title}: ${attempts === 0 ? 'Pas fait' : attempts + ' tentative' + (attempts > 1 ? 's' : '')}`}
                                >
                                  <span className="text-[9px] font-bold">{attempts > 0 ? attempts : ''}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Barre d'investissement (tentatives relatives à la classe) */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                student.total_attempts / maxAttempts > 0.7 ? 'bg-green-500' :
                                student.total_attempts / maxAttempts > 0.3 ? 'bg-blue-400' : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.round((student.total_attempts / maxAttempts) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">invest.</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-3">
                        <span className="text-xs text-gray-400 italic">Aucune activité</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </main>
    </div>
  )
}
