import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button, Chip, Field, Segmented, StickyNote } from '@/components/controls'
import { Card, PaperScreen, Rule } from '@/components/paper'
import { QuestionEditor } from '@/components/question-editor'
import { QuestionField } from '@/components/questions'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote, PageLoader } from '@/components/states'
import { Text, Title } from '@/components/text'
import { api, errorMessage, type Audience, type Survey } from '@/lib/api'
import {
  fromServer,
  newQuestion,
  toPayload,
  TYPE_CHOICES,
  validateDraft,
  type DraftQuestion,
} from '@/lib/drafts'
import { joinList, splitList } from '@/lib/format'
import { useAsync } from '@/lib/use-async'
import { HIGHLIGHTERS, highlighter, palette, space, type HighlighterName } from '@/theme/tokens'

/**
 * The survey builder, at /builder/new and /builder/<id>.
 *
 * Rules it has to respect, all mirrored from the API:
 *  - a draft can be edited freely, including its questions;
 *  - once published the questions are frozen (responses are keyed to question
 *    ids, so changing them would corrupt results people are already reading),
 *    and only the title, description, colour and targeting stay editable;
 *  - a survey needs at least one question before it can be published.
 */
export default function BuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const { data, error: loadError, loading, reload } = useAsync(
    () => (isNew ? Promise.resolve(null) : api.surveys.get(id)),
    [id, isNew],
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState<HighlighterName>('yellow')
  const [questions, setQuestions] = useState<DraftQuestion[]>([])

  const [audience, setAudience] = useState<Audience>('everyone')
  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [citiesText, setCitiesText] = useState('')
  const [interestsText, setInterestsText] = useState('')

  const [busy, setBusy] = useState<'save' | 'publish' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const survey: Survey | null = data?.survey ?? null
  const locked = Boolean(survey && survey.status !== 'draft')

  // Seed the form from the server copy. Also runs after a save, which is safe:
  // the server copy is exactly what was just sent. There is no render-time value
  // to initialise from - the survey arrives from the network - so this is the
  // one place an effect is the right tool.
  useEffect(() => {
    if (!survey) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(survey.title)
    setDescription(survey.description ?? '')
    setAccent(survey.accent)
    setQuestions(survey.questions.map(fromServer))
    setAudience(survey.targeting?.audience ?? 'everyone')
    setMinAge(survey.targeting?.minAge != null ? String(survey.targeting.minAge) : '')
    setMaxAge(survey.targeting?.maxAge != null ? String(survey.targeting.maxAge) : '')
    setCitiesText(joinList(survey.targeting?.cities))
    setInterestsText(joinList(survey.targeting?.interests))
  }, [survey])

  function patchQuestion(next: DraftQuestion) {
    setQuestions((current) => current.map((question) => (question.key === next.key ? next : question)))
  }

  function removeQuestion(key: string) {
    setQuestions((current) => current.filter((question) => question.key !== key))
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const copy = [...current]
      const [moved] = copy.splice(index, 1)
      if (!moved) return current
      copy.splice(target, 0, moved)
      return copy
    })
  }

  async function save(mode: 'save' | 'publish') {
    setError(null)

    const problems = validateDraft(title, questions)
    if (problems.length > 0) {
      setError(problems[0] ?? 'Something in the draft needs fixing.')
      return
    }

    if (mode === 'publish' && questions.length === 0) {
      setError('Add at least one question before publishing.')
      return
    }

    if (audience === 'matching') {
      const low = minAge.trim() ? Number(minAge) : null
      const high = maxAge.trim() ? Number(maxAge) : null

      if (low !== null && (!Number.isInteger(low) || low < 10 || low > 120)) {
        setError('The youngest age should be a whole number between 10 and 120.')
        return
      }
      if (high !== null && (!Number.isInteger(high) || high < 10 || high > 120)) {
        setError('The oldest age should be a whole number between 10 and 120.')
        return
      }
      if (low !== null && high !== null && low > high) {
        setError('That age range is the wrong way round.')
        return
      }
    }

    setBusy(mode)
    try {
      const targeting = {
        audience,
        minAge: audience === 'matching' && minAge.trim() ? Number(minAge) : null,
        maxAge: audience === 'matching' && maxAge.trim() ? Number(maxAge) : null,
        cities: audience === 'matching' ? splitList(citiesText) : [],
        interests: audience === 'matching' ? splitList(interestsText) : [],
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        accent,
        targeting,
        // The API rejects question edits on a published survey, so do not send them.
        ...(locked ? {} : { questions: questions.map(toPayload) }),
      }

      let surveyId = id
      if (isNew) {
        const created = await api.surveys.create(payload)
        surveyId = created.survey.id
      } else {
        await api.surveys.update(id, payload)
      }

      if (mode === 'publish') await api.surveys.publish(surveyId)

      router.replace({ pathname: '/survey/[id]', params: { id: surveyId } })
    } catch (problem) {
      setError(errorMessage(problem))
    } finally {
      setBusy(null)
    }
  }

  if (!isNew && loading && !survey) {
    return (
      <PaperScreen scroll={false}>
        <PageLoader caption="opening the draft…" />
      </PaperScreen>
    )
  }

  if (loadError) {
    return (
      <PaperScreen>
        <ScreenHeader title="cannot open it" mark="pink" onBack={() => router.replace('/mine')} />
        <ErrorNote message={loadError} onRetry={reload} />
      </PaperScreen>
    )
  }

  const cityList = splitList(citiesText)
  const interestList = splitList(interestsText)

  return (
    <PaperScreen>
      <ScreenHeader
        title={isNew ? 'a new survey' : locked ? 'the details' : 'keep writing'}
        subtitle={
          isNew
            ? 'one question is enough to start'
            : locked
              ? 'questions are locked now — the rest stays editable'
              : 'still a draft, so anything can change'
        }
        mark={accent}
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace(isNew ? '/mine' : { pathname: '/survey/[id]', params: { id } })
        }
      />

      {locked ? (
        <StickyNote color="mint" style={styles.notice}>
          <Text variant="small" tone="soft">
            This survey is {survey?.status === 'closed' ? 'closed' : 'open'}, so its questions are
            frozen. Changing the title, the description, the colour or who it is aimed at is still
            fine.
          </Text>
        </StickyNote>
      ) : null}

      <Card tape={0} tiltDeg={-0.3}>
        <Field
          label="title"
          value={title}
          onChangeText={setTitle}
          placeholder="How do you actually study?"
          maxLength={120}
          hint="this is the first thing people see"
        />
        <Field
          label="a line about it (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="An honest look at study habits. No judgement, promise."
          multiline
          numberOfLines={3}
          maxLength={600}
        />

        <Text variant="tiny" tone="soft" style={styles.accentLabel}>
          pick a highlighter colour
        </Text>
        <View style={styles.accentRow}>
          {HIGHLIGHTERS.map((name) => {
            const active = name === accent
            return (
              <Pressable
                key={name}
                onPress={() => setAccent(name)}
                accessibilityLabel={`${name} highlighter`}
                style={({ pressed }) => [
                  styles.swatch,
                  { backgroundColor: highlighter[name].solid },
                  active ? styles.swatchOn : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {active ? (
                  <Text variant="small" tone="ink">
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </Card>

      <Title variant="h2" mark="sky" tiltDeg={-0.5} style={styles.sectionTitle}>
        who should see it
      </Title>
      <Text variant="small" tone="soft" style={styles.sectionNote}>
        Everyone sees an open survey. Narrowed surveys only turn up in the feed of people who match
        every rule below.
      </Text>

      <Card tape={2} tiltDeg={0.35}>
        <Segmented
          options={[
            { value: 'everyone' as Audience, label: 'everyone' },
            { value: 'matching' as Audience, label: 'only people who match' },
          ]}
          value={audience}
          onChange={setAudience}
          color="mint"
        />

        {audience === 'matching' ? (
          <View style={styles.targeting}>
            <View style={styles.pair}>
              <Field
                label="youngest"
                value={minAge}
                onChangeText={setMinAge}
                placeholder="18"
                keyboardType="number-pad"
                style={styles.pairItem}
              />
              <Field
                label="oldest"
                value={maxAge}
                onChangeText={setMaxAge}
                placeholder="30"
                keyboardType="number-pad"
                style={styles.pairItem}
              />
            </View>

            <Field
              label="cities"
              value={citiesText}
              onChangeText={setCitiesText}
              placeholder="Kochi, Bengaluru"
              hint="separate with commas"
            />
            {cityList.length > 0 ? (
              <View style={styles.chips}>
                {cityList.map((city) => (
                  <Chip key={city} label={city} active color="sky" />
                ))}
              </View>
            ) : null}

            <Field
              label="interests"
              value={interestsText}
              onChangeText={setInterestsText}
              placeholder="music, art"
              hint="at least one of these has to appear on their profile"
            />
            {interestList.length > 0 ? (
              <View style={styles.chips}>
                {interestList.map((interest) => (
                  <Chip key={interest} label={interest} active color="lilac" />
                ))}
              </View>
            ) : null}

            <StickyNote color="yellow" tiltDeg={-0.5}>
              <Text variant="small" tone="soft">
                Leave a field blank to skip that rule. The share link always works, whatever you
                choose here — this only decides who finds it on their own.
              </Text>
            </StickyNote>
          </View>
        ) : null}
      </Card>

      <Rule />

      <View style={styles.questionsHead}>
        <Title variant="h2" mark="yellow" tiltDeg={-0.6}>
          the questions
        </Title>
        <Text variant="small" tone="soft">
          {questions.length === 0
            ? 'no questions yet'
            : `${questions.length} so far${locked ? ' · locked' : ''}`}
        </Text>
      </View>

      {locked ? (
        survey?.questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            number={index + 1}
            value={undefined}
            onChange={() => undefined}
            disabled
          />
        ))
      ) : (
        <>
          {questions.length === 0 ? (
            <StickyNote color="sky" style={styles.emptyHint}>
              <Text variant="small" tone="soft">
                Pick a kind of question below to write your first one. You can reorder them later
                with the arrows.
              </Text>
            </StickyNote>
          ) : null}

          {questions.map((question, index) => (
            <QuestionEditor
              key={question.key}
              question={question}
              index={index}
              total={questions.length}
              onChange={patchQuestion}
              onMove={(direction) => moveQuestion(index, direction)}
              onRemove={() => removeQuestion(question.key)}
            />
          ))}

          <Card tape={4} tiltDeg={-0.3} style={styles.addCard}>
            <Text variant="tiny" tone="soft" style={styles.addLabel}>
              add a question
            </Text>
            <View style={styles.addRow}>
              {TYPE_CHOICES.map((choice) => (
                <Pressable
                  key={choice.type}
                  onPress={() => setQuestions((current) => [...current, newQuestion(choice.type)])}
                  disabled={questions.length >= 60}
                  style={({ pressed }) => [styles.addChip, pressed ? styles.pressed : null]}
                >
                  <Text variant="small" tone="accent">
                    {choice.glyph}
                  </Text>
                  <Text variant="small" tone="ink">
                    {choice.type === 'short_text'
                      ? 'short answer'
                      : choice.type === 'long_text'
                        ? 'long answer'
                        : choice.type === 'single_choice'
                          ? 'pick one'
                          : choice.type === 'multi_choice'
                            ? 'pick any'
                            : choice.type === 'rating'
                              ? 'star rating'
                              : 'scale'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      )}

      {error ? <ErrorNote message={error} style={styles.error} /> : null}

      <View style={styles.actions}>
        {locked ? (
          <Button
            label="save the changes"
            loading={busy === 'save'}
            onPress={() => save('save')}
            fullWidth
          />
        ) : (
          <>
            <Button
              label="save as a draft"
              variant="secondary"
              loading={busy === 'save'}
              onPress={() => save('save')}
              fullWidth
            />
            <Button
              label={isNew ? 'save and publish' : 'save and publish it'}
              trailing="→"
              loading={busy === 'publish'}
              onPress={() => save('publish')}
              fullWidth
              tiltDeg={-0.3}
            />
          </>
        )}
      </View>

      <Text variant="tiny" tone="faint" align="center" style={styles.footerNote}>
        {locked
          ? 'the questions stay as they were when it went live'
          : 'publishing freezes the questions and starts the share link working'}
      </Text>
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  notice: {
    marginBottom: space.lg,
  },
  accentLabel: {
    marginTop: space.md,
    marginBottom: space.sm,
  },
  accentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  swatch: {
    width: 46,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 52, 68, 0.08)',
  },
  swatchOn: {
    borderColor: palette.ink,
  },
  sectionTitle: {
    marginTop: space.xl,
  },
  sectionNote: {
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  targeting: {
    marginTop: space.lg,
    gap: space.md,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  pairItem: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  questionsHead: {
    marginBottom: space.lg,
    gap: space.xs,
  },
  emptyHint: {
    marginBottom: space.lg,
  },
  addCard: {
    marginBottom: space.lg,
  },
  addLabel: {
    marginBottom: space.sm,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 7,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 105, 142, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  error: {
    marginBottom: space.lg,
  },
  actions: {
    gap: space.md,
  },
  footerNote: {
    marginTop: space.lg,
    marginBottom: space.xl,
  },
  pressed: {
    opacity: 0.75,
  },
})
