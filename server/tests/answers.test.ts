import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Question } from '../src/models/Survey.js'
import { validateAnswers } from '../src/services/answers.js'

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

const questions: Question[] = [
  question({ id: 'q1', type: 'short_text', label: 'Your name', required: true }),
  question({ id: 'q2', type: 'long_text', label: 'Anything else?' }),
  question({
    id: 'q3',
    type: 'single_choice',
    label: 'Favourite colour',
    options: [
      { id: 'red', label: 'Red' },
      { id: 'blue', label: 'Blue' },
    ],
  }),
  question({
    id: 'q4',
    type: 'multi_choice',
    label: 'Weekend plans',
    options: [
      { id: 'read', label: 'Read' },
      { id: 'run', label: 'Run' },
      { id: 'code', label: 'Code' },
    ],
  }),
  question({ id: 'q5', type: 'rating', label: 'Rate us', min: 1, max: 5 }),
  question({ id: 'q6', type: 'scale', label: 'NPS', min: 1, max: 10 }),
]

describe('validateAnswers', () => {
  it('accepts a complete, valid submission and trims text', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: '  Amal  ' },
      { questionId: 'q2', value: 'Hello' },
      { questionId: 'q3', value: 'blue' },
      { questionId: 'q4', value: ['read', 'code'] },
      { questionId: 'q5', value: 4 },
      { questionId: 'q6', value: 9 },
    ])

    assert.equal(outcome.ok, true)
    if (!outcome.ok) return

    assert.equal(outcome.answers.length, 6)
    assert.deepEqual(outcome.answers.find((a) => a.questionId === 'q1')?.value, 'Amal')
    assert.deepEqual(outcome.answers.find((a) => a.questionId === 'q4')?.value, ['read', 'code'])
  })

  it('allows optional questions to be left out', () => {
    const outcome = validateAnswers(questions, [{ questionId: 'q1', value: 'Amal' }])
    assert.equal(outcome.ok, true)
  })

  it('rejects a missing required answer', () => {
    const outcome = validateAnswers(questions, [{ questionId: 'q2', value: 'hi' }])
    assert.equal(outcome.ok, false)
    if (outcome.ok) return
    assert.ok(outcome.errors.some((error) => error.includes('required')))
  })

  it('treats whitespace-only text as empty for a required question', () => {
    const outcome = validateAnswers(questions, [{ questionId: 'q1', value: '   ' }])
    assert.equal(outcome.ok, false)
  })

  it('rejects an answer to a question that does not exist', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q999', value: 'sneaky' },
    ])
    assert.equal(outcome.ok, false)
    if (outcome.ok) return
    assert.ok(outcome.errors.some((error) => error.includes('unknown question')))
  })

  it('rejects the same question answered twice', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q1', value: 'Someone else' },
    ])
    assert.equal(outcome.ok, false)
    if (outcome.ok) return
    assert.ok(outcome.errors.some((error) => error.includes('more than once')))
  })

  it('rejects an option id that is not on the question', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q3', value: 'green' },
    ])
    assert.equal(outcome.ok, false)
    if (outcome.ok) return
    assert.ok(outcome.errors.some((error) => error.includes('not a valid option')))
  })

  it('de-duplicates multi choice selections', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q4', value: ['read', 'read', 'run'] },
    ])
    assert.equal(outcome.ok, true)
    if (!outcome.ok) return
    assert.deepEqual(outcome.answers.find((a) => a.questionId === 'q4')?.value, ['read', 'run'])
  })

  it('rejects out-of-range and fractional ratings', () => {
    const tooHigh = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q5', value: 6 },
    ])
    assert.equal(tooHigh.ok, false)

    const fractional = validateAnswers(questions, [
      { questionId: 'q1', value: 'Amal' },
      { questionId: 'q5', value: 3.5 },
    ])
    assert.equal(fractional.ok, false)
  })

  it('rejects over-long text against the per-type limit', () => {
    const outcome = validateAnswers(questions, [
      { questionId: 'q1', value: 'x'.repeat(301) },
    ])
    assert.equal(outcome.ok, false)
    if (outcome.ok) return
    assert.ok(outcome.errors.some((error) => error.includes('longer than')))
  })
})
