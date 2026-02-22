import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'

export default async function Home() {
  let user = null

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="text-3xl font-bold text-primary-600">
            MathsMentales
          </div>
          <span className="bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
            COLLEGE
          </span>
        </div>
        <div>
          {user ? (
            <Link
              href="/dashboard"
              className="btn-primary"
            >
              Mon espace
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="btn-primary"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
          Calcul mental pour
          <span className="text-primary-600"> collégiens</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Plateforme d&apos;exercices interactifs avec suivi personnalisé.
          Connexion avec Google Classroom pour professeurs et élèves.
        </p>

      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Fonctionnalités
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Pour les professeurs */}
          <div className="card">
            <div className="text-4xl mb-4">👨‍🏫</div>
            <h3 className="text-2xl font-bold mb-3">Pour les professeurs</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Créez des sessions personnalisées</li>
              <li>✓ Suivez les progrès de vos élèves</li>
              <li>✓ Intégration Google Classroom</li>
              <li>✓ Statistiques détaillées</li>
              <li>✓ Export des résultats</li>
            </ul>
          </div>

          {/* Pour les élèves */}
          <div className="card">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold mb-3">Pour les élèves</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Exercices adaptés au niveau</li>
              <li>✓ Historique personnel</li>
              <li>✓ Connexion Google simple</li>
              <li>✓ Progression visualisée</li>
              <li>✓ Interface intuitive</li>
            </ul>
          </div>

          {/* Contenu pédagogique */}
          <div className="card">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-2xl font-bold mb-3">Contenu adapté</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Programme de la 6ème à la 3ème</li>
              <li>✓ Calcul mental et automatismes</li>
              <li>✓ Exercices variés</li>
              <li>✓ Diaporamas interactifs</li>
              <li>✓ Open source et gratuit</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Niveaux */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Niveaux disponibles
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          {['6eme', '5eme', '4eme', '3eme'].map((niveau) => (
            <div key={niveau} className="card text-center">
              <div className="text-5xl font-bold text-primary-600 mb-2">
                {niveau}
              </div>
              <p className="text-gray-600">
                Exercices adaptés au programme
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">
            Basé sur{' '}
            <a
              href="https://mathsmentales.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              MathsMentales.net
            </a>
          </p>
          <p className="text-gray-400 text-sm">
            Plateforme open-source pour l&apos;enseignement des mathématiques
          </p>
          <p className="text-gray-500 text-xs mt-4">
            Adapté par <span className="inline-block animate-pulse text-red-500">&#10084;</span> M.BELHAJ
          </p>
        </div>
      </footer>
    </main>
  )
}
