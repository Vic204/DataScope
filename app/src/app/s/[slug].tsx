import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, StickyNote } from '@/components/controls'
import { Card, Doodle, PaperScreen, Rule } from '@/components/paper'
import { QuestionField } from '@/components/questions'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote, PageLoader } from '@/components/states'
import { Text, Title } from '@/components/text'
import { api, errorMessage, type AnswerInput, type AnswerValue, type Question } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { plural, relativeTime } from '@/lib/format'
import { useAsync } from '@/lib/use-async'
import { highlighter, palette, space } from '@/theme/tokens'

/**
 * The page behind a share link: /s/<slug>.
 *
 * It is reachable by anyone, signed in or not. Targeting rules deliberately do
 * not apply here - a link is an explicit invitation - but submitting an answer
 * does require an account, so a signed-out visitor sees the questions and a
 * sign-in prompt instead of the inputs.
 */
export default function AnswerSurveyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const { data, error, loading, reload } = useAsync(() => api.public.survey(slug), [slug])

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // A new link means a clean sheet. On native a second link is a new screen, but
  // on the web the same route component can be reused for a different slug.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers({})
    setSubmitted(false)
    setSubmitError(null)
  }, [slug])

  const survey = data?.survey
  const questions = useMemo<Question[]>(() => survey?.questions ?? [], [survey])

  const missingRequired = useMemo(
    () => questions.filter((question) => question.required && isBlank(answers[question.id])),
    [questions, answers],
  )

  const answeredCount = questions.filter((question) => !isBlank(answers[question.id])).length

  async function submit() {
    if (missingRequired.length > 0) {
      setSubmitError(
        `Still needed: ${missingRequired.map((question) => `“${question.label}”`).join(', ')}`,
      )
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: AnswerInput[] = questions
        .filter((question) => !isBlank(answers[question.id]))
        .map((question) => ({ questionId: question.id, value: answers[question.id] as AnswerValue }))

      await api.public.submit(slug, payload)
      setSubmitted(true)
    } catch (problem) {
      setSubmitError(errorMessage(problem))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PaperScreen scroll={false}>
        <PageLoader caption="opening the page…" />
      </PaperScreen>
    )
  }

  if (error || !survey || !data) {
    return (
      <PaperScreen>
        <ScreenHeader title="a broken link" mark="pink" onBack={() => router.replace('/')} />
        <ErrorNote
          message={error ?? 'That survey link does not open anything.'}
          onRetry={reload}
        />
        <Button
          label="back to discover"
          variant="secondary"
          onPress={() => router.replace('/')}
          fullWidth
          style={styles.farButton}
        />
      </PaperScreen>
    )
  }

  const accent = highlighter[survey.accent] ?? highlighter.yellow
  const canAnswer = data.acceptsResponses && !data.alreadyAnswered && !submitted && Boolean(user)

  return (
    <PaperScreen>
      <ScreenHeader
        title={survey.title}
        subtitle={`${survey.ownerName ?? 'someone'} · ${plural(questions.length, 'question')}`}
        mark={survey.accent}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />

      {survey.description ? (
        <Text variant="body" tone="soft" style={styles.description}>
          {survey.description}
        </Text>
      ) : null}

      <View style={styles.tags}>
        <Pill>{data.acceptsResponses ? 'open for answers' : 'closed'}</Pill>
        {data.acceptsResponses ? (
          <Pill>{`about ${Math.max(1, Math.round(questions.length * 0.3))} min`}</Pill>
        ) : null}
        {answeredCount > 0 && canAnswer ? <Pill>{`${answeredCount} answered`}</Pill> : null}
      </View>

      {data.isOwner ? (
        <StickyNote color="mint" style={styles.notice}>
          <Text variant="small" tone="soft">
            this is your own survey — you can read it here, but only other people can answer it.
          </Text>
          <Button
            label="manage this survey"
            size="sm"
            variant="secondary"
            leading="✎"
            onPress={() => router.push({ pathname: '/survey/[id]', params: { id: survey.id } })}
            style={styles.noticeButton}
          />
        </StickyNote>
      ) : null}

      {!user ? (
        <StickyNote color="sky" style={styles.notice} tiltDeg={0.6}>
          <Text variant="small" tone="soft">
            sign in to fill this in — it takes a moment, and you will land right back on this page.
          </Text>
          <Button
            label="sign in and answer"
            size="sm"
            leading="→"
            onPress={() =>
              router.push({ pathname: '/sign-in', params: { next: `/s/${survey.slug}` } })
            }
            style={styles.noticeButton}
          />
        </StickyNote>
      ) : null}

      {data.alreadyAnswered || submitted ? (
        <Card tape={4} tiltDeg={-0.4} style={styles.thanks}>
          <View style={styles.thanksHead}>
            <Doodle size={26} tiltDeg={-8} color={palette.good}>
              ✓
            </Doodle>
            <Title variant="h2" tone="good" mark="mint" tiltDeg={-0.6}>
              {submitted ? 'noted, thank you!' : 'you already filled this in'}
            </Title>
          </View>
          <Text variant="small" tone="soft" style={styles.thanksBody}>
            {submitted
              ? `Your answers were saved. Someone will be glad you took the time.`
              : `You answered this ${relativeTime(data.answeredAt)}. One answer per person keeps the results honest.`}
          </Text>
          <View style={styles.thanksActions}>
            <Button
              label="find another survey"
              variant="secondary"
              size="sm"
              onPress={() => router.replace('/')}
            />
          </View>
        </Card>
      ) : null}

      {canAnswer ? (
        <View style={styles.form}>
          <Rule />
          {questions.map((question, index) => (
            <QuestionField
              key={question.id}
              question={question}
              number={index + 1}
              value={answers[question.id]}
              onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
            />
          ))}

          {submitError ? <ErrorNote message={submitError} style={styles.submitError} /> : null}

          <View style={styles.progress}>
            <Text variant="small" tone="soft">
              {answeredCount} of {questions.length} written down
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: accent.bar }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${questions.length === 0 ? 0 : (answeredCount / questions.length) * 100}%`,
                    backgroundColor: accent.solid,
                  },
                ]}
              />
            </View>
          </View>

          <Button
            label="send my answers"
            leading="✓"
            onPress={submit}
            loading={submitting}
            fullWidth
            tiltDeg={-0.3}
            style={styles.submit}
          />
        </View>
      ) : null}

      {/* Read-only, but still shown: either the visitor is not signed in yet, or
          the survey has stopped collecting answers. Either way they are worth
          being able to read. */}
      {!canAnswer && !data.alreadyAnswered && !submitted ? (
        <View style={styles.form}>
          <Rule />
          {!data.acceptsResponses ? (
            <Text variant="body" tone="soft" style={styles.closedNote}>
              This survey is closed, so it is not taking new answers. The questions are below, for
              reference.
            </Text>
          ) : null}
          {questions.map((question, index) => (
            <QuestionField
              key={question.id}
              question={question}
              number={index + 1}
              value={answers[question.id]}
              onChange={() => undefined}
              disabled
            />
          ))}
        </View>
      ) : null}
    </PaperScreen>
  )
}

function Pill({ children }: { children: string }) {
  return (
    <View style={styles.pill}>
      <Text variant="tiny" tone="soft">
        {children}
      </Text>
    </View>
  )
}

/** Nothing written down yet? Text, lists and numbers all have a blank form. */
function isBlank(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.trim().length === 0
  return false
}

const styles = StyleSheet.create({
  description: {
    marginTop: space.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 52, 68, 0.06)',
  },
  notice: {
    marginTop: space.lg,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    marginTop: space.md,
  },
  thanks: {
    marginTop: space.lg,
  },
  thanksHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  thanksBody: {
    marginTop: space.sm,
  },
  thanksActions: {
    flexDirection: 'row',
    marginTop: space.lg,
  },
  form: {
    marginTop: space.xs,
  },
  closedNote: {
    marginTop: space.md,
    marginBottom: space.md,
  },
  submitError: {
    marginBottom: space.lg,
  },
  progress: {
    marginBottom: space.lg,
    gap: space.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    opacity: 0.5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  submit: {
    marginBottom: space.xl,
  },
  farButton: {
    marginTop: space.xl,
  },
})
