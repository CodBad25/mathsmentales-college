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
    // Classes du professeur (via admin pour éviter les problèmes RLS)
    const { data, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('*, class_students(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
    if (classesError) console.error('Erreur chargement classes:', classesError)
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

  const classColors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec dégradé */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">MathsMentales</Link>
          <div className="flex items-center gap-3">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full ring-2 ring-white/30" />
            )}
            <span className="text-sm text-white/80 hidden sm:block">{profile.full_name}</span>
            <form action="/auth/logout" method="post">
              <button className="text-sm text-white/60 hover:text-white transition-colors">
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Hero section dans le header */}
        <div className="container mx-auto px-4 pb-8 pt-4">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold">
              Bonjour {(profile.full_name || 'Utilisateur').split(' ')[0]}
            </h1>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              {isTeacher ? 'Professeur' : 'Élève'}
            </span>
          </div>

          {/* Stats dans le header */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-white/60 text-xs uppercase tracking-wide">{isTeacher ? 'Classes' : 'Classes'}</div>
              <div className="text-3xl font-black mt-1">{classes.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-white/60 text-xs uppercase tracking-wide">Sessions actives</div>
              <div className="text-3xl font-black mt-1">{activeSessions}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="text-white/60 text-xs uppercase tracking-wide">{isTeacher ? 'Élèves' : 'Score moyen'}</div>
              <div className="text-3xl font-black mt-1">{isTeacher ? totalStudents : `${studentStats.averageScore}%`}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 -mt-0">
        {/* Actions rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {isTeacher ? (
            <>
              <Link href="/exercices" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Exercices</div>
                <div className="text-xs text-gray-500 mt-0.5">Catalogue complet</div>
              </Link>
              <Link href="/dashboard/classroom" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Google Classroom</div>
                <div className="text-xs text-gray-500 mt-0.5">Importer / synchroniser</div>
              </Link>
              <Link href="/dashboard/sessions/new" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Nouvelle session</div>
                <div className="text-xs text-gray-500 mt-0.5">Lancer un exercice</div>
              </Link>
              <Link href="/dashboard/sessions" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Mes sessions</div>
                <div className="text-xs text-gray-500 mt-0.5">Résultats et suivi</div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/exercices" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Exercices</div>
              </Link>
              <Link href="/dashboard/join" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Rejoindre une classe</div>
              </Link>
              <Link href="/dashboard/history" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Historique</div>
              </Link>
              <Link href="/dashboard/progress" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-gray-100">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div className="font-semibold text-gray-900 text-sm">Progression</div>
              </Link>
            </>
          )}
        </div>

        {/* Mes classes */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Mes classes</h2>
            {isTeacher && classes.length > 0 && (
              <Link href="/dashboard/classroom" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Synchroniser Classroom
              </Link>
            )}
          </div>

          {classes.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">
                {isTeacher
                  ? 'Importez vos classes depuis Google Classroom ou créez-en une manuellement.'
                  : 'Rejoignez une classe avec un code pour commencer.'}
              </p>
              <div className="flex gap-3 justify-center">
                {isTeacher && (
                  <Link href="/dashboard/classroom" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm">
                    Importer depuis Classroom
                  </Link>
                )}
                <Link
                  href={isTeacher ? '/dashboard/classes/new' : '/dashboard/join'}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-colors text-sm ${isTeacher ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {isTeacher ? 'Créer manuellement' : 'Rejoindre avec un code'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classe: any, idx: number) => (
                <Link
                  key={classe.id}
                  href={`/dashboard/classes/${classe.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden group"
                >
                  {/* Barre de couleur en haut */}
                  <div className={`h-1.5 ${classColors[idx % classColors.length]}`} />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{classe.name}</h3>
                      {classe.google_classroom_id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Classroom</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-gray-500">
                        {classe.class_students?.[0]?.count || 0} élève{(classe.class_students?.[0]?.count || 0) !== 1 ? 's' : ''}
                      </span>
                      {isTeacher && classe.join_code && (
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{classe.join_code}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sessions récentes (professeur) */}
        {isTeacher && recentSessions.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sessions récentes</h2>
              <Link href="/dashboard/sessions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Tout voir
              </Link>
            </div>
            <div className="space-y-2">
              {recentSessions.map((session: any) => (
                <Link
                  key={session.id}
                  href={`/dashboard/sessions/${session.id}`}
                  className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${session.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{session.title}</div>
                      <div className="text-xs text-gray-500">
                        {session.classes?.name} &middot; {session.nb_questions} questions &middot; Code : <span className="font-mono">{session.code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {session.session_results?.[0]?.count || 0} réponse{(session.session_results?.[0]?.count || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
