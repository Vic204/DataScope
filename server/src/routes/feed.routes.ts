import { Router } from 'express'
import { asyncHandler } from '../lib/http.js'
import { currentUser, requireAuth } from '../middleware/auth.js'
import { Response } from '../models/Response.js'
import { Survey, toPublicSurvey } from '../models/Survey.js'
import { matchesProfile } from '../services/matcher.js'

export const feedRouter = Router()

feedRouter.use(requireAuth)

/** Candidate window: read the newest N open surveys before filtering for a match. */
const CANDIDATE_LIMIT = 200

async function responseCountsFor(surveyIds: unknown[]) {
  const rows = await Response.aggregate<{ _id: unknown; count: number }>([
    { $match: { survey: { $in: surveyIds } } },
    { $group: { _id: '$survey', count: { $sum: 1 } } },
  ])
  return new Map(rows.map((row) => [String(row._id), row.count]))
}

/**
 * GET /api/feed
 *
 * Published surveys written by other people that the signed-in user's profile
 * qualifies for and has not answered yet.
 *
 * The targeting rules are evaluated in application code rather than in the
 * query. That keeps the matching rules readable and unit-testable
 * (services/matcher.ts), which matters more at this scale than shaving a
 * database round trip; the query itself stays indexed and bounded.
 */
feedRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = currentUser(req)
    const search = String(req.query.search ?? '').trim().toLowerCase()

    const answered = await Response.find({ respondent: me._id }).select('survey')
    const answeredIds = answered.map((entry) => entry.survey)

    const candidates = await Survey.find({
      status: 'published',
      owner: { $ne: me._id },
      _id: { $nin: answeredIds },
    })
      .sort({ createdAt: -1 })
      .limit(CANDIDATE_LIMIT)
      .populate('owner', 'name')

    const ownerName = (owner: unknown): string | undefined =>
      (owner as { name?: string } | undefined)?.name

    const matched = candidates.filter((survey) => matchesProfile(me.profile, survey.targeting))

    const visible = search
      ? matched.filter((survey) =>
          `${survey.title} ${survey.description}`.toLowerCase().includes(search),
        )
      : matched

    const counts = await responseCountsFor(visible.map((survey) => survey._id))

    res.json({
      surveys: visible.map((survey) => ({
        ...toPublicSurvey(survey, { ownerName: ownerName(survey.owner) }),
        responseCount: counts.get(String(survey._id)) ?? 0,
      })),
      matchedCount: matched.length,
    })
  }),
)

/** GET /api/feed/answered - surveys the signed-in user has answered. */
feedRouter.get(
  '/answered',
  asyncHandler(async (req, res) => {
    const me = currentUser(req)

    const responses = await Response.find({ respondent: me._id })
      .sort({ submittedAt: -1 })
      .populate<{ survey: { _id: unknown; title: string; slug: string; status: string } | null }>({
        path: 'survey',
        select: 'title slug status owner accent description',
      })

    res.json({
      responses: responses
        .filter((entry) => entry.survey)
        .map((entry) => ({
          id: String(entry._id),
          submittedAt: entry.submittedAt,
          survey: {
            id: String(entry.survey!._id),
            title: entry.survey!.title,
            slug: entry.survey!.slug,
            status: entry.survey!.status,
          },
          answerCount: entry.answers.length,
        })),
    })
  }),
)
