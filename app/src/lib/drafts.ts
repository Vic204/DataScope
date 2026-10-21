import type { Question, QuestionInput, QuestionOption, QuestionType } from '@/lib/api'
import { QUESTION_TYPE_LABELS } from '@/lib/api'

/**
 * Draft questions are what the builder edits in memory.
 *
 * They differ from saved questions in two ways that matter:
 *  - they carry a local `key`, because a brand new question has no server id
 *    yet and React still needs a stable identity for the row;
 *  - their numeric bounds and help text may be blank while being typed.
 *
 * Keeping this shape separate from the API shape means neither has to
 * compromise, and the conversion lives in one place (`toPayload`).
 */

export type DraftOption = { key: string; id?: string; label: string }

export type DraftQuestion = {
  key: string
  id?: string
  type: QuestionType
  label: string
  helpText: string
  required: boolean
  options: DraftOption[]
  min: string
  max: string
}

export const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice']
export const NUMERIC_TYPES: QuestionType[] = ['rating', 'scale']

export function isChoice(type: QuestionType): boolean {
  return CHOICE_TYPES.includes(type)
}

export function isNumeric(type: QuestionType): boolean {
  return NUMERIC_TYPES.includes(type)
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function draftOption(label: string, id?: string): DraftOption {
  return { key: uid(), id, label }
}

/** A fresh question of the chosen type, with sensible defaults filled in. */
export function newQuestion(type: QuestionType): DraftQuestion {
  return {
    key: uid(),
    type,
    label: '',
    helpText: '',
    required: false,
    options: isChoice(type) ? [draftOption(''), draftOption('')] : [],
    min: isNumeric(type) ? '1' : '',
    max: type === 'scale' ? '10' : isNumeric(type) ? '5' : '',
  }
}

/** Turns a saved question into an editable draft, keeping its ids. */
export function fromServer(question: Question): DraftQuestion {
  return {
    key: question.id,
    id: question.id,
    type: question.type,
    label: question.label,
    helpText: question.helpText ?? '',
    required: Boolean(question.required),
    options: (question.options ?? []).map((option: QuestionOption) =>
      draftOption(option.label, option.id),
    ),
    min: question.min != null ? String(question.min) : isNumeric(question.type) ? '1' : '',
    max:
      question.max != null
        ? String(question.max)
        : question.type === 'scale'
          ? '10'
          : isNumeric(question.type)
            ? '5'
            : '',
  }
}

/**
 * Switching type keeps what still makes sense (the label, the required flag)
 * and repairs what does not - a rating has no options to offer, and a choice
 * needs at least two of them.
 */
export function retype(question: DraftQuestion, type: QuestionType): DraftQuestion {
  const next: DraftQuestion = { ...question, type }

  if (isChoice(type)) {
    const kept = question.options.filter((option) => option.label.trim().length > 0)
    while (kept.length < 2) kept.push(draftOption(''))
    next.options = kept
    next.min = ''
    next.max = ''
  } else if (isNumeric(type)) {
    next.min = question.min || '1'
    next.max = type === 'scale' ? question.max || '10' : question.max || '5'
  } else {
    next.min = ''
    next.max = ''
  }

  return next
}

/** The API shape. Bounds are only sent for numeric questions, never as null. */
export function toPayload(question: DraftQuestion): QuestionInput {
  const payload: QuestionInput = {
    type: question.type,
    label: question.label.trim(),
    required: question.required,
  }

  if (question.id) payload.id = question.id

  const helpText = question.helpText.trim()
  if (helpText) payload.helpText = helpText

  if (isChoice(question.type)) {
    payload.options = question.options.map((option) => ({
      ...(option.id ? { id: option.id } : {}),
      label: option.label.trim(),
    }))
  }

  if (isNumeric(question.type)) {
    const min = Number.parseInt(question.min, 10)
    const max = Number.parseInt(question.max, 10)
    if (Number.isFinite(min)) payload.min = min
    if (Number.isFinite(max)) payload.max = max
  }

  return payload
}

/**
 * Client-side checks, so obvious mistakes are caught before a round trip.
 * The server validates all of this again - it is the source of truth.
 */
export function validateDraft(title: string, questions: DraftQuestion[]): string[] {
  const problems: string[] = []

  if (title.trim().length < 3) problems.push('Give the survey a title of at least three letters.')
  if (title.trim().length > 120) problems.push('That title is a little too long (120 letters max).')
  if (questions.length > 60) problems.push('Sixty questions is the limit for one survey.')

  questions.forEach((question, index) => {
    const where = `Question ${index + 1}`

    if (!question.label.trim()) problems.push(`${where} needs to actually ask something.`)
    if (question.label.trim().length > 200) problems.push(`${where} is longer than 200 letters.`)
    if (question.helpText.trim().length > 200) problems.push(`${where}'s note is too long.`)

    if (isChoice(question.type)) {
      const filled = question.options.filter((option) => option.label.trim().length > 0)
      if (filled.length < 2) problems.push(`${where} needs at least two options.`)
      if (question.options.length > 20) problems.push(`${where} has too many options (20 max).`)
    }

    if (isNumeric(question.type)) {
      const min = Number.parseInt(question.min, 10)
      const max = Number.parseInt(question.max, 10)
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        problems.push(`${where} needs a lowest and a highest value.`)
      } else if (min >= max) {
        problems.push(`${where}: the lowest value must be smaller than the highest.`)
      } else if (question.type === 'scale' && (max < 2 || max > 10)) {
        problems.push(`${where}: a scale can run from 1 to at most 10.`)
      }
    }
  })

  return problems
}

export function typeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type]
}

/** A one-line summary of a draft question, used in the builder's list header. */
export function summarise(question: DraftQuestion): string {
  const parts = [typeLabel(question.type)]
  if (isChoice(question.type)) parts.push(`${question.options.length} options`)
  if (isNumeric(question.type)) parts.push(`${question.min}–${question.max}`)
  if (question.required) parts.push('required')
  return parts.join(' · ')
}

export const TYPE_CHOICES: { type: QuestionType; glyph: string }[] = [
  { type: 'short_text', glyph: '✎' },
  { type: 'long_text', glyph: '☰' },
  { type: 'single_choice', glyph: '◉' },
  { type: 'multi_choice', glyph: '☑' },
  { type: 'rating', glyph: '★' },
  { type: 'scale', glyph: '⇥' },
]
