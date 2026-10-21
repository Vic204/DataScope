import type { z } from 'zod'
import { randomSlug } from '../lib/jwt.js'
import type { Question } from '../models/Survey.js'
import type { questionSchema } from '../schemas.js'

type QuestionInput = z.infer<typeof questionSchema>

/**
 * The client sends questions without ids (or with ids while it is still
 * drafting in memory). The server owns identity: every question and option
 * gets a stable id here so responses can be joined back to them forever.
 */
export function normalizeQuestions(input: QuestionInput[]): Question[] {
  const usedQuestionIds = new Set<string>()

  return input.map((question) => {
    let id = question.id?.trim() || `q_${randomSlug(6)}`
    while (usedQuestionIds.has(id)) id = `q_${randomSlug(6)}`
    usedQuestionIds.add(id)

    const usedOptionIds = new Set<string>()
    const options = (question.options ?? []).map((option) => {
      let optionId = option.id?.trim() || `o_${randomSlug(4)}`
      while (usedOptionIds.has(optionId)) optionId = `o_${randomSlug(4)}`
      usedOptionIds.add(optionId)
      return { id: optionId, label: option.label }
    })

    return {
      id,
      type: question.type,
      label: question.label,
      helpText: question.helpText ?? '',
      required: question.required ?? false,
      options,
      ...(question.min != null ? { min: question.min } : {}),
      ...(question.max != null ? { max: question.max } : {}),
    } as Question
  })
}
