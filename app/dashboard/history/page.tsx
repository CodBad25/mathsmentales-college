import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Récupérer les résultats des sessions assignées
  const { data: sessionResults } = await supabase
    .from('session_results')
    .select(`
      id, score, total_questions, time_spent, completed_at,
      sessions (
        id, title, code, exercise_title, niveau,
        classes (name)
      )
    `)
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50)

  // Récupérer les résultats des exercices libres
  const { data: freeResults } = await supabase
    .from('student_results')
    .select('*')
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50)

  // Combiner et trier par date
  const allResults = [
    ...(sessionResults || []).map((r: any) => ({
      ...r,
      type: 'session',
      title: r.sessions?.title || r.sessions?.exercise_title || 'Session',
      niveau: r.sessions?.niveau,
      className: r.sessions?.classes?.name,
      sessionCode: r.sessions?.code
    })),
    ...(freeResults || []).map((r: any) => ({
      ...r,
      type: 'free',
      title: r.exercice_title || 'Exercice libre',
      niveau: r.niveau,
      className: null,
      sessionCode: null
    }))
  ].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

  // Statistiques globales
  const totalExercises = allResults.length
  const totalScore = allResults.reduce((sum, r) => sum + (r.score || 0), 0)
  const totalQuestions = allResults.reduce((sum, r) => sum + (r.total_questions || 0), 0)
  const averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
  const sessionCount = allResults.filter(r => r.type === 'session').length
  const freeCount = allResults.filter(r => r.type === 'free').length

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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Mon historique</h1>
        <p className="text-gray-600 mb-8">Retrouvez tous vos exercices et sessions</p>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-primary-600">{totalExercises}</div>
            <div className="text-sm text-gray-600">Exercices faits</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{averageScore}%</div>
            <div className="text-sm text-gray-600">Score moyen</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{sessionCount}</div>
            <div className="text-sm text-gray-600">Sessions</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{freeCount}</div>
            <div className="text-sm text-gray-600">Exercices libres</div>
          </div>
        </div>

        {allResults.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-6xl mb-4">📜</div>
            <p className="text-gray-600 mb-4">Vous n&apos;avez pas encore fait d&apos;exercices</p>
            <Link href="/exercices" className="btn-primary inline-block">
              Commencer un exercice
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {allResults.map((result: any, index: number) => {
              const percentage = result.total_questions > 0
                ? Math.round((result.score / result.total_questions) * 100)
                : 0
              const date = new Date(result.completed_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className={`bg-white rounded-xl shadow p-6 border-l-4 ${
                    result.type === 'session'
                      ? 'border-l-purple-500'
                      : 'border-l-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          result.type === 'session'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {result.type === 'session' ? '📋 Session' : '🎯 Libre'}
                        </span>
                        {result.className && (
                          <span className="text-xs text-gray-500">
                            {result.className}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg">{result.title}</h3>
                      <p className="text-gray-500 text-sm">{date}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {result.niveau && (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            {result.niveau}ème
                          </span>
                        )}
                        {result.time_spent && (
                          <span className="text-xs text-gray-400">
                            ⏱️ {result.time_spent}s
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        percentage >= 80 ? 'text-green-600' :
                        percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.score}/{result.total_questions}
                      </div>
                      <div className="text-gray-500 text-sm">{percentage}%</div>
                      {/* Barre de progression */}
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            percentage >= 80 ? 'bg-green-500' :
                            percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
