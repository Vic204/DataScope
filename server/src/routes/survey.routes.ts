import { Router, type Request } from 'express'
import { asyncHandler, HttpError } from '../lib/http.js'
import { randomSlug } from '../lib/jwt.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { Response } from '../models/Response.js'
import { Survey, toPublicSurvey, type SurveyDoc } from '../models/Survey.js'
import { surveyCreateSchema, surveyUpdateSchema } from '../schemas.js'
import { buildResults } from '../services/results.js'
import { normalizeQuestions } from '../services/surveyInput.js'

export const surveyRouter = Router()

surveyRouter.use(requireAuth)

async function ownedSurvey(req: Request): Promise<SurveyDoc> {
  const survey = await Survey.findById(req.params.id)
  if (!survey) throw HttpError.notFound('No survey with that id')
  if (String(survey.owner) !== String(currentUser(req)._id)) {
    throw HttpError.forbidden('This survey belongs to someone else')
  }
  return survey
}

async function responseStats(surveyIds: unknown[]) {
  const rows = await Response.aggregate<{ _id: unknown; count: number; last: Date | null }>([
    { $match: { survey: { $in: surveyIds } } },
    { $group: { _id: '$survey', count: { $sum: 1 }, last: { $max: '$submittedAt' } } },
  ])

  return new Map(rows.map((row) => [String(row._id), row]))
}

/** GET /api/surveys - the signed-in user's own surveys, newest first. */
surveyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentUser(req)
    const surveys = await Survey.find({ owner: me._id }).sort({ createdAt: -1 })
    const stats = await responseStats(surveys.map((survey) => survey._id))

    res.json({
      surveys: surveys.map((survey) => {
        const stat = stats.get(String(survey._id))
        return {
          ...toPublicSurvey(survey),
          responseCount: stat?.count ?? 0,
          lastResponseAt: stat?.last ?? null,
        }
      }),
    })
  }),
)

/** POST /api/surveys - create a draft. A draft can be edited freely. */
surveyRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = surveyCreateSchema.parse(req.body)
    const me = currentUser(req)

    const survey = await Survey.create({
      owner: me._id,
      title: input.title,
      description: input.description ?? '',
      accent: input.accent ?? 'yellow',
      slug: `${randomSlug(7)}`,
      status: 'draft',
      questions: normalizeQuestions(input.questions ?? []),
      targeting: {
        audience: input.targeting?.audience ?? 'everyone',
        minAge: input.targeting?.minAge ?? undefined,
        maxAge: input.targeting?.maxAge ?? undefined,
        cities: input.targeting?.cities ?? [],
        interests: input.targeting?.interests ?? [],
      },
    })

    res.status(201).json({ survey: toPublicSurvey(survey) })
  }),
)

/** GET /api/surveys/:id - full survey, owner only. */
surveyRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const survey = await ownedSurvey(req)
    const stat = (await responseStats([survey._id])).get(String(survey._id))
    res.json({
      survey: {
        ...toPublicSurvey(survey),
        responseCount: stat?.count ?? 0,
        lastResponseAt: stat?.last ?? null,
      },
    })
  }),
)

/**
 * PATCH /api/surveys/:id
 *
 * Questions are frozen once a survey is published: results are keyed by
 * question id, so editing them afterwards would silently corrupt the numbers
 * people are already reading. Title, description, accent and targeting stay
 * editable.
 */
surveyRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = surveyUpdateSchema.parse(req.body)
    const survey = await ownedSurvey(req)

    if (input.questions && survey.status !== 'draft') {
      throw HttpError.conflict(
        'Questions cannot be changed after publishing. Duplicate the survey if you need a new version.',
      )
    }

    if (input.title !== undefined) survey.title = input.title
    if (input.description !== undefined) survey.description = input.description
    if (input.accent !== undefined) survey.accent = input.accent
    if (input.questions !== undefined) {
      survey.set('questions', normalizeQuestions(input.questions))
    }

    if (input.targeting) {
      survey.targeting = {
        audience: input.targeting.audience ?? survey.targeting?.audience ?? 'everyone',
        minAge: input.targeting.minAge ?? undefined,
        maxAge: input.targeting.maxAge ?? undefined,
        cities: input.targeting.cities ?? [],
        interests: input.targeting.interests ?? [],
      }
    }

    await survey.save()
    res.json({ survey: toPublicSurvey(survey) })
  }),
)

/** POST /api/surveys/:id/publish - make it answerable and shareable. */
surveyRouter.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const survey = await ownedSurvey(req)

    if (survey.questions.length === 0) {
      throw HttpError.badRequest('Add at least one question before publishing')
    }
    if (survey.status === 'published') {
      throw HttpError.conflict('That survey is already published')
    }

    survey.status = 'published'
    survey.publishedAt = new Date()
    survey.closedAt = undefined
    await survey.save()

    res.json({ survey: toPublicSurvey(survey) })
  }),
)

/** POST /api/surveys/:id/close - stop collecting new responses. */
surveyRouter.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const survey = await ownedSurvey(req)

    if (survey.status !== 'published') {
      throw HttpError.conflict('Only a published survey can be closed')
    }

    survey.status = 'closed'
    survey.closedAt = new Date()
    await survey.save()

    res.json({ survey: toPublicSurvey(survey) })
  }),
)

/** DELETE /api/surveys/:id - removes the survey and its responses. */
surveyRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const survey = await ownedSurvey(req)
    await Response.deleteMany({ survey: survey._id })
    await survey.deleteOne()
    res.json({ deleted: true, id: String(survey._id) })
  }),
)

/** GET /api/surveys/:id/results - aggregates for the dashboard. */
surveyRouter.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const survey = await ownedSurvey(req)
    const responses = await Response.find({ survey: survey._id }).sort({ submittedAt: -1 })

    res.json({
      survey: toPublicSurvey(survey),
      results: buildResults(survey.questions as never, responses),
    })
  }),
)
