import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ResponseDoc } from '../src/models/Response.js'
import type { Question } from '../src/models/Survey.js'
import { buildResults } from '../src/services/results.js'

/** A plain spec so tests do not have to satisfy mongoose's document types. */
type QuestionSpec = {
  id: string
  type: Question['type']
  label: string
  helpText?: string
  required?: boolean
  options?: { id: string; label: string }[]
  min?: number
  max?: number
}

const question = (spec: QuestionSpec): Question =>
  ({ helpText: '', required: false, options: [], ...spec }) as unknown as Question

const response = (
  submittedAt: Date,
  answers: { questionId: string; type: string; value: unknown }[],
): ResponseDoc =>
  ({
    submittedAt,
    createdAt: submittedAt,
    answers,
  }) as unknown as ResponseDoc

const questions: Question[] = [
  question({
    id: 'q1',
    type: 'single_choice',
    label: 'Colour',
    options: [
      { id: 'red', label: 'Red' },
      { id: 'blue', label: 'Blue' },
      { id: 'green', label: 'Green' },
    ],
  }),
  question({
    id: 'q2',
    type: 'multi_choice',
    label: 'Plans',
    options: [
      { id: 'read', label: 'Read' },
      { id: 'run', label: 'Run' },
    ],
  }),
  question({ id: 'q3', type: 'rating', label: 'Rating', min: 1, max: 5 }),
  question({ id: 'q4', type: 'long_text', label: 'Comments' }),
  question({ id: 'q5', type: 'scale', label: 'NPS', min: 1, max: 3 }),
]

const now = new Date('2026-03-10T12:00:00Z')

const responses: ResponseDoc[] = [
  response(new Date('2026-03-09T09:00:00Z'), [
    { questionId: 'q1', type: 'single_choice', value: 'red' },
    { questionId: 'q2', type: 'multi_choice', value: ['read', 'run'] },
    { questionId: 'q3', type: 'rating', value: 5 },
    { questionId: 'q4', type: 'long_text', value: 'Loved it' },
    { questionId: 'q5', type: 'scale', value: 3 },
  ]),
  response(new Date('2026-03-10T10:00:00Z'), [
    { questionId: 'q1', type: 'single_choice', value: 'blue' },
    { questionId: 'q2', type: 'multi_choice', value: ['read'] },
    { questionId: 'q3', type: 'rating', value: 3 },
    { questionId: 'q5', type: 'scale', value: 2 },
  ]),
]

const results = buildResults(questions, responses, now)

const find = (id: string) => {
  const found = results.summary.find((entry) => entry.questionId === id)
  assert.ok(found, `expected a summary for ${id}`)
  return found
}

describe('buildResults', () => {
  it('counts the total responses and their window', () => {
    assert.equal(results.totalResponses, 2)
    assert.equal(results.firstResponseAt?.toISOString(), '2026-03-09T09:00:00.000Z')
    assert.equal(results.lastResponseAt?.toISOString(), '2026-03-10T10:00:00.000Z')
  })

  it('produces a 14 day timeline ending today, oldest first', () => {
    assert.equal(results.timeline.length, 14)
    assert.equal(results.timeline.at(-1)?.date, '2026-03-10')
    assert.equal(results.timeline.at(-1)?.count, 1)
    assert.equal(results.timeline.at(-2)?.date, '2026-03-09')
    assert.equal(results.timeline.at(-2)?.count, 1)
    assert.equal(
      results.timeline.reduce((total, entry) => total + entry.count, 0),
      2,
    )
  })

  it('breaks single choice down by option with percentages', () => {
    const summary = find('q1')
    assert.equal(summary.type, 'single_choice')
    if (summary.type !== 'single_choice') return
    assert.equal(summary.answered, 2)
    assert.deepEqual(
      summary.options.map((option) => [option.id, option.count, option.percent]),
      [
        ['red', 1, 50],
        ['blue', 1, 50],
        ['green', 0, 0],
      ],
    )
  })

  it('counts every selection for multi choice, and percentages use total selections', () => {
    const summary = find('q2')
    assert.equal(summary.type, 'multi_choice')
    if (summary.type !== 'multi_choice') return
    assert.equal(summary.answered, 2)
    assert.deepEqual(
      summary.options.map((option) => [option.id, option.count]),
      [
        ['read', 2],
        ['run', 1],
      ],
    )
    assert.equal(summary.options[0]?.percent, 66.7)
  })

  it('averages ratings and keeps an empty bucket for unrated values', () => {
    const summary = find('q3')
    assert.equal(summary.type, 'rating')
    if (summary.type !== 'rating') return
    assert.equal(summary.answered, 2)
    assert.equal(summary.average, 4)
    assert.deepEqual(
      summary.distribution.map((bucket) => [bucket.value, bucket.count]),
      [
        [1, 0],
        [2, 0],
        [3, 1],
        [4, 0],
        [5, 1],
      ],
    )
  })

  it('returns null average for a rating nobody answered', () => {
    const empty = buildResults([question({ id: 'z', type: 'rating', label: 'Nothing' })], [], now)
    const summary = empty.summary[0]
    assert.equal(summary?.type, 'rating')
    if (summary?.type !== 'rating') return
    assert.equal(summary.average, null)
    assert.equal(summary.answered, 0)
  })

  it('lists text answers newest first and flags truncation', () => {
    const summary = find('q4')
    assert.equal(summary.type, 'long_text')
    if (summary.type !== 'long_text') return
    assert.equal(summary.answered, 1)
    assert.equal(summary.texts[0]?.value, 'Loved it')
    assert.equal(summary.truncated, false)
  })

  it('uses the question range for the scale distribution', () => {
    const summary = find('q5')
    assert.equal(summary.type, 'scale')
    if (summary.type !== 'scale') return
    assert.deepEqual(
      summary.distribution.map((bucket) => [bucket.value, bucket.count]),
      [
        [1, 0],
        [2, 1],
        [3, 1],
      ],
    )
    assert.equal(summary.average, 2.5)
  })

  it('survives responses that skip optional questions entirely', () => {
    const partial = response(new Date('2026-03-10T11:00:00Z'), [
      { questionId: 'q1', type: 'single_choice', value: 'red' },
    ])
    const outcome = buildResults(questions, [partial], now)
    assert.equal(outcome.totalResponses, 1)
    assert.equal(outcome.summary.find((entry) => entry.questionId === 'q3')?.answered, 0)
  })
})
