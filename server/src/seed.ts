import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from './db/connect.js'
import { randomSlug } from './lib/jwt.js'
import { Response } from './models/Response.js'
import { Survey, type Question } from './models/Survey.js'
import { User } from './models/User.js'
import { validateAnswers } from './services/answers.js'

/**
 * Seeds a believable demo: three accounts with different profiles, a mix of
 * survey states, and enough responses to make the dashboard charts interesting.
 *
 *   npm run seed        (from the repo root: npm run seed)
 *
 * Safe to run repeatedly - it clears the three demo collections first.
 */

const PASSWORD = 'password123'

/** A plain spec so the seed does not have to satisfy mongoose's document types. */
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

const q = (
  id: string,
  type: Question['type'],
  label: string,
  extra: Omit<QuestionSpec, 'id' | 'type' | 'label'> = {},
): Question =>
  ({
    id,
    type,
    label,
    helpText: '',
    required: false,
    options: [],
    ...extra,
  }) as unknown as Question

async function main() {
  await connectDatabase()

  await Promise.all([User.deleteMany({}), Survey.deleteMany({}), Response.deleteMany({})])

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  const amal = await User.create({
    name: 'Amal Krishna',
    email: 'amal@datascope.dev',
    passwordHash,
    profile: { age: 22, city: 'Kochi', occupation: 'MCA student', interests: ['music', 'technology', 'reading'] },
  })

  const riya = await User.create({
    name: 'Riya Menon',
    email: 'riya@datascope.dev',
    passwordHash,
    profile: { age: 21, city: 'Kochi', occupation: 'Design student', interests: ['music', 'art'] },
  })

  const arjun = await User.create({
    name: 'Arjun Das',
    email: 'arjun@datascope.dev',
    passwordHash,
    profile: { age: 26, city: 'Bengaluru', occupation: 'Backend engineer', interests: ['technology', 'cricket'] },
  })

  // Meera owns nothing and has answered nothing, so signing in as her shows the
  // discover feed exactly as a new account finds it.
  const meera = await User.create({
    name: 'Meera Nair',
    email: 'meera@datascope.dev',
    passwordHash,
    profile: { age: 19, city: 'Kochi', occupation: 'First year B.Com', interests: ['art', 'music'] },
  })

  // Riya -> visible to everybody
  const study = await Survey.create({
    owner: riya._id,
    title: 'How do you actually study?',
    description: 'An honest look at study habits. No judgement, promise.',
    slug: randomSlug(7),
    status: 'published',
    accent: 'pink',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    questions: [
      q('q_study_1', 'single_choice', 'When do you get most of your work done?', {
        required: true,
        options: [
          { id: 'o_early', label: 'Early morning' },
          { id: 'o_afternoon', label: 'Afternoon' },
          { id: 'o_night', label: 'Late at night' },
          { id: 'o_chaos', label: 'Whenever panic hits' },
        ],
      }),
      q('q_study_2', 'multi_choice', 'What helps you focus?', {
        options: [
          { id: 'o_music', label: 'Music' },
          { id: 'o_snacks', label: 'Snacks' },
          { id: 'o_deadline', label: 'A deadline' },
          { id: 'o_friend', label: 'Studying with someone' },
          { id: 'o_silence', label: 'Total silence' },
        ],
      }),
      q('q_study_3', 'rating', 'How happy are you with your current routine?', {
        min: 1,
        max: 5,
      }),
      q('q_study_4', 'long_text', 'What is one study tip you would give a first year?', {
        helpText: 'Anything that actually worked for you.',
      }),
    ],
  })

  // Arjun -> only for 18-30, Kochi, interested in music or art
  const coffee = await Survey.create({
    owner: arjun._id,
    title: 'Kochi coffee crawl: the verdict',
    description: 'Rating six cafes across Fort Kochi and Panampilly Nagar.',
    slug: randomSlug(7),
    status: 'published',
    accent: 'yellow',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    targeting: { audience: 'matching', minAge: 18, maxAge: 30, cities: ['Kochi'], interests: ['music', 'art'] },
    questions: [
      q('q_coffee_1', 'single_choice', 'Best filter coffee in the city?', {
        required: true,
        options: [
          { id: 'o_a', label: 'Kashi Art Cafe' },
          { id: 'o_b', label: 'Loafers Corner' },
          { id: 'o_c', label: 'Tea Bungalow' },
          { id: 'o_d', label: 'Somewhere I have not tried yet' },
        ],
      }),
      q('q_coffee_2', 'scale', 'How important is wifi to you when choosing a cafe?', { min: 1, max: 10 }),
      q('q_coffee_3', 'short_text', 'One cafe everyone should try?'),
    ],
  })

  // Riya -> 18-24 interested in music
  const playlist = await Survey.create({
    owner: riya._id,
    title: 'Late-night playlist survey',
    description: 'Building a shared playlist for exam season. Add your taste.',
    slug: randomSlug(7),
    status: 'published',
    accent: 'lilac',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    targeting: { audience: 'matching', minAge: 18, maxAge: 24, interests: ['music'] },
    questions: [
      q('q_play_1', 'single_choice', 'What carries you through a late night?', {
        required: true,
        options: [
          { id: 'o_lo_fi', label: 'Lo-fi beats' },
          { id: 'o_indie', label: 'Indie Malayalam' },
          { id: 'o_pop', label: 'Loud pop' },
          { id: 'o_classical', label: 'Classical' },
        ],
      }),
      q('q_play_2', 'rating', 'Rate this idea: a shared playlist for the whole batch', { min: 1, max: 5 }),
      q('q_play_3', 'short_text', 'Drop one song that belongs on it.'),
    ],
  })

  // Riya -> a survey that uses every question type, so the answer page, the
  // builder and the results dashboard all have every shape to render.
  const everything = await Survey.create({
    owner: riya._id,
    title: 'Everything, all at once',
    description: 'Six questions, six kinds of answers - a tour of what a survey can ask.',
    slug: randomSlug(7),
    status: 'published',
    accent: 'mint',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    questions: [
      q('q_all_1', 'short_text', 'In one word, how is this week going?', { required: true }),
      q('q_all_2', 'long_text', 'What is taking up most of your headspace lately?', {
        helpText: 'A sentence is plenty.',
      }),
      q('q_all_3', 'single_choice', 'Which evening sounds best?', {
        required: true,
        options: [
          { id: 'o_all_a', label: 'A film and an early night' },
          { id: 'o_all_b', label: 'Out with people' },
          { id: 'o_all_c', label: 'Something creative' },
          { id: 'o_all_d', label: 'Absolutely nothing planned' },
        ],
      }),
      q('q_all_4', 'multi_choice', 'What do you do when you are stuck?', {
        options: [
          { id: 'o_all_walk', label: 'Go for a walk' },
          { id: 'o_all_ask', label: 'Ask someone' },
          { id: 'o_all_break', label: 'Take a break' },
          { id: 'o_all_push', label: 'Push through it' },
          { id: 'o_all_sleep', label: 'Sleep on it' },
        ],
      }),
      q('q_all_5', 'rating', 'How full is your tank today?', { min: 1, max: 5, required: true }),
      q('q_all_6', 'scale', 'How likely are you to say yes to plans this week?', { min: 1, max: 10 }),
    ],
  })

  // Amal's own published survey (won't appear in his own feed)
  const mca = await Survey.create({
    owner: amal._id,
    title: 'MCA life check-in',
    description: 'A short pulse check on how the semester is really going.',
    slug: randomSlug(7),
    status: 'published',
    accent: 'mint',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    questions: [
      q('q_mca_1', 'rating', 'How is the semester going so far?', { min: 1, max: 5, required: true }),
      q('q_mca_2', 'single_choice', 'Biggest time sink right now?', {
        options: [
          { id: 'o_lab', label: 'Lab work' },
          { id: 'o_theory', label: 'Theory papers' },
          { id: 'o_projects', label: 'Side projects' },
          { id: 'o_scroll', label: 'My phone' },
        ],
      }),
      q('q_mca_3', 'long_text', 'What would you change about the timetable?'),
    ],
  })

  // A draft, to show the builder flow
  await Survey.create({
    owner: amal._id,
    title: 'Weekend habits (draft)',
    description: 'Still figuring out the questions for this one.',
    slug: randomSlug(7),
    status: 'draft',
    accent: 'sky',
    questions: [q('q_w1', 'short_text', 'What does a perfect Saturday look like?')],
  })

  // A closed survey, to show state variety
  await Survey.create({
    owner: arjun._id,
    title: 'Placement prep poll (closed)',
    description: 'Closed now, but the results are still here.',
    slug: randomSlug(7),
    status: 'closed',
    accent: 'pink',
    publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    closedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    questions: [
      q('q_p1', 'single_choice', 'Have you started preparing?', {
        required: true,
        options: [
          { id: 'o_yes', label: 'Yes, properly' },
          { id: 'o_kinda', label: 'Sort of' },
          { id: 'o_no', label: 'Not yet' },
        ],
      }),
    ],
  })

  // --- responses ---------------------------------------------------------
  const answerSets: { survey: typeof study; respondent: typeof amal; answers: { questionId: string; value: unknown }[]; daysAgo: number }[] = [
    {
      survey: study,
      respondent: amal,
      daysAgo: 4,
      answers: [
        { questionId: 'q_study_1', value: 'o_night' },
        { questionId: 'q_study_2', value: ['o_music', 'o_deadline'] },
        { questionId: 'q_study_3', value: 3 },
        { questionId: 'q_study_4', value: 'Start the assignment the day it is given, even badly. Editing is easier than starting.' },
      ],
    },
    {
      survey: study,
      respondent: arjun,
      daysAgo: 3,
      answers: [
        { questionId: 'q_study_1', value: 'o_early' },
        { questionId: 'q_study_2', value: ['o_silence'] },
        { questionId: 'q_study_3', value: 4 },
        { questionId: 'q_study_4', value: 'Sleep is part of studying.' },
      ],
    },
    {
      survey: coffee,
      respondent: amal,
      daysAgo: 2,
      answers: [
        { questionId: 'q_coffee_1', value: 'o_a' },
        { questionId: 'q_coffee_2', value: 8 },
        { questionId: 'q_coffee_3', value: 'Kashi Art Cafe, go before 9am.' },
      ],
    },
    {
      survey: playlist,
      respondent: arjun,
      daysAgo: 1,
      answers: [
        { questionId: 'q_play_1', value: 'o_indie' },
        { questionId: 'q_play_2', value: 5 },
        { questionId: 'q_play_3', value: 'Anything by Job Kurian.' },
      ],
    },
    {
      survey: mca,
      respondent: riya,
      daysAgo: 6,
      answers: [
        { questionId: 'q_mca_1', value: 3 },
        { questionId: 'q_mca_2', value: 'o_projects' },
        { questionId: 'q_mca_3', value: 'Fewer 8am lectures would fix most of it.' },
      ],
    },
    {
      survey: mca,
      respondent: arjun,
      daysAgo: 5,
      answers: [
        { questionId: 'q_mca_1', value: 4 },
        { questionId: 'q_mca_2', value: 'o_lab' },
        { questionId: 'q_mca_3', value: 'More elective choice in the second year.' },
      ],
    },
    {
      survey: everything,
      respondent: amal,
      daysAgo: 1,
      answers: [
        { questionId: 'q_all_1', value: 'Busy' },
        {
          questionId: 'q_all_2',
          value: 'Placements start next month and I have not opened a single prep book.',
        },
        { questionId: 'q_all_3', value: 'o_all_a' },
        { questionId: 'q_all_4', value: ['o_all_walk', 'o_all_break'] },
        { questionId: 'q_all_5', value: 4 },
        { questionId: 'q_all_6', value: 7 },
      ],
    },
    {
      survey: everything,
      respondent: arjun,
      daysAgo: 1,
      answers: [
        { questionId: 'q_all_1', value: 'Steady' },
        {
          questionId: 'q_all_2',
          value: 'A rewrite at work that keeps turning into a bigger rewrite.',
        },
        { questionId: 'q_all_3', value: 'o_all_c' },
        { questionId: 'q_all_4', value: ['o_all_ask', 'o_all_sleep'] },
        { questionId: 'q_all_5', value: 3 },
        { questionId: 'q_all_6', value: 5 },
      ],
    },
  ]

  for (const entry of answerSets) {
    const questions = entry.survey.questions as never
    const outcome = validateAnswers(questions, entry.answers)
    if (!outcome.ok) {
      console.warn(`[seed] skipped a response for "${entry.survey.title}": ${outcome.errors.join('; ')}`)
      continue
    }
    await Response.create({
      survey: entry.survey._id,
      respondent: entry.respondent._id,
      answers: outcome.answers,
      submittedAt: new Date(Date.now() - entry.daysAgo * 24 * 60 * 60 * 1000),
    })
  }

  // Read back what actually landed rather than trusting the call sites. An
  // earlier version of this file printed hardcoded numbers, which quietly hid
  // the fact that half of these writes never made it to disk.
  const summaries = await Promise.all(
    [
      { user: amal, profile: 'age 22 | Kochi | music, technology, reading' },
      { user: riya, profile: 'age 21 | Kochi | music, art' },
      { user: arjun, profile: 'age 26 | Bengaluru | technology, cricket' },
      { user: meera, profile: 'age 19 | Kochi | art, music (nothing answered yet)' },
    ].map(async ({ user, profile }) => ({
      email: user.email,
      profile,
      surveys: await Survey.countDocuments({ owner: user._id }),
      responses: await Response.countDocuments({ respondent: user._id }),
    })),
  )

  const [userTotal, surveyTotal, responseTotal] = await Promise.all([
    User.countDocuments({}),
    Survey.countDocuments({}),
    Response.countDocuments({}),
  ])

  console.log('\n[seed] done. Sign in with any account below (password: password123)\n')
  console.table(summaries)
  console.log(
    `\n[seed] stored ${userTotal} users, ${surveyTotal} surveys, ${responseTotal} responses.`,
  )
  console.log('Note: your own surveys never appear in your own feed.')

  // 4 accounts, 7 surveys (five published, one draft, one closed), 8 responses.
  if (userTotal !== 4 || surveyTotal !== 7 || responseTotal !== answerSets.length) {
    throw new Error(
      `the seed wrote an incomplete dataset: expected 4 users / 7 surveys / ${answerSets.length} responses, ` +
        `found ${userTotal} / ${surveyTotal} / ${responseTotal}`,
    )
  }

  await disconnectDatabase()
}

main().catch(async (error) => {
  console.error('[seed] failed:', error)
  await disconnectDatabase()
  process.exit(1)
})
