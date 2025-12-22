// Script pour vérifier les données dans Supabase
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDatabase() {
  console.log('\n=== Vérification de la base de données ===\n')

  // 1. Vérifier les classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')

  console.log('📚 CLASSES:')
  if (classesError) {
    console.log('Erreur:', classesError.message)
  } else {
    console.log(`  ${classes?.length || 0} classe(s) trouvée(s)`)
    classes?.forEach(c => {
      console.log(`  - ${c.name} (ID: ${c.id.substring(0, 8)}..., GC: ${c.google_classroom_id || 'N/A'})`)
    })
  }

  // 2. Vérifier les élèves dans les classes
  const { data: classStudents, error: csError } = await supabase
    .from('class_students')
    .select('*, classes(name), profiles(full_name, email)')

  console.log('\n👥 ÉLÈVES DANS LES CLASSES:')
  if (csError) {
    console.log('Erreur:', csError.message)
  } else {
    console.log(`  ${classStudents?.length || 0} association(s) classe-élève`)
    classStudents?.forEach(cs => {
      const className = (cs.classes as any)?.name || 'N/A'
      const studentName = (cs.profiles as any)?.full_name || 'N/A'
      const studentEmail = (cs.profiles as any)?.email || 'N/A'
      console.log(`  - ${studentName} (${studentEmail}) -> ${className}`)
    })
  }

  // 3. Vérifier les profils
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')

  console.log('\n👤 PROFILS:')
  if (profilesError) {
    console.log('Erreur:', profilesError.message)
  } else {
    console.log(`  ${profiles?.length || 0} profil(s)`)
    profiles?.forEach(p => {
      console.log(`  - ${p.full_name || 'Sans nom'} (${p.email}) - ${p.role}`)
    })
  }

  // 4. Vérifier les sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, classes(name)')

  console.log('\n📋 SESSIONS:')
  if (sessionsError) {
    console.log('Erreur:', sessionsError.message)
  } else {
    console.log(`  ${sessions?.length || 0} session(s)`)
    sessions?.forEach(s => {
      const className = (s.classes as any)?.name || 'N/A'
      console.log(`  - ${s.title} (Code: ${s.code}) -> ${className}`)
    })
  }

  // 5. Vérifier les tokens Google du professeur
  const { data: teacherProfiles, error: tpError } = await supabase
    .from('profiles')
    .select('id, full_name, email, google_access_token, google_refresh_token')
    .eq('role', 'teacher')

  console.log('\n🔑 TOKENS GOOGLE (professeurs):')
  if (tpError) {
    console.log('Erreur:', tpError.message)
  } else {
    teacherProfiles?.forEach(p => {
      console.log(`  - ${p.full_name || p.email}:`)
      console.log(`    Access token: ${p.google_access_token ? '✅ Présent' : '❌ Manquant'}`)
      console.log(`    Refresh token: ${p.google_refresh_token ? '✅ Présent' : '❌ Manquant'}`)
    })
  }

  console.log('\n=== Fin de la vérification ===\n')
}

checkDatabase().catch(console.error)
