import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Recuperer les statistiques de l'utilisateur
  const { data: results } = await supabase
    .from('student_results')
    .select('*')
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })

  const resultsList = results || []

  // Calculer les statistiques
  const totalExercices = resultsList.length
  const totalQuestions = resultsList.reduce((sum, r) => sum + r.total_questions, 0)
  const totalCorrect = resultsList.reduce((sum, r) => sum + r.score, 0)
  const totalTime = resultsList.reduce((sum, r) => sum + r.time_spent, 0)
  const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  // Statistiques par niveau
  const statsByNiveau: Record<string, { count: number; score: number; total: number }> = {}
  resultsList.forEach((r: any) => {
    const niveau = r.niveau || 'autre'
    if (!statsByNiveau[niveau]) {
      statsByNiveau[niveau] = { count: 0, score: 0, total: 0 }
    }
    statsByNiveau[niveau].count++
    statsByNiveau[niveau].score += r.score
    statsByNiveau[niveau].total += r.total_questions
  })

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

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Ma progression</h1>

        {/* Statistiques globales */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-4xl font-bold text-primary-600">{totalExercices}</div>
            <div className="text-gray-600">Exercices faits</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-4xl font-bold text-green-600">{averageScore}%</div>
            <div className="text-gray-600">Score moyen</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">{totalQuestions}</div>
            <div className="text-gray-600">Questions repondues</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-4xl font-bold text-purple-600">{Math.round(totalTime / 60)}min</div>
            <div className="text-gray-600">Temps total</div>
          </div>
        </div>

        {/* Statistiques par niveau */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">Progression par niveau</h2>

          {Object.keys(statsByNiveau).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune donnee disponible. Commencez a faire des exercices !
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(statsByNiveau).map(([niveau, stats]) => {
                const percentage = stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0
                return (
                  <div key={niveau} className="flex items-center gap-4">
                    <div className="w-16 font-bold text-lg">{niveau}e</div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentage >= 80 ? 'bg-green-500' :
                            percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-bold">{percentage}%</span>
                      <span className="text-gray-500 text-sm ml-2">({stats.count} ex.)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bouton pour continuer */}
        <div className="text-center">
          <Link href="/exercices" className="btn-primary inline-block text-lg px-8 py-4">
            Continuer a progresser
          </Link>
        </div>
      </main>
    </div>
  )
}
