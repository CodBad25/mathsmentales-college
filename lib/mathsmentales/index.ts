/**
 * Wrapper TypeScript pour le générateur MathsMentales
 */

// @ts-ignore - Importer le module JavaScript
import { Activity, math, MMmath } from './generator.js'

export interface ExerciceJSON {
  title: string
  ID: string
  type?: string
  textSize?: string
  speech?: number
  dest?: string[]
  keys?: string[]
  vars?: Record<string, unknown>
  consts?: Record<string, unknown>
  options: ExerciceOption[]
  question?: string | string[]
  answer?: string | string[]
  value?: string | string[]
  audio?: string | string[]
}

export interface ExerciceOption {
  name: string
  question?: string | string[]
  answer?: string | string[]
  value?: string | string[]
  audio?: string | string[]
  vars?: Record<string, unknown>
  consts?: Record<string, unknown>
}

export interface GeneratedQuestion {
  id: string
  exerciceId: string
  exerciceTitle: string
  optionName: string
  question: string
  questionLatex: string
  answer: string
  answerLatex: string
  value: string
  audio?: string
}

/**
 * Génère des questions à partir d'un exercice JSON
 * Utilise le code original de MathsMentales
 */
export function generateQuestions(
  exerciceJson: ExerciceJSON,
  count: number,
  optionIndex?: number
): GeneratedQuestion[] {
  // Créer l'activité avec le JSON
  const activity = new Activity(exerciceJson)
  activity.initialize()

  // Si un index d'option est spécifié, le définir
  if (optionIndex !== undefined) {
    activity.chosenOptions = [optionIndex]
  }

  // Générer les questions
  activity.generate(count, optionIndex)

  // Convertir au format attendu
  const questions: GeneratedQuestion[] = []
  const actQuestions = activity.questions || []
  const actAnswers = activity.answers || []
  const actValues = activity.values || []
  const actAudios = activity.audios || []

  for (let i = 0; i < actQuestions.length; i++) {
    const questionRaw = actQuestions[i]
    const answerRaw = actAnswers[i]
    const valueRaw = actValues[i]
    const audioRaw = actAudios[i]

    // Déterminer le nom de l'option utilisée
    let optionName = ''
    if (exerciceJson.options && exerciceJson.options.length > 0) {
      const optIdx = optionIndex ?? 0
      optionName = exerciceJson.options[optIdx]?.name || ''
    }

    // Nettoyer les chaînes
    const question = String(questionRaw || '')
    const answer = String(answerRaw || '')
    const value = String(valueRaw || '')

    questions.push({
      id: Math.random().toString(36).substring(2, 11),
      exerciceId: exerciceJson.ID,
      exerciceTitle: exerciceJson.title,
      optionName,
      question: question.replace(/\$\$/g, '').replace(/\\times/g, '×').replace(/\\div/g, '÷'),
      questionLatex: question.replace(/\$\$/g, '').trim(),
      answer: answer.replace(/\$\$/g, '').replace(/\\color\{red\}\{([^}]+)\}/g, '$1'),
      answerLatex: answer.replace(/\$\$/g, '').trim(),
      value,
      audio: audioRaw ? String(audioRaw) : undefined
    })
  }

  return questions
}

/**
 * Génère une seule question
 */
export function generateQuestion(
  exerciceJson: ExerciceJSON,
  optionIndex?: number
): GeneratedQuestion {
  const questions = generateQuestions(exerciceJson, 1, optionIndex)
  return questions[0]
}

/**
 * Vérifie si une réponse est correcte
 */
export function verifierReponse(question: GeneratedQuestion, reponse: string): boolean {
  const reponseNormalisee = reponse.trim().toLowerCase().replace(/\s+/g, '')
  const valueNormalisee = question.value.trim().toLowerCase().replace(/\s+/g, '')
  return reponseNormalisee === valueNormalisee
}

// Réexporter les utilitaires math pour usage externe si besoin
export { math, MMmath }
