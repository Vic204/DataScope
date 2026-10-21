import { z } from 'zod'
import { ACCENTS, CHOICE_TYPES, NUMERIC_TYPES, QUESTION_TYPES } from './models/Survey.js'

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max)

export const registerSchema = z.object({
  name: trimmed(2, 60),
  email: z.string().trim().toLowerCase().email('That does not look like an email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  profile: z
    .object({
      age: z.number().int().min(10).max(120).optional(),
      city: trimmed(1, 80).optional(),
      occupation: trimmed(1, 80).optional(),
      interests: z.array(trimmed(1, 40)).max(20).optional(),
    })
    .optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  name: trimmed(2, 60).optional(),
  profile: z
    .object({
      age: z.number().int().min(10).max(120).nullable().optional(),
      city: z.string().trim().max(80).nullable().optional(),
      occupation: z.string().trim().max(80).nullable().optional(),
      interests: z.array(trimmed(1, 40)).max(20).optional(),
    })
    .optional(),
})

export const optionSchema = z.object({
  id: z.string().trim().min(1).max(40).optional(),
  label: trimmed(1, 120),
})

export const questionSchema = z
  .object({
    id: z.string().trim().min(1).max(40).optional(),
    type: z.enum(QUESTION_TYPES),
    label: trimmed(1, 200),
    helpText: z.string().trim().max(200).optional(),
    required: z.boolean().optional(),
    options: z.array(optionSchema).max(20).optional(),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
  })
  .superRefine((question, ctx) => {
    if (CHOICE_TYPES.includes(question.type) && (question.options?.length ?? 0) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Choice questions need at least two options',
      })
    }
    if (NUMERIC_TYPES.includes(question.type)) {
      if (question.min != null && question.max != null && question.min >= question.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['min'],
          message: 'min must be smaller than max',
        })
      }
    }
  })

const targetingSchema = z
  .object({
    audience: z.enum(['everyone', 'matching']).optional(),
    minAge: z.number().int().min(10).max(120).nullable().optional(),
    maxAge: z.number().int().min(10).max(120).nullable().optional(),
    cities: z.array(trimmed(1, 80)).max(30).optional(),
    interests: z.array(trimmed(1, 40)).max(20).optional(),
  })
  .superRefine((targeting, ctx) => {
    if (
      targeting.minAge != null &&
      targeting.maxAge != null &&
      targeting.minAge > targeting.maxAge
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minAge'],
        message: 'minAge cannot be greater than maxAge',
      })
    }
  })

export const surveyCreateSchema = z.object({
  title: trimmed(3, 120),
  description: z.string().trim().max(600).optional(),
  accent: z.enum(ACCENTS).optional(),
  questions: z.array(questionSchema).max(60).optional(),
  targeting: targetingSchema.optional(),
})

export const surveyUpdateSchema = z.object({
  title: trimmed(3, 120).optional(),
  description: z.string().trim().max(600).optional(),
  accent: z.enum(ACCENTS).optional(),
  questions: z.array(questionSchema).max(60).optional(),
  targeting: targetingSchema.optional(),
})

export const submitResponseSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        value: z.unknown(),
      }),
    )
    .max(100),
})
