/**
 * Exercices de mathématiques - Wrapper pour MathsMentales
 * Utilise le code original de MathsMentales.net
 */

// Réexporter tout depuis le module MathsMentales
export {
  generateQuestion,
  generateQuestions,
  verifierReponse,
  type ExerciceJSON,
  type ExerciceOption,
  type GeneratedQuestion as Question
} from './mathsmentales'

export type NiveauCollege = '6' | '5' | '4' | '3'

export interface ExerciceConfig {
  niveau: NiveauCollege
  exerciceId: string
  optionIndex?: number
  nbQuestions: number
}

export interface StructureNiveau {
  nom: string
  themes: Record<string, {
    nom: string
    chapitres: Record<string, string>
  }>
}

export interface ContentExercice {
  u: string  // URL du fichier JSON
  t: string  // Titre
  new?: boolean
  d?: string  // Description
}

export interface ContentChapitre {
  n: string  // Nom
  e: ContentExercice[]  // Exercices
}

export interface ContentTheme {
  nom: string
  chapitres: Record<string, ContentChapitre>
}

export interface ContentNiveau {
  nom: string
  themes: Record<string, ContentTheme>
  activitiesNumber?: number
}

/**
 * Charge un exercice depuis son chemin
 */
export async function loadExercice(path: string): Promise<import('./mathsmentales').ExerciceJSON> {
  const response = await fetch(`/library/${path}`)
  if (!response.ok) {
    throw new Error(`Impossible de charger l'exercice: ${path}`)
  }
  return response.json()
}

/**
 * Charge la structure des niveaux
 */
export async function loadStructure(): Promise<Record<string, StructureNiveau>> {
  const response = await fetch('/library/structure.json')
  if (!response.ok) {
    throw new Error('Impossible de charger la structure')
  }
  return response.json()
}

/**
 * Charge le contenu (liste des exercices par niveau)
 */
export async function loadContent(): Promise<Record<string, ContentNiveau>> {
  const response = await fetch('/library/content.json')
  if (!response.ok) {
    throw new Error('Impossible de charger le contenu')
  }
  return response.json()
}

/**
 * Récupère tous les exercices disponibles pour un niveau
 */
export async function getExercicesForNiveau(niveau: NiveauCollege): Promise<ContentExercice[]> {
  const content = await loadContent()
  const niveauContent = content[niveau]

  if (!niveauContent) {
    return []
  }

  const exercices: ContentExercice[] = []

  for (const theme of Object.values(niveauContent.themes)) {
    for (const chapitre of Object.values(theme.chapitres)) {
      exercices.push(...chapitre.e)
    }
  }

  return exercices
}

/**
 * Niveaux du collège
 */
export const niveauxCollege: { id: NiveauCollege; nom: string }[] = [
  { id: '6', nom: '6ème' },
  { id: '5', nom: '5ème' },
  { id: '4', nom: '4ème' },
  { id: '3', nom: '3ème' },
]
