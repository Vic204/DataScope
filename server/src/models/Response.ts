import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose'

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    type: { type: String, required: true },
    // string for text, number for rating/scale, string[] for multi choice
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
)

const responseSchema = new Schema(
  {
    survey: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
    respondent: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: { type: [answerSchema], default: [] },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

// One response per person per survey - enforced by the database, not just the API.
responseSchema.index({ survey: 1, respondent: 1 }, { unique: true })

export type Answer = InferSchemaType<typeof answerSchema>
export type ResponseDoc = HydratedDocument<InferSchemaType<typeof responseSchema>>

export const Response = model('Response', responseSchema, 'responses')
