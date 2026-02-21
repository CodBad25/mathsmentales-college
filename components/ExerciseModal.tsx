'use client'

import { type ExerciseDetail, type Exercise, getQuestionVariantCount, getQuestionVariantLabels } from '@/hooks/useExerciseDetail'

interface ModalAction {
  label: string
  onClick: () => void
  variant: 'green' | 'blue' | 'purple' | 'gray'
  disabled?: boolean
}

interface ExerciseModalProps {
  isOpen: boolean
  onClose: () => void
  selectedExercise: Exercise | null
  exerciseDetail: ExerciseDetail | null
  loadingExercise: boolean
  exerciseLoadError?: string | null
  selectedSubOptions: Map<number, Set<number>>
  nbQuestions: number
  displayDuration: number
  onNbQuestionsChange: (n: number) => void
  onDisplayDurationChange: (d: number) => void
  onToggleSubOption: (optIdx: number, varIdx: number) => void
  onToggleOption: (optIdx: number) => void
  onToggleAll: (select: boolean) => void
  onToggleAllVariant: (varIdx: number) => void
  getTotalSelected: () => number
  getMaxVariants: () => number
  actions: ModalAction[]
}

const variantColors: Record<ModalAction['variant'], string> = {
  green: 'bg-green-500 text-white hover:bg-green-600',
  blue: 'bg-blue-500 text-white hover:bg-blue-600',
  purple: 'bg-purple-500 text-white hover:bg-purple-600',
  gray: 'text-gray-600 hover:bg-gray-200',
}

export default function ExerciseModal({
  isOpen,
  onClose,
  selectedExercise,
  exerciseDetail,
  loadingExercise,
  exerciseLoadError,
  selectedSubOptions,
  nbQuestions,
  displayDuration,
  onNbQuestionsChange,
  onDisplayDurationChange,
  onToggleSubOption,
  onToggleOption,
  onToggleAll,
  onToggleAllVariant,
  getTotalSelected,
  getMaxVariants,
  actions,
}: ExerciseModalProps) {
  if (!isOpen) return null

  const totalSelected = getTotalSelected()
  const maxVariants = getMaxVariants()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="p-4 border-b bg-gradient-to-r from-orange-100 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Activité {exerciseDetail?.ID}</div>
              <h2 className="text-xl font-bold text-blue-600">
                {loadingExercise ? 'Chargement...' : exerciseDetail?.title || selectedExercise?.t}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-2"
            >
              &times;
            </button>
          </div>

          {/* Sliders */}
          {!loadingExercise && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 w-40">Durée d&apos;affichage :</span>
                <span className="text-sm font-bold w-12">{displayDuration} s.</span>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={displayDuration}
                  onChange={(e) => onDisplayDurationChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 w-40">Nombre de questions :</span>
                <span className="text-sm font-bold w-12">{nbQuestions}</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={nbQuestions}
                  onChange={(e) => onNbQuestionsChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loadingExercise ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : exerciseDetail && exerciseDetail.options.length > 0 ? (
            <>
              <h3 className="font-bold text-lg mb-3">Questions types</h3>

              {/* Contrôles globaux */}
              <div className="flex items-center gap-4 mb-4 p-2 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={totalSelected === exerciseDetail.options.reduce((sum, _, i) =>
                      sum + getQuestionVariantCount(exerciseDetail, i), 0)}
                    onChange={(e) => onToggleAll(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="font-medium">Tout (dé)sélectionner</span>
                </label>

                {maxVariants > 1 && (
                  <div className="flex gap-3 ml-4">
                    {Array.from({ length: maxVariants }, (_, i) => (
                      <label key={i} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exerciseDetail.options.every((_, optIdx) => {
                            const count = getQuestionVariantCount(exerciseDetail, optIdx)
                            if (i >= count) return true
                            return (selectedSubOptions.get(optIdx) || new Set()).has(i)
                          })}
                          onChange={() => onToggleAllVariant(i)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm">Options {i + 1}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Liste des options */}
              <div className="space-y-3">
                {exerciseDetail.options.map((option, optIdx) => {
                  const variantCount = getQuestionVariantCount(exerciseDetail, optIdx)
                  const selectedVariants = selectedSubOptions.get(optIdx) || new Set<number>()
                  const labels = getQuestionVariantLabels(exerciseDetail, optIdx)
                  const isFullySelected = selectedVariants.size === variantCount

                  return (
                    <div key={optIdx} className="border rounded-lg p-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFullySelected}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedVariants.size > 0 && !isFullySelected
                          }}
                          onChange={() => onToggleOption(optIdx)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="font-medium">{option.name} :</span>
                      </label>

                      {variantCount > 1 && (
                        <div className="ml-6 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {labels.map((label, varIdx) => (
                            <label key={varIdx} className="flex items-center gap-1.5 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedVariants.has(varIdx)}
                                onChange={() => onToggleSubOption(optIdx, varIdx)}
                                className="w-3.5 h-3.5 text-primary-600 rounded"
                              />
                              <span className="text-gray-600">{label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : exerciseLoadError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{exerciseLoadError}</div>
              <p className="text-sm text-gray-500">
                Ce fichier d&apos;exercice n&apos;est pas disponible dans la bibliothèque.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Cet exercice utilise toutes les options par défaut.</p>
              <p className="text-sm mt-2">Cliquez sur &quot;C&apos;est parti !&quot; pour commencer.</p>
            </div>
          )}
        </div>

        {/* Pied avec actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">
              {totalSelected} type(s) de question(s) sélectionné(s)
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantColors[action.variant]}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
