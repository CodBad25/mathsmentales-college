import { createServerSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Client admin pour fusionner les profils
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Récupérer le profil de l'utilisateur par son ID auth
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Vérifier s'il existe un profil placeholder avec le même email
    const { data: placeholderProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (placeholderProfile && placeholderProfile.id !== user.id) {
      // Profil placeholder trouvé - migrer les liens class_students
      console.log(`Migration du profil placeholder ${placeholderProfile.id} vers ${user.id}`)

      // 1. Mettre à jour les liens class_students pour pointer vers le nouvel ID
      await supabaseAdmin
        .from('class_students')
        .update({ student_id: user.id })
        .eq('student_id', placeholderProfile.id)

      // 2. Mettre à jour les résultats de session
      await supabaseAdmin
        .from('session_results')
        .update({ student_id: user.id })
        .eq('student_id', placeholderProfile.id)

      // 3. Mettre à jour les résultats d'exercices
      await supabaseAdmin
        .from('student_results')
        .update({ student_id: user.id })
        .eq('student_id', placeholderProfile.id)

      // 4. Supprimer l'ancien profil placeholder
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', placeholderProfile.id)

      // 5. Créer le nouveau profil avec le bon ID
      const { data: newProfile, error } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || user.user_metadata.name || placeholderProfile.full_name,
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || placeholderProfile.avatar_url,
        role: placeholderProfile.role || 'student',
      }).select().single()

      if (error) {
        console.error('Erreur création profil après migration:', error)
      }
      profile = newProfile
    } else {
      // Pas de placeholder, créer un nouveau profil
      const { data: newProfile, error } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name || user.user_metadata.name,
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
        role: 'student',
      }).select().single()

      if (error) {
        console.error('Erreur création profil:', error)
      }
      profile = newProfile
    }
  }

  // Si toujours pas de profil, afficher une erreur
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de profil</h1>
          <p className="text-gray-600 mb-4">Impossible de créer votre profil. Veuillez réessayer.</p>
          <a href="/auth/logout" className="text-blue-600 hover:underline">Se déconnecter</a>
        </div>
      </div>
    )
  }

  const isTeacher = profile.role === 'teacher'

  // Récupérer les classes selon le rôle
  let classes = []
  let activeSessions = 0
  let totalStudents = 0
  let recentSessions: any[] = []
  let studentStats = { averageScore: 0, totalExercises: 0 }

  if (isTeacher) {
    // Classes du professeur
    const { data } = await supabase
      .from('classes')
      .select('*, class_students(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
    classes = data || []

    // Sessions actives
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', user.id)
      .eq('status', 'active')
    activeSessions = sessionsCount || 0

    // Total élèves (dans toutes les classes)
    const { data: studentsData } = await supabase
      .from('class_students')
      .select('student_id, classes!inner(teacher_id)')
      .eq('classes.teacher_id', user.id)
    totalStudents = studentsData?.length || 0

    // Sessions récentes avec résultats
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select(`
        id, title, code, status, created_at, nb_questions,
        classes(name),
        session_results(count)
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    recentSessions = sessionsData || []
  } else {
    // Classes de l'élève
    const { data } = await supabase
      .from('class_students')
      .select('*, classes(*)')
      .eq('student_id', user.id)
    classes = data?.map((cs: any) => cs.classes) || []

    // Sessions disponibles pour l'élève (de ses classes)
    const classIds = classes.map((c: any) => c.id)
    if (classIds.length > 0) {
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds)
        .eq('status', 'active')
      activeSessions = sessionsCount || 0
    }

    // Statistiques de l'élève
    const { data: resultsData } = await supabase
      .from('session_results')
      .select('score, total_questions')
      .eq('student_id', user.id)

    if (resultsData && resultsData.length > 0) {
      const totalScore = resultsData.reduce((sum, r) => sum + (r.score || 0), 0)
      const totalQuestions = resultsData.reduce((sum, r) => sum + (r.total_questions || 0), 0)
      studentStats.averageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
      studentStats.totalExercises = resultsData.length
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            🧮 MathsMentales
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile.email}</span>
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <form action="/auth/logout" method="post">
              <button className="text-sm text-gray-600 hover:text-gray-900">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Titre et badge rôle */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">
              Bonjour {profile.full_name || 'Utilisateur'}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isTeacher
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isTeacher ? '👨‍🏫 Professeur' : '🎓 Élève'}
            </span>
          </div>
          <p className="text-gray-600">
            {isTeacher
              ? 'Gérez vos classes et suivez les progrès de vos élèves'
              : 'Accédez à vos exercices et suivez votre progression'}
          </p>
        </div>

        {/* Statistiques rapides */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">
              {isTeacher ? 'Classes créées' : 'Classes rejointes'}
            </div>
            <div className="text-3xl font-bold text-primary-600">
              {classes.length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Sessions actives</div>
            <div className="text-3xl font-bold text-green-600">{activeSessions}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">
              {isTeacher ? 'Élèves totaux' : 'Score moyen'}
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {isTeacher ? totalStudents : `${studentStats.averageScore}%`}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Actions rapides</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isTeacher ? (
              <>
                <Link href="/exercices" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">🧮</div>
                  <div className="font-semibold">Exercices</div>
                </Link>
                <Link href="/dashboard/classroom" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">🔗</div>
                  <div className="font-semibold">Google Classroom</div>
                </Link>
                <Link href="/dashboard/classes/new" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">➕</div>
                  <div className="font-semibold">Créer une classe</div>
                </Link>
                <Link href="/dashboard/sessions/new" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-semibold">Nouvelle session</div>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard/join" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">🔑</div>
                  <div className="font-semibold">Rejoindre une classe</div>
                </Link>
                <Link href="/dashboard/exercises" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="font-semibold">Mes exercices</div>
                </Link>
                <Link href="/dashboard/history" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">📜</div>
                  <div className="font-semibold">Mon historique</div>
                </Link>
                <Link href="/dashboard/progress" className="card hover:bg-primary-50 cursor-pointer">
                  <div className="text-3xl mb-2">📈</div>
                  <div className="font-semibold">Ma progression</div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Sessions récentes (professeur uniquement) */}
        {isTeacher && recentSessions.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Sessions récentes</h2>
              <Link href="/dashboard/sessions" className="text-primary-600 hover:underline text-sm">
                Voir toutes les sessions →
              </Link>
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Session</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Classe</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Réponses</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSessions.map((session: any) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/sessions/${session.code}`} className="font-medium text-primary-600 hover:underline">
                          {session.title}
                        </Link>
                        <div className="text-xs text-gray-400 font-mono">{session.code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {session.classes?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {session.session_results?.[0]?.count || 0} élève(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {session.status === 'active' ? 'Active' : 'Terminée'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Liste des classes */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {isTeacher ? 'Mes classes' : 'Mes classes'}
          </h2>

          {classes.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 mb-4">
                {isTeacher
                  ? 'Vous n\'avez pas encore créé de classe'
                  : 'Vous n\'avez pas encore rejoint de classe'}
              </p>
              <Link
                href={isTeacher ? '/dashboard/classes/new' : '/dashboard/join'}
                className="btn-primary inline-block"
              >
                {isTeacher ? 'Créer ma première classe' : 'Rejoindre une classe'}
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classe: any) => (
                <Link
                  key={classe.id}
                  href={`/dashboard/classes/${classe.id}`}
                  className="card hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{classe.name}</h3>
                    {isTeacher && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        {classe.class_students?.[0]?.count || 0} élèves
                      </span>
                    )}
                  </div>
                  {classe.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {classe.description}
                    </p>
                  )}
                  {isTeacher && (
                    <div className="text-xs text-gray-500">
                      Code: <span className="font-mono font-bold">{classe.join_code}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
