'use client'

import { useState, useCallback } from 'react'
import { type ExerciseDetail, getQuestionVariantCount } from './useExerciseDetail'

export function useExerciseOptions() {
  const [selectedSubOptions, setSelectedSubOptions] = useState<Map<number, Set<number>>>(new Map())
  const [nbQuestions, setNbQuestions] = useState(5)
  const [displayDuration, setDisplayDuration] = useState(8)

  const initializeSelection = useCallback((detail: ExerciseDetail) => {
    const initialSelection = new Map<number, Set<number>>()
    const options = detail.options || []
    options.forEach((_: any, optIdx: number) => {
      const questionCount = getQuestionVariantCount(detail, optIdx)
      initialSelection.set(optIdx, new Set(Array.from({ length: questionCount }, (_, i) => i)))
    })
    setSelectedSubOptions(initialSelection)
  }, [])

  const toggleSubOption = useCallback((optionIndex: number, variantIndex: number) => {
    setSelectedSubOptions(prev => {
      const newSelection = new Map(prev)
      const variants = newSelection.get(optionIndex) || new Set<number>()
      const newVariants = new Set(variants)
      if (newVariants.has(variantIndex)) {
        newVariants.delete(variantIndex)
      } else {
        newVariants.add(variantIndex)
      }
      newSelection.set(optionIndex, newVariants)
      return newSelection
    })
  }, [])

  const toggleOption = useCallback((optionIndex: number, detail: ExerciseDetail) => {
    setSelectedSubOptions(prev => {
      const newSelection = new Map(prev)
      const variants = newSelection.get(optionIndex) || new Set<number>()
      const count = getQuestionVariantCount(detail, optionIndex)
      if (variants.size === count) {
        newSelection.set(optionIndex, new Set())
      } else {
        newSelection.set(optionIndex, new Set(Array.from({ length: count }, (_, i) => i)))
      }
      return newSelection
    })
  }, [])

  const toggleAll = useCallback((select: boolean, detail: ExerciseDetail) => {
    const newSelection = new Map<number, Set<number>>()
    detail.options.forEach((_, optIdx) => {
      const count = getQuestionVariantCount(detail, optIdx)
      newSelection.set(optIdx, select ? new Set(Array.from({ length: count }, (_, i) => i)) : new Set())
    })
    setSelectedSubOptions(newSelection)
  }, [])

  const toggleAllVariant = useCallback((variantIndex: number, detail: ExerciseDetail) => {
    setSelectedSubOptions(prev => {
      const newSelection = new Map(prev)
      let allSelected = true
      detail.options.forEach((_, optIdx) => {
        const count = getQuestionVariantCount(detail, optIdx)
        if (variantIndex < count) {
          const variants = newSelection.get(optIdx) || new Set<number>()
          if (!variants.has(variantIndex)) allSelected = false
        }
      })
      detail.options.forEach((_, optIdx) => {
        const count = getQuestionVariantCount(detail, optIdx)
        if (variantIndex < count) {
          const variants = newSelection.get(optIdx) || new Set<number>()
          const newVariants = new Set(variants)
          if (allSelected) {
            newVariants.delete(variantIndex)
          } else {
            newVariants.add(variantIndex)
          }
          newSelection.set(optIdx, newVariants)
        }
      })
      return newSelection
    })
  }, [])

  const getTotalSelected = useCallback((): number => {
    let total = 0
    selectedSubOptions.forEach(variants => {
      total += variants.size
    })
    return total
  }, [selectedSubOptions])

  const getMaxVariants = useCallback((detail: ExerciseDetail | null): number => {
    if (!detail) return 1
    return Math.max(...detail.options.map((_, i) => getQuestionVariantCount(detail, i)))
  }, [])

  const getSelectedOptionsArray = useCallback((): number[] => {
    return Array.from(selectedSubOptions.entries())
      .filter(([_, variants]) => variants.size > 0)
      .map(([optIdx]) => optIdx)
  }, [selectedSubOptions])

  const getSelectedOptionsObject = useCallback((): Record<string, number[]> => {
    return Object.fromEntries(
      Array.from(selectedSubOptions.entries()).map(([k, v]) => [k, Array.from(v)])
    )
  }, [selectedSubOptions])

  return {
    selectedSubOptions,
    setSelectedSubOptions,
    nbQuestions,
    setNbQuestions,
    displayDuration,
    setDisplayDuration,
    initializeSelection,
    toggleSubOption,
    toggleOption,
    toggleAll,
    toggleAllVariant,
    getTotalSelected,
    getMaxVariants,
    getSelectedOptionsArray,
    getSelectedOptionsObject,
  }
}
