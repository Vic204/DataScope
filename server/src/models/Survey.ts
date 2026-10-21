import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose'

/** The question types the builder can create. */
export const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multi_choice',
  'rating',
  'scale',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

/** Types where the answer is free text. */
export const TEXT_TYPES: QuestionType[] = ['short_text', 'long_text']
/** Types where the answer is one of a fixed set of options. */
export const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multi_choice']
/** Types where the answer is a number on a scale. */
export const NUMERIC_TYPES: QuestionType[] = ['rating', 'scale']

export const ACCENTS = ['yellow', 'pink', 'mint', 'lilac', 'sky'] as const
export type Accent = (typeof ACCENTS)[number]

const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: false },
)

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    helpText: { type: String, trim: true, maxlength: 200, default: '' },
    required: { type: Boolean, default: false },
    options: { type: [optionSchema], default: [] },
    // Only meaningful for rating / scale
    min: { type: Number },
    max: { type: Number },
  },
  { _id: false },
)

/**
 * Who a survey is shown to. `everyone` means it appears in every feed;
 * `matching` means it only appears for people whose profile satisfies the
 * rules below (see services/matcher.ts).
 */
const targetingSchema = new Schema(
  {
    audience: { type: String, enum: ['everyone', 'matching'], default: 'everyone' },
    minAge: { type: Number, min: 10, max: 120 },
    maxAge: { type: Number, min: 10, max: 120 },
    cities: { type: [String], default: [] },
    interests: { type: [String], default: [] },
  },
  { _id: false },
)

const surveySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    slug: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
    accent: { type: String, enum: ACCENTS, default: 'yellow' },
    questions: { type: [questionSchema], default: [] },
    targeting: { type: targetingSchema, default: () => ({}) },
    publishedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true },
)

// Supports the feed query: published surveys, newest first, excluding my own.
surveySchema.index({ status: 1, createdAt: -1 })

export type Question = InferSchemaType<typeof questionSchema> & { type: QuestionType }
export type Targeting = InferSchemaType<typeof targetingSchema>
export type SurveyDoc = HydratedDocument<InferSchemaType<typeof surveySchema>>

export const Survey = model('Survey', surveySchema, 'surveys')

export function toPublicSurvey(survey: SurveyDoc, options: { ownerName?: string } = {}) {
  return {
    id: String(survey._id),
    owner: String(survey.owner),
    ownerName: options.ownerName,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    status: survey.status,
    accent: survey.accent,
    questions: survey.questions,
    targeting: survey.targeting,
    publishedAt: survey.publishedAt ?? null,
    createdAt: survey.createdAt,
  }
}

export type PublicSurvey = ReturnType<typeof toPublicSurvey>
