import type { Answer } from '../models/Response.js'
import type { Question, QuestionType } from '../models/Survey.js'

export type IncomingAnswer = {
  questionId: string
  /** Absent or empty counts as "not answered" (see isEmpty in validateAnswers). */
  value?: unknown
}

export type ValidationOutcome =
  | { ok: true; answers: Answer[] }
  | { ok: false; errors: string[] }

const LIMITS: Record<string, number> = {
  short_text: 300,
  long_text: 5000,
}

/** Defaults for numeric questions when the builder did not set a range. */
export function defaultRange(type: QuestionType): { min: number; max: number } {
  if (type === 'rating') return { min: 1, max: 5 }
  return { min: 1, max: 10 }
}

export function rangeFor(question: Pick<Question, 'type' | 'min' | 'max'>) {
  const fallback = defaultRange(question.type)
  const min = typeof question.min === 'number' ? question.min : fallback.min
  const max = typeof question.max === 'number' ? question.max : fallback.max
  return { min, max }
}

const isEmpty = (value: unknown): boolean => {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Validates and normalises submitted answers against the survey definition.
 *
 * This is the API's last line of defence: the client renders widgets, but the
 * server decides what a valid answer is (option ids, ranges, lengths, required
 * fields, duplicate questions, answers to questions that do not exist).
 */
export function validateAnswers(questions: Question[], incoming: IncomingAnswer[]): ValidationOutcome {
  const errors: string[] = []
  const answers: Answer[] = []
  const byId = new Map(questions.map((question) => [question.id, question]))
  const seen = new Set<string>()

  for (const item of incoming) {
    if (!item || typeof item.questionId !== 'string') {
      errors.push('An answer is missing its questionId')
      continue
    }
    const question = byId.get(item.questionId)
    if (!question) {
      errors.push(`Answer submitted for an unknown question ("${item.questionId}")`)
      continue
    }
    if (seen.has(item.questionId)) {
      errors.push(`Question "${question.label}" was answered more than once`)
      continue
    }
    seen.add(item.questionId)
  }

  for (const question of questions) {
    const submitted = incoming.find((item) => item?.questionId === question.id)

    if (!submitted || isEmpty(submitted.value)) {
      if (question.required) errors.push(`"${question.label}" is required`)
      continue
    }

    const value = submitted.value

    switch (question.type) {
      case 'short_text':
      case 'long_text': {
        if (typeof value !== 'string') {
          errors.push(`"${question.label}" expects text`)
          break
        }
        const trimmed = value.trim()
        const limit = LIMITS[question.type] ?? 1000
        if (trimmed.length > limit) {
          errors.push(`"${question.label}" is longer than ${limit} characters`)
          break
        }
        answers.push({ questionId: question.id, type: question.type, value: trimmed })
        break
      }

      case 'single_choice': {
        if (typeof value !== 'string') {
          errors.push(`"${question.label}" expects one option`)
          break
        }
        const option = question.options.find((candidate) => candidate.id === value)
        if (!option) {
          errors.push(`"${value}" is not a valid option for "${question.label}"`)
          break
        }
        answers.push({ questionId: question.id, type: question.type, value: option.id })
        break
      }

      case 'multi_choice': {
        if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
          errors.push(`"${question.label}" expects a list of options`)
          break
        }
        const unique = [...new Set(value as string[])]
        const invalid = unique.filter(
          (id) => !question.options.some((candidate) => candidate.id === id),
        )
        if (invalid.length > 0) {
          errors.push(`"${invalid.join('", "')}" is not a valid option for "${question.label}"`)
          break
        }
        answers.push({ questionId: question.id, type: question.type, value: unique })
        break
      }

      case 'rating':
      case 'scale': {
        const numeric = typeof value === 'number' ? value : Number(value)
        const { min, max } = rangeFor(question)
        if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
          errors.push(`"${question.label}" expects a whole number`)
          break
        }
        if (numeric < min || numeric > max) {
          errors.push(`"${question.label}" must be between ${min} and ${max}`)
          break
        }
        answers.push({ questionId: question.id, type: question.type, value: numeric })
        break
      }

      default: {
        errors.push(`Unsupported question type "${question.type}"`)
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, answers }
}
