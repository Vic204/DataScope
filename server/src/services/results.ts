import type { ResponseDoc } from '../models/Response.js'
import type { Question, QuestionType } from '../models/Survey.js'
import { rangeFor } from './answers.js'

export type ChoiceBreakdown = {
  id: string
  label: string
  count: number
  percent: number
}

export type QuestionSummary =
  | {
      questionId: string
      type: 'short_text' | 'long_text'
      label: string
      answered: number
      /** Most recent answers first, capped to keep the payload small. */
      texts: { value: string; submittedAt: Date }[]
      truncated: boolean
    }
  | {
      questionId: string
      type: 'single_choice' | 'multi_choice'
      label: string
      answered: number
      options: ChoiceBreakdown[]
    }
  | {
      questionId: string
      type: 'rating' | 'scale'
      label: string
      answered: number
      average: number | null
      min: number
      max: number
      distribution: { value: number; count: number }[]
    }

export type SurveyResults = {
  totalResponses: number
  firstResponseAt: Date | null
  lastResponseAt: Date | null
  /** Response counts per day for the trailing window (oldest first). */
  timeline: { date: string; count: number }[]
  summary: QuestionSummary[]
}

const MAX_TEXT_SAMPLES = 200
const TIMELINE_DAYS = 14

const dayKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const round = (value: number, places = 2): number => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Turns a set of raw responses into aggregate numbers for the dashboard.
 *
 * Deliberately a pure function over plain data: no database access, no HTTP,
 * so it is cheap to unit test and safe to call with partially filled surveys.
 */
export function buildResults(
  questions: Question[],
  responses: ResponseDoc[],
  now: Date = new Date(),
): SurveyResults {
  const submitted = responses
    .map((response) => response.submittedAt ?? response.createdAt ?? now)
    .sort((a, b) => a.getTime() - b.getTime())

  // --- responses per day, including days with no responses at all ---------
  const timeline: { date: string; count: number }[] = []
  const counts = new Map<string, number>()
  for (const date of submitted) {
    const key = dayKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (let offset = TIMELINE_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(date.getDate() - offset)
    const key = dayKey(date)
    timeline.push({ date: key, count: counts.get(key) ?? 0 })
  }

  const summary: QuestionSummary[] = questions.map((question) => {
    const answers = responses
      .map((response) => ({
        answer: response.answers.find((entry) => entry.questionId === question.id),
        submittedAt: response.submittedAt ?? response.createdAt ?? now,
      }))
      .filter((entry): entry is { answer: NonNullable<typeof entry.answer>; submittedAt: Date } =>
        Boolean(entry.answer),
      )

    const type: QuestionType = question.type
    const answered = answers.length

    if (type === 'short_text' || type === 'long_text') {
      const texts = answers
        .slice()
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, MAX_TEXT_SAMPLES)
        .map((entry) => ({ value: String(entry.answer.value), submittedAt: entry.submittedAt }))

      return {
        questionId: question.id,
        type,
        label: question.label,
        answered,
        texts,
        truncated: answered > texts.length,
      }
    }

    if (type === 'single_choice' || type === 'multi_choice') {
      const tally = new Map<string, number>()
      let selections = 0
      for (const entry of answers) {
        const values = Array.isArray(entry.answer.value)
          ? (entry.answer.value as string[])
          : [String(entry.answer.value)]
        for (const value of values) {
          tally.set(value, (tally.get(value) ?? 0) + 1)
          selections += 1
        }
      }

      const options: ChoiceBreakdown[] = question.options.map((option) => {
        const count = tally.get(option.id) ?? 0
        return {
          id: option.id,
          label: option.label,
          count,
          percent: selections > 0 ? round((count / selections) * 100, 1) : 0,
        }
      })

      return {
        questionId: question.id,
        type,
        label: question.label,
        answered,
        options,
      }
    }

    const { min, max } = rangeFor(question)
    const distribution: { value: number; count: number }[] = []
    for (let value = min; value <= max; value += 1) {
      const count = answers.filter((entry) => Number(entry.answer.value) === value).length
      distribution.push({ value, count })
    }

    const numbers = answers
      .map((entry) => Number(entry.answer.value))
      .filter((value) => Number.isFinite(value))

    const average =
      numbers.length > 0 ? round(numbers.reduce((total, value) => total + value, 0) / numbers.length) : null

    return {
      questionId: question.id,
      type,
      label: question.label,
      answered,
      average,
      min,
      max,
      distribution,
    }
  })

  return {
    totalResponses: responses.length,
    firstResponseAt: submitted[0] ?? null,
    lastResponseAt: submitted[submitted.length - 1] ?? null,
    timeline,
    summary,
  }
}
