'use client'

import { useState, useEffect } from 'react'

interface ClassInfo {
  id: string
  name: string
  google_classroom_id?: string | null
}

interface QuickSessionCreatorProps {
  exerciseFile: string
  exerciseTitle: string
  niveau: string | null
  nbQuestions: number
  displayDuration: number
  selectedOptions: Record<string, number[]>
  onClose: () => void
}

export default function QuickSessionCreator({
  exerciseFile,
  exerciseTitle,
  niveau,
  nbQuestions,
  displayDuration,
  selectedOptions,
  onClose,
}: QuickSessionCreatorProps) {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [publishToClassroom, setPublishToClassroom] = useState(false)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ code: string; url: string; classroomPublished: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch('/api/classes')
        if (res.ok) {
          const data = await res.json()
          setClasses(data.classes || [])
        } else if (res.status === 401) {
          setError('Connectez-vous pour créer une session')
        }
      } catch {
        setError('Erreur de chargement des classes')
      } finally {
        setLoadingClasses(false)
      }
    }
    loadClasses()
  }, [])

  const selectedClassData = classes.find(c => c.id === selectedClass)
  const hasClassroom = !!selectedClassData?.google_classroom_id

  const handleCreate = async () => {
    if (!selectedClass) return
    setCreating(true)
    setError(null)

    try {
      const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const title = `${exerciseTitle} - ${today}`

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          title,
          exerciseFile,
          exerciseTitle,
          niveau,
          nbQuestions,
          displayDuration,
          selectedOptions,
          publishToClassroom: publishToClassroom && hasClassroom,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        return
      }

      setResult({
        code: data.session.code,
        url: data.session.url,
        classroomPublished: data.classroomPublished,
      })
    } catch {
      setError('Erreur réseau')
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.url)
    } catch {
      // fallback silencieux
    }
  }

  // État : résultat créé
  if (result) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-green-600 text-lg font-bold mb-2">Session créée !</div>
          <div className="bg-gray-100 rounded-xl p-4 mb-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Code de session</div>
            <div className="text-4xl font-mono font-black text-indigo-600 tracking-widest">{result.code}</div>
          </div>
          {result.classroomPublished && (
            <p className="text-sm text-green-600 mb-2">Publié dans Google Classroom</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-all"
          >
            Copier le lien
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }

  // État : chargement des classes
  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // État : pas de classes
  if (classes.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 mb-2">
          {error || 'Aucune classe trouvée. Créez une classe d\'abord.'}
        </p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">
          Annuler
        </button>
      </div>
    )
  }

  // État : sélection de classe
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">Choisissez la classe :</div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {classes.map(c => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedClass(c.id)
              if (c.google_classroom_id) setPublishToClassroom(true)
            }}
            className={`text-left px-3 py-3 rounded-xl border-2 transition-all text-sm ${
              selectedClass === c.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">{c.name}</div>
            {c.google_classroom_id && (
              <div className="text-xs text-gray-400 mt-0.5">Google Classroom</div>
            )}
          </button>
        ))}
      </div>

      {selectedClass && hasClassroom && (
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={publishToClassroom}
            onChange={(e) => setPublishToClassroom(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span>Publier dans Google Classroom</span>
        </label>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!selectedClass || creating}
          className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Création...' : 'Créer la session'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 text-gray-500 hover:text-gray-700 transition-all"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
