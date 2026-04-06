'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  exercise_title: string
  niveau: string
  nb_questions: number
  code: string
  status: string
  created_at: string
  classes: {
    id: string
    name: string
  }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors du chargement')
        return
      }
      setSessions(data.sessions || [])
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    } catch { /* ignore */ }
    setDeleting(null)
  }

  const executeDeletion = async (ids: string[]) => {
    setConfirmDelete(null)
    if (ids.length === 1) {
      await deleteSession(ids[0])
    } else {
      setBulkDeleting(true)
      for (const id of ids) {
        await deleteSession(id)
      }
      setSelected(new Set())
      setBulkDeleting(false)
    }
  }

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
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">MathsMentales</Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Retour au tableau de bord</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Mes sessions</h1>
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmDelete({
                  ids: Array.from(selected),
                  label: `${selected.size} session(s)`
                })}
                disabled={bulkDeleting}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {bulkDeleting ? 'Suppression...' : `Supprimer (${selected.size})`}
              </button>
            )}
          </div>
          <Link
            href="/dashboard/sessions/new"
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
          >
            + Nouvelle session
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">Aucune session</h2>
            <p className="text-gray-600 mb-6">Créez votre première session pour commencer à évaluer vos élèves.</p>
            <Link
              href="/dashboard/sessions/new"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
            >
              Créer une session
            </Link>
          </div>
        ) : (
          <>
            {sessions.length > 1 && (
              <label className="flex items-center gap-2 mb-3 cursor-pointer text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={selected.size === sessions.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(sessions.map(s => s.id)))
                    else setSelected(new Set())
                  }}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                Tout sélectionner
              </label>
            )}
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all ${selected.has(session.id) ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selected.has(session.id)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(session.id)
                          else next.delete(session.id)
                          setSelected(next)
                        }}
                        className="w-4 h-4 text-primary-600 rounded mt-1"
                      />
                      <Link href={`/dashboard/sessions/${session.id}`} className="flex-1">
                        <h2 className="text-lg font-bold mb-1">{session.title}</h2>
                        <p className="text-gray-600 text-sm">
                          {session.classes?.name} · {session.nb_questions} questions
                        </p>
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-400">
                        {new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                      <button
                        onClick={() => setConfirmDelete({
                          ids: [session.id],
                          label: session.title
                        })}
                        disabled={deleting === session.id}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        {deleting === session.id ? '...' : '✕'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modale de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Supprimer ?</h2>
            <p className="text-gray-600 mb-6">
              <strong>{confirmDelete.label}</strong> et tous les résultats associés seront supprimés définitivement.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => executeDeletion(confirmDelete.ids)}
                className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
