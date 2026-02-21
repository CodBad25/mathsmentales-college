'use client'

import { useState, useCallback } from 'react'

export interface Exercise {
  u: string
  t: string
  d?: string
  new?: boolean
}

export interface ExerciseOption {
  name: string
  question?: string | string[]
  vars?: Record<string, any>
}

export interface ExerciseDetail {
  title: string
  ID?: string
  description?: string
  options: ExerciseOption[]
  question?: string | string[]
}

export function getQuestionVariantCount(detail: ExerciseDetail, optionIndex: number): number {
  const option = detail.options[optionIndex]
  if (option?.question) {
    return Array.isArray(option.question) ? option.question.length : 1
  }
  if (detail.question) {
    return Array.isArray(detail.question) ? detail.question.length : 1
  }
  return 1
}

export function getQuestionVariantLabels(detail: ExerciseDetail, optionIndex: number): string[] {
  const count = getQuestionVariantCount(detail, optionIndex)
  const option = detail.options[optionIndex]
  const questions = option?.question || detail.question

  if (Array.isArray(questions)) {
    return questions.map((q, i) => {
      const simplified = q
        .replace(/\$\$/g, '')
        .replace(/\\\\/g, '')
        .replace(/\$\{:(\w+)\}/g, 'n')
        .replace(/\\times/g, '×')
        .replace(/\\color\{[^}]+\}/g, '')
        .trim()
      return simplified || `Option ${i + 1}`
    })
  }
  return count > 1 ? Array.from({ length: count }, (_, i) => `Option ${i + 1}`) : ['']
}

export function useExerciseDetail() {
  const [exerciseDetail, setExerciseDetail] = useState<ExerciseDetail | null>(null)
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [exerciseLoadError, setExerciseLoadError] = useState<string | null>(null)

  const loadExerciseDetail = useCallback(async (exercise: Exercise): Promise<ExerciseDetail | null> => {
    setLoadingExercise(true)
    setExerciseLoadError(null)
    try {
      const res = await fetch(`/library/${exercise.u}`)
      if (res.ok) {
        const data = await res.json()
        const detail: ExerciseDetail = {
          title: data.title,
          ID: data.ID,
          description: data.description,
          options: data.options || [],
          question: data.question
        }
        setExerciseDetail(detail)
        return detail
      } else {
        setExerciseLoadError(`Fichier d'exercice introuvable: ${exercise.u}`)
        setExerciseDetail(null)
        return null
      }
    } catch (err) {
      console.error('Erreur chargement exercice:', err)
      setExerciseLoadError("Erreur lors du chargement de l'exercice")
      setExerciseDetail(null)
      return null
    } finally {
      setLoadingExercise(false)
    }
  }, [])

  return {
    exerciseDetail,
    loadingExercise,
    exerciseLoadError,
    loadExerciseDetail,
  }
}
