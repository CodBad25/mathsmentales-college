// Script pour tester la récupération des élèves depuis Google Classroom
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testGoogleSync() {
  console.log('\n=== Test synchronisation Google Classroom ===\n')

  // Récupérer le profil du professeur
  const { data: teacher } = await supabase
    .from('profiles')
    .select('id, email, google_access_token, google_refresh_token')
    .eq('role', 'teacher')
    .single()

  if (!teacher) {
    console.log('❌ Aucun professeur trouvé')
    return
  }

  console.log(`👤 Professeur: ${teacher.email}`)
  console.log(`🔑 Access token: ${teacher.google_access_token ? '✅' : '❌'}`)
  console.log(`🔄 Refresh token: ${teacher.google_refresh_token ? '✅' : '❌'}`)

  if (!teacher.google_access_token) {
    console.log('\n❌ Pas de token Google. Le professeur doit se reconnecter.')
    return
  }

  // Récupérer les classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, google_classroom_id')
    .eq('teacher_id', teacher.id)
    .not('google_classroom_id', 'is', null)

  console.log(`\n📚 ${classes?.length || 0} classe(s) liée(s) à Google Classroom\n`)

  // Créer le client OAuth
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: teacher.google_access_token,
    refresh_token: teacher.google_refresh_token
  })

  const classroom = google.classroom({ version: 'v1', auth: oauth2Client })

  for (const c of classes || []) {
    console.log(`\n📖 Classe: ${c.name} (GC ID: ${c.google_classroom_id})`)

    try {
      const response = await classroom.courses.students.list({
        courseId: c.google_classroom_id
      })

      const students = response.data.students || []
      console.log(`   👥 ${students.length} élève(s) dans Google Classroom:`)

      students.forEach(s => {
        console.log(`      - ${s.profile?.name?.fullName} (${s.profile?.emailAddress})`)
      })

      if (students.length === 0) {
        console.log('      (aucun élève inscrit dans cette classe Google Classroom)')
      }
    } catch (err: any) {
      console.log(`   ❌ Erreur: ${err.message}`)
      if (err.message?.includes('insufficient')) {
        console.log('   💡 Le professeur doit se reconnecter pour obtenir les bons scopes')
      }
    }
  }

  console.log('\n=== Fin du test ===\n')
}

testGoogleSync().catch(console.error)
