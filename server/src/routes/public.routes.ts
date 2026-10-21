import { Router } from 'express'
import { asyncHandler, HttpError } from '../lib/http.js'
import { currentUser, optionalAuth, requireAuth } from '../middleware/auth.js'
import { Response } from '../models/Response.js'
import { Survey, toPublicSurvey } from '../models/Survey.js'
import { submitResponseSchema } from '../schemas.js'
import { validateAnswers } from '../services/answers.js'

export const publicRouter = Router()

/**
 * Public routes power the share link. Someone with the link can read a
 * published survey even if its targeting would not have shown it to them in
 * the feed - a link is an explicit invitation.
 */
publicRouter.get(
  '/surveys/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const survey = await Survey.findOne({ slug: req.params.slug }).populate('owner', 'name')
    if (!survey) throw HttpError.notFound('That survey link is not valid')

    // Populated above, so this is the owner document rather than an id.
    const owner = survey.owner as unknown as { _id: unknown; name?: string }
    const me = req.user
    const isOwner = me ? String(owner._id) === String(me._id) : false

    if (survey.status === 'draft' && !isOwner) {
      throw HttpError.notFound('That survey link is not valid')
    }

    const myResponse = me
      ? await Response.findOne({ survey: survey._id, respondent: me._id }).select('_id submittedAt')
      : null

    res.json({
      survey: toPublicSurvey(survey, { ownerName: owner.name }),
      isOwner,
      alreadyAnswered: Boolean(myResponse),
      answeredAt: myResponse?.submittedAt ?? null,
      acceptsResponses: survey.status === 'published',
    })
  }),
)

/** POST /api/public/surveys/:slug/responses - submit an answer sheet. */
publicRouter.post(
  '/surveys/:slug/responses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = submitResponseSchema.parse(req.body)
    const me = currentUser(req)

    const survey = await Survey.findOne({ slug: req.params.slug })
    if (!survey) throw HttpError.notFound('That survey link is not valid')

    if (survey.status !== 'published') {
      throw HttpError.conflict(
        survey.status === 'closed' ? 'That survey is closed' : 'That survey is not published yet',
      )
    }

    if (String(survey.owner) === String(me._id)) {
      throw HttpError.badRequest('You cannot answer your own survey')
    }

    const existing = await Response.findOne({ survey: survey._id, respondent: me._id })
    if (existing) throw HttpError.conflict('You already answered this survey')

    const outcome = validateAnswers(survey.questions as never, input.answers)
    if (!outcome.ok) {
      throw new HttpError(422, 'Some answers need another look', outcome.errors)
    }

    const response = await Response.create({
      survey: survey._id,
      respondent: me._id,
      answers: outcome.answers,
      submittedAt: new Date(),
    })

    res.status(201).json({
      response: {
        id: String(response._id),
        survey: String(survey._id),
        submittedAt: response.submittedAt,
      },
    })
  }),
)
