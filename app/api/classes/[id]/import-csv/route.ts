import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CsvStudent {
  nom: string
  prenom: string
  birthDate: string | null
  gender: 'M' | 'F' | null
}

function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseCsvLine(line: string, separator: string): string[] {
  return line.split(separator).map(s => s.trim().replace(/^"|"$/g, ''))
}

function detectSeparator(firstLine: string): string {
  if (firstLine.includes(';')) return ';'
  if (firstLine.includes('\t')) return '\t'
  return ','
}

function parseDateFR(dateStr: string): string | null {
  if (!dateStr) return null
  // Format DD/MM/YYYY
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  return null
}

function parseGender(value: string): 'M' | 'F' | null {
  const v = value.toLowerCase().trim()
  if (v === 'masculin' || v === 'm' || v === 'garçon' || v === 'garcon' || v === 'g') return 'M'
  if (v === 'féminin' || v === 'feminin' || v === 'f' || v === 'fille') return 'F'
  return null
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: classId } = params

    // Vérifier que l'utilisateur est le professeur de cette classe
    const { data: classData } = await supabaseAdmin
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (!classData || classData.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { csvContent } = body

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'Contenu CSV manquant' }, { status: 400 })
    }

    // Détecter l'encodage et parser le CSV
    const lines = csvContent
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (lines.length < 2) {
      return NextResponse.json({ error: 'Le CSV doit contenir au moins un en-tête et une ligne de données' }, { status: 400 })
    }

    const separator = detectSeparator(lines[0])
    const headers = parseCsvLine(lines[0], separator).map(h => h.toLowerCase())

    // Détecter les colonnes
    const nomIdx = headers.findIndex(h => h === 'nom' || h === 'nom de famille')
    const prenomIdx = headers.findIndex(h => h === 'prénom' || h === 'prenom' || h === 'prénom de l\'élève')
    const dateIdx = headers.findIndex(h => h.includes('naissance') || h.includes('date'))
    const genderIdx = headers.findIndex(h => h === 'genre' || h === 'sexe' || h.includes('masculin') || h.includes('féminin'))

    if (nomIdx === -1 && prenomIdx === -1) {
      // Fallback Pronote : NOM;Prénom;Date de naissance;;Genre (pas d'en-tête)
      // Tester si la première ligne ressemble à des données
      const firstCols = parseCsvLine(lines[0], separator)
      if (firstCols.length >= 2 && /^[A-ZÉÈÊËÀÂÄÔÙÛÜ\s-]+$/.test(firstCols[0])) {
        // Pas d'en-tête, format Pronote direct
        return parseWithoutHeaders(lines, separator, classId)
      }
      return NextResponse.json({
        error: 'Colonnes NOM et/ou Prénom non trouvées. Format attendu : NOM;Prénom;Date de naissance;;Genre'
      }, { status: 400 })
    }

    // Parser les données
    const csvStudents: CsvStudent[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i], separator)
      const nom = nomIdx >= 0 ? cols[nomIdx] || '' : ''
      const prenom = prenomIdx >= 0 ? cols[prenomIdx] || '' : ''
      if (!nom && !prenom) continue

      csvStudents.push({
        nom: nom.trim(),
        prenom: prenom.trim(),
        birthDate: dateIdx >= 0 ? parseDateFR(cols[dateIdx] || '') : null,
        gender: genderIdx >= 0 ? parseGender(cols[genderIdx] || '') : null,
      })
    }

    return await matchAndUpdate(csvStudents, classId)
  } catch (error: any) {
    console.error('Erreur import CSV:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}

async function parseWithoutHeaders(lines: string[], separator: string, classId: string) {
  // Format Pronote sans en-tête : NOM;Prénom;Date de naissance;;Genre
  const csvStudents: CsvStudent[] = []
  for (const line of lines) {
    const cols = parseCsvLine(line, separator)
    if (cols.length < 2) continue
    const nom = cols[0].trim()
    const prenom = cols[1].trim()
    if (!nom || !prenom) continue

    // Détecter le genre dans les colonnes restantes
    let gender: 'M' | 'F' | null = null
    let birthDate: string | null = null
    for (let j = 2; j < cols.length; j++) {
      const g = parseGender(cols[j])
      if (g) { gender = g; continue }
      const d = parseDateFR(cols[j])
      if (d) { birthDate = d; continue }
    }

    csvStudents.push({ nom, prenom, birthDate, gender })
  }

  return matchAndUpdate(csvStudents, classId)
}

async function matchAndUpdate(csvStudents: CsvStudent[], classId: string) {
  // Récupérer les élèves actuels de la classe
  const { data: classStudents } = await supabaseAdmin
    .from('class_students')
    .select('student_id, profiles(id, full_name, email)')
    .eq('class_id', classId)

  if (!classStudents || classStudents.length === 0) {
    return NextResponse.json({
      error: 'Aucun élève dans cette classe. Importez d\'abord les élèves depuis Google Classroom.'
    }, { status: 400 })
  }

  // Construire la map des élèves DB
  const dbStudents = classStudents.map(cs => {
    const profile = Array.isArray(cs.profiles) ? cs.profiles[0] : cs.profiles as any
    return {
      id: profile?.id || cs.student_id,
      fullName: profile?.full_name || '',
      email: profile?.email || '',
    }
  })

  let matched = 0
  let notFound: string[] = []

  for (const csv of csvStudents) {
    const csvFullName = `${csv.prenom} ${csv.nom}`.trim()
    const csvNorm = normalizeStr(csvFullName)
    const csvNomNorm = normalizeStr(csv.nom)
    const csvPrenomNorm = normalizeStr(csv.prenom)

    // Matcher par nom complet (fuzzy)
    let match = dbStudents.find(db => {
      const dbNorm = normalizeStr(db.fullName)
      // Match exact
      if (dbNorm === csvNorm) return true
      // Match "Prénom NOM" vs "Prénom Nom" (case insensitive)
      if (dbNorm === normalizeStr(`${csv.prenom} ${csv.nom}`)) return true
      // Match inversé "NOM Prénom"
      if (dbNorm === normalizeStr(`${csv.nom} ${csv.prenom}`)) return true
      // Match partiel : le nom DB contient le nom ET le prénom
      if (dbNorm.includes(csvNomNorm) && dbNorm.includes(csvPrenomNorm)) return true
      return false
    })

    if (!match) {
      notFound.push(csvFullName)
      continue
    }

    // Mettre à jour le profil
    const updateData: Record<string, any> = {}
    if (csv.gender) updateData.gender = csv.gender
    if (csv.birthDate) updateData.birth_date = csv.birthDate

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', match.id)

      if (!error) matched++
    }
  }

  return NextResponse.json({
    success: true,
    total: csvStudents.length,
    matched,
    notFound,
    message: `${matched} élève(s) mis à jour sur ${csvStudents.length}.${notFound.length > 0 ? ` ${notFound.length} non trouvé(s) : ${notFound.join(', ')}` : ''}`
  })
}
