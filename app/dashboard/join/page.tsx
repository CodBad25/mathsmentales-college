'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function JoinClassPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code.trim()) {
      setError('Veuillez entrer un code de classe')
      return
    }

    if (!supabase) {
      setError('Erreur de connexion')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Verifier que l'utilisateur est connecte
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Chercher la classe avec ce code
      const { data: classe, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('join_code', code.toUpperCase().trim())
        .single()

      if (classError || !classe) {
        setError('Code de classe invalide')
        setLoading(false)
        return
      }

      // Verifier si deja membre
      const { data: existing } = await supabase
        .from('class_students')
        .select('id')
        .eq('class_id', classe.id)
        .eq('student_id', user.id)
        .single()

      if (existing) {
        setError('Vous etes deja membre de cette classe')
        setLoading(false)
        return
      }

      // Rejoindre la classe
      const { error: joinError } = await supabase
        .from('class_students')
        .insert({
          class_id: classe.id,
          student_id: user.id,
        })

      if (joinError) {
        setError('Erreur lors de l\'inscription')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
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

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2 text-center">Rejoindre une classe</h1>
          <p className="text-gray-600 mb-8 text-center">
            Entrez le code fourni par votre professeur
          </p>

          {success ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-green-600 font-semibold mb-2">Inscription reussie !</p>
              <p className="text-gray-600">Redirection en cours...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Code de classe
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  maxLength={10}
                  className="w-full text-center text-2xl font-mono tracking-widest py-4 px-6 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none uppercase"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verification...' : 'Rejoindre'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
