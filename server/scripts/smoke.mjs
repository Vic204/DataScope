#!/usr/bin/env node
/**
 * End-to-end smoke test: talks to a running API over HTTP the way the app does.
 *
 *   npm run dev            (in one terminal - starts the API)
 *   node scripts/smoke.mjs (in another)
 *
 * Set SMOKE_BASE to point somewhere else, e.g. a deployed URL:
 *   SMOKE_BASE=https://api.example.com node scripts/smoke.mjs
 */

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:4000'

let passed = 0
let failed = 0

function check(name, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  \u001b[32mok\u001b[0m   ${name}`)
  } else {
    failed += 1
    console.log(`  \u001b[31mFAIL\u001b[0m ${name}${detail ? `\n       ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

async function api(method, path, options = {}) {
  const { token, body } = options
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    // some responses legitimately have no body
  }

  return { status: res.status, json }
}

const stamp = Date.now()

async function main() {
  console.log(`Running smoke test against ${BASE}`)

  section('health')
  const health = await api('GET', '/api/health')
  check('GET /api/health is 200 and reports a connected database',
    health.status === 200 && health.json?.ok === true,
    JSON.stringify(health.json))

  section('accounts')
  const author = await api('POST', '/api/auth/register', {
    body: {
      name: 'Smoke Author',
      email: `author+${stamp}@smoke.test`,
      password: 'password123',
      profile: { age: 30, city: 'Chennai', interests: ['cooking'] },
    },
  })
  check('a new account can register', author.status === 201 && Boolean(author.json?.token), JSON.stringify(author.json))

  const respondent = await api('POST', '/api/auth/register', {
    body: {
      name: 'Smoke Respondent',
      email: `respondent+${stamp}@smoke.test`,
      password: 'password123',
      profile: { age: 22, city: 'Kochi', interests: ['music'] },
    },
  })
  check('a second account can register', respondent.status === 201 && Boolean(respondent.json?.token))

  const duplicate = await api('POST', '/api/auth/register', {
    body: { name: 'Copycat', email: `author+${stamp}@smoke.test`, password: 'password123' },
  })
  check('a duplicate email is rejected with 409', duplicate.status === 409, `got ${duplicate.status}`)

  const badLogin = await api('POST', '/api/auth/login', {
    body: { email: 'amal@datascope.dev', password: 'wrong-password' },
  })
  check('a wrong password is rejected with 401', badLogin.status === 401, `got ${badLogin.status}`)

  const seeded = await api('POST', '/api/auth/login', {
    body: { email: 'amal@datascope.dev', password: 'password123' },
  })
  check('a seeded account can sign in', seeded.status === 200 && seeded.json?.user?.name === 'Amal Krishna')

  const authorToken = author.json?.token
  const respondentToken = respondent.json?.token

  section('authorisation')
  const anonymous = await api('GET', '/api/surveys')
  check('an anonymous request to a protected route is 401', anonymous.status === 401, `got ${anonymous.status}`)

  const me = await api('GET', '/api/auth/me', { token: respondentToken })
  check('GET /api/auth/me returns the signed-in user', me.status === 200 && me.json?.user?.email?.includes('respondent+'))

  section('creating and publishing a survey')
  const created = await api('POST', '/api/surveys', {
    token: authorToken,
    body: {
      title: `Smoke survey ${stamp}`,
      description: 'Created by the smoke test.',
      accent: 'mint',
      questions: [
        {
          type: 'short_text',
          label: 'What is your name?',
          required: true,
        },
        {
          type: 'single_choice',
          label: 'Pick one',
          required: true,
          options: [{ label: 'First' }, { label: 'Second' }],
        },
        {
          type: 'multi_choice',
          label: 'Pick any',
          options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
        },
        { type: 'rating', label: 'Rate it', min: 1, max: 5 },
      ],
    },
  })

  const survey = created.json?.survey
  check('a survey can be created as a draft', created.status === 201 && survey?.status === 'draft')
  check('the server assigns ids to questions and options',
    Boolean(survey?.questions?.[0]?.id) && Boolean(survey?.questions?.[1]?.options?.[0]?.id),
    JSON.stringify(survey?.questions?.map((q) => q.id)))
  check('a slug is generated for sharing', typeof survey?.slug === 'string' && survey.slug.length >= 6)

  const choiceQuestion = survey?.questions?.[1]
  const multiQuestion = survey?.questions?.[2]

  const publishTooSoon = await api('POST', '/api/surveys/000000000000000000000000/publish', { token: authorToken })
  check('publishing an unknown survey is 404', publishTooSoon.status === 404, `got ${publishTooSoon.status}`)

  const published = await api('POST', `/api/surveys/${survey?.id}/publish`, { token: authorToken })
  check('a survey can be published', published.status === 200 && published.json?.survey?.status === 'published')

  const editAfterPublish = await api('PATCH', `/api/surveys/${survey?.id}`, {
    token: authorToken,
    body: { questions: [{ type: 'short_text', label: 'Sneaky rewrite' }] },
  })
  check('questions cannot be edited after publishing (409)', editAfterPublish.status === 409, `got ${editAfterPublish.status}`)

  const renameAfterPublish = await api('PATCH', `/api/surveys/${survey?.id}`, {
    token: authorToken,
    body: { title: 'Smoke survey (renamed)' },
  })
  check('the title can still be edited after publishing', renameAfterPublish.status === 200)

  section('share link')
  const publicView = await api('GET', `/api/public/surveys/${survey?.slug}`)
  check('the share link reads a published survey without auth', publicView.status === 200 && publicView.json?.survey?.id === survey?.id)
  check('the share link reports that this visitor has not answered', publicView.json?.alreadyAnswered === false)

  const publicWithToken = await api('GET', `/api/public/surveys/${survey?.slug}`, { token: authorToken })
  check('the owner is recognised on their own share link', publicWithToken.json?.isOwner === true)

  const missingLink = await api('GET', '/api/public/surveys/doesnotexist')
  check('an unknown share link is 404', missingLink.status === 404, `got ${missingLink.status}`)

  section('discovery feed')
  const feedBefore = await api('GET', '/api/feed', { token: respondentToken })
  const feedSlugsBefore = (feedBefore.json?.surveys ?? []).map((entry) => entry.slug)
  check('the new survey appears in a matching profile\'s feed', feedSlugsBefore.includes(survey?.slug),
    `feed: ${feedSlugsBefore.join(', ')}`)

  const authorFeed = await api('GET', '/api/feed', { token: authorToken })
  check('your own survey never appears in your own feed',
    !(authorFeed.json?.surveys ?? []).some((entry) => entry.slug === survey?.slug))

  section('answering')
  const selfAnswer = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: authorToken,
    body: { answers: [{ questionId: survey?.questions?.[0]?.id, value: 'me' }] },
  })
  check('you cannot answer your own survey (400)', selfAnswer.status === 400, `got ${selfAnswer.status}`)

  const missingRequired = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: respondentToken,
    body: { answers: [{ questionId: survey?.questions?.[1]?.id, value: choiceQuestion?.options?.[0]?.id }] },
  })
  check('a missing required answer is rejected with 422', missingRequired.status === 422, `got ${missingRequired.status}`)

  const badOption = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: respondentToken,
    body: {
      answers: [
        { questionId: survey?.questions?.[0]?.id, value: 'Respondent' },
        { questionId: choiceQuestion?.id, value: 'not-a-real-option' },
      ],
    },
  })
  check('an invented option id is rejected with 422', badOption.status === 422, `got ${badOption.status}`)

  const badRating = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: respondentToken,
    body: {
      answers: [
        { questionId: survey?.questions?.[0]?.id, value: 'Respondent' },
        { questionId: choiceQuestion?.id, value: choiceQuestion?.options?.[0]?.id },
        { questionId: survey?.questions?.[3]?.id, value: 99 },
      ],
    },
  })
  check('an out-of-range rating is rejected with 422', badRating.status === 422, `got ${badRating.status}`)

  const submitted = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: respondentToken,
    body: {
      answers: [
        { questionId: survey?.questions?.[0]?.id, value: 'Smoke Respondent' },
        { questionId: choiceQuestion?.id, value: choiceQuestion?.options?.[1]?.id },
        {
          questionId: multiQuestion?.id,
          value: [multiQuestion?.options?.[0]?.id, multiQuestion?.options?.[1]?.id],
        },
        { questionId: survey?.questions?.[3]?.id, value: 4 },
      ],
    },
  })
  check('a valid answer sheet is accepted with 201', submitted.status === 201, JSON.stringify(submitted.json))

  const twice = await api('POST', `/api/public/surveys/${survey?.slug}/responses`, {
    token: respondentToken,
    body: { answers: [{ questionId: survey?.questions?.[0]?.id, value: 'again' }] },
  })
  check('answering twice is rejected with 409', twice.status === 409, `got ${twice.status}`)

  const answeredFeed = await api('GET', '/api/feed', { token: respondentToken })
  check('an answered survey leaves the feed',
    !(answeredFeed.json?.surveys ?? []).some((entry) => entry.slug === survey?.slug))

  const answeredHistory = await api('GET', '/api/feed/answered', { token: respondentToken })
  check('the answered list records the submission',
    (answeredHistory.json?.responses ?? []).some((entry) => entry.survey?.slug === survey?.slug))

  const reopened = await api('GET', `/api/public/surveys/${survey?.slug}`, { token: respondentToken })
  check('the share link now reports alreadyAnswered', reopened.json?.alreadyAnswered === true)

  section('results')
  const results = await api('GET', `/api/surveys/${survey?.id}/results`, { token: authorToken })
  const choiceSummary = results.json?.results?.summary?.find((entry) => entry.questionId === choiceQuestion?.id)
  const ratingSummary = results.json?.results?.summary?.find((entry) => entry.questionId === survey?.questions?.[3]?.id)

  check('the owner can read results', results.status === 200 && results.json?.results?.totalResponses === 1)
  check('choice results count the chosen option',
    choiceSummary?.options?.find((option) => option.id === choiceQuestion?.options?.[1]?.id)?.count === 1)
  check('choice percentages add up to 100',
    Math.round(choiceSummary?.options?.reduce((total, option) => total + option.percent, 0) ?? 0) === 100)
  check('rating results carry the average', ratingSummary?.average === 4, JSON.stringify(ratingSummary))
  check('the timeline covers 14 days', results.json?.results?.timeline?.length === 14)

  const otherResults = await api('GET', `/api/surveys/${survey?.id}/results`, { token: respondentToken })
  check('a different account cannot read someone else\'s results (403)', otherResults.status === 403, `got ${otherResults.status}`)

  section('profile-matching targeting')
  const targeted = await api('POST', '/api/surveys', {
    token: authorToken,
    body: {
      title: `Cricket fans only ${stamp}`,
      targeting: { audience: 'matching', interests: ['cricket'], minAge: 18, maxAge: 40 },
      questions: [{ type: 'short_text', label: 'Best innings?', required: true }],
    },
  })
  await api('POST', `/api/surveys/${targeted.json?.survey?.id}/publish`, { token: authorToken })

  const feedBeforeProfile = await api('GET', '/api/feed', { token: respondentToken })
  check('a target the profile does not satisfy stays out of the feed',
    !(feedBeforeProfile.json?.surveys ?? []).some((entry) => entry.slug === targeted.json?.survey?.slug))

  await api('PATCH', '/api/users/me', {
    token: respondentToken,
    body: { profile: { interests: ['music', 'cricket'] } },
  })

  const feedAfterProfile = await api('GET', '/api/feed', { token: respondentToken })
  check('adding the interest unlocks the survey in the feed',
    (feedAfterProfile.json?.surveys ?? []).some((entry) => entry.slug === targeted.json?.survey?.slug))

  section('validation of survey input')
  const badSurvey = await api('POST', '/api/surveys', {
    token: authorToken,
    body: { title: 'no', questions: [{ type: 'single_choice', label: 'Only one option', options: [{ label: 'Lonely' }] }] },
  })
  check('a too-short title is rejected (422)', badSurvey.status === 422, `got ${badSurvey.status}`)

  const badRange = await api('POST', '/api/surveys', {
    token: authorToken,
    body: { title: 'Bad range survey', questions: [{ type: 'rating', label: 'Rate', min: 5, max: 2 }] },
  })
  check('an impossible rating range is rejected (422)', badRange.status === 422, `got ${badRange.status}`)

  section('cleanup')
  const deleted = await api('DELETE', `/api/surveys/${survey?.id}`, { token: authorToken })
  const gone = await api('GET', `/api/public/surveys/${survey?.slug}`)
  check('an owner can delete their survey', deleted.status === 200 && deleted.json?.deleted === true)
  check('a deleted survey disappears from the share link (404)', gone.status === 404, `got ${gone.status}`)

  const orphanedResults = await api('GET', `/api/surveys/${survey?.id}/results`, { token: authorToken })
  check('results for a deleted survey are gone too (404)', orphanedResults.status === 404, `got ${orphanedResults.status}`)

  console.log(`\n${failed === 0 ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m'} ${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('\nSmoke test crashed before finishing:', error)
  console.error(`Is the API running at ${BASE}? Try: npm run dev`)
  process.exit(1)
})
