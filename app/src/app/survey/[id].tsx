import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, Share, StyleSheet, View } from 'react-native'

import { Button, Chip, StickyNote } from '@/components/controls'
import { Card, KeyValue, PaperScreen, Rule } from '@/components/paper'
import { QuestionField } from '@/components/questions'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote, PageLoader } from '@/components/states'
import { Text, Title } from '@/components/text'
import { api, errorMessage, type Targeting } from '@/lib/api'
import { formatDate, plural, relativeTime, surveyStatusLabel } from '@/lib/format'
import { useAsync } from '@/lib/use-async'
import { layout, space } from '@/theme/tokens'

/**
 * The owner's view of one survey: the link, the state, and the three things
 * worth doing next (publish, read the results, or edit while it is still a
 * draft).
 */
export default function ManageSurveyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data, error, reload } = useAsync(() => api.surveys.get(id), [id])

  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const survey = data?.survey

  if (!survey) {
    return (
      <PaperScreen scroll={false}>
        {error ? (
          <View style={styles.errorWrap}>
            <ScreenHeader title="not found" mark="pink" onBack={() => router.replace('/mine')} />
            <ErrorNote message={error} onRetry={reload} />
          </View>
        ) : (
          <PageLoader caption="finding that page…" />
        )}
      </PaperScreen>
    )
  }

  const shareUrl = `${webOrigin()}/s/${survey.slug}`
  const isDraft = survey.status === 'draft'
  const isPublished = survey.status === 'published'

  async function run(action: string, work: () => Promise<unknown>) {
    setBusy(action)
    setActionError(null)
    try {
      await work()
      await reload()
    } catch (problem) {
      setActionError(errorMessage(problem))
    } finally {
      setBusy(null)
    }
  }

  const share = async () => {
    try {
      if (Platform.OS === 'web') {
        const clipboard = (
          globalThis as {
            navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } }
          }
        ).navigator?.clipboard
        await clipboard?.writeText?.(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      } else {
        await Share.share({ message: `${survey.title} — ${shareUrl}`, url: shareUrl })
      }
    } catch {
      // Sharing was cancelled or the clipboard was blocked; nothing to report.
    }
  }

  return (
    <PaperScreen>
      <ScreenHeader
        title={survey.title}
        subtitle={`${surveyStatusLabel(survey.status)} · ${plural(survey.responseCount ?? 0, 'response')}`}
        mark={survey.accent}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/mine'))}
      />

      {actionError ? <ErrorNote message={actionError} style={styles.error} /> : null}

      {isDraft ? (
        <StickyNote color="yellow" style={styles.notice}>
          <Text variant="small" tone="soft">
            This is still a draft. Only you can see it, and the questions can still be changed.
            Publish when you are happy with them — after that they are locked so the results stay
            trustworthy.
          </Text>
        </StickyNote>
      ) : (
        <StickyNote color="mint" style={styles.notice}>
          <Text variant="small" tone="soft">
            The questions are locked now that answers are coming in. You can still change the title,
            the description, its colour and who it is aimed at.
          </Text>
        </StickyNote>
      )}

      <Card tape={1} tiltDeg={-0.35}>
        <KeyValue label="link">
          <Text variant="small" tone="soft" numberOfLines={1}>
            {shareUrl}
          </Text>
        </KeyValue>

        <View style={styles.shareRow}>
          <Button
            label={copied ? 'copied!' : Platform.OS === 'web' ? 'copy link' : 'share link'}
            size="sm"
            variant={copied ? 'secondary' : 'primary'}
            leading={copied ? '✓' : '↗'}
            onPress={share}
            disabled={!isPublished}
          />
          <Button
            label="open it"
            size="sm"
            variant="ghost"
            onPress={() => router.push({ pathname: '/s/[slug]', params: { slug: survey.slug } })}
          />
        </View>

        {!isPublished ? (
          <Text variant="tiny" tone="faint" style={styles.shareHint}>
            the link starts working once the survey is published
          </Text>
        ) : null}

        <Rule />

        <KeyValue label="questions">
          <Text variant="body" tone="soft">
            {plural(survey.questions.length, 'question')}
          </Text>
        </KeyValue>

        <View style={styles.spacer} />

        <KeyValue label="written">
          <Text variant="body" tone="soft">
            {formatDate(survey.createdAt)}
            {survey.publishedAt ? ` · opened ${relativeTime(survey.publishedAt)}` : ''}
          </Text>
        </KeyValue>

        <View style={styles.spacer} />

        <KeyValue label="aimed at">
          <TargetingSummary targeting={survey.targeting} />
        </KeyValue>
      </Card>

      <Title variant="h2" mark="sky" tiltDeg={-0.5} style={styles.sectionTitle}>
        what next
      </Title>

      <View style={styles.actions}>
        {isDraft ? (
          <>
            <Button
              label="edit the questions"
              leading="✎"
              variant="secondary"
              fullWidth
              onPress={() => router.push({ pathname: '/builder/[id]', params: { id: survey.id } })}
            />
            <Button
              label="publish it"
              trailing="→"
              fullWidth
              loading={busy === 'publish'}
              onPress={() => run('publish', () => api.surveys.publish(id))}
            />
          </>
        ) : (
          <>
            <Button
              label="read the results"
              trailing="→"
              fullWidth
              onPress={() => router.push({ pathname: '/results/[id]', params: { id: survey.id } })}
            />
            <Button
              label="edit the details"
              leading="✎"
              variant="secondary"
              fullWidth
              onPress={() => router.push({ pathname: '/builder/[id]', params: { id: survey.id } })}
            />
            {isPublished ? (
              <Button
                label="stop collecting answers"
                variant="secondary"
                fullWidth
                loading={busy === 'close'}
                onPress={() => run('close', () => api.surveys.close(id))}
              />
            ) : null}
          </>
        )}
      </View>

      <Rule />

      <Title variant="h3" mark="lilac" tiltDeg={-0.6} style={styles.previewTitle}>
        the questions, as they were written
      </Title>

      {survey.questions.length === 0 ? (
        <Text variant="small" tone="faint">
          no questions yet.
        </Text>
      ) : (
        survey.questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            number={index + 1}
            value={undefined}
            onChange={() => undefined}
            disabled
          />
        ))
      )}

      <Rule />

      <View style={styles.danger}>
        {confirmDelete ? (
          <>
            <Text variant="body" tone="bad">
              Delete “{survey.title}” and every answer it collected? This cannot be undone.
            </Text>
            <View style={styles.dangerButtons}>
              <Button
                label="yes, delete it"
                variant="danger"
                size="sm"
                loading={busy === 'delete'}
                onPress={async () => {
                  setBusy('delete')
                  setActionError(null)
                  try {
                    await api.surveys.remove(id)
                    router.replace('/mine')
                  } catch (problem) {
                    setActionError(errorMessage(problem))
                    setConfirmDelete(false)
                  } finally {
                    setBusy(null)
                  }
                }}
              />
              <Button
                label="no, keep it"
                variant="ghost"
                size="sm"
                onPress={() => setConfirmDelete(false)}
              />
            </View>
          </>
        ) : (
          <Button
            label="delete this survey"
            variant="ghost"
            size="sm"
            onPress={() => setConfirmDelete(true)}
          />
        )}
      </View>
    </PaperScreen>
  )
}

function TargetingSummary({ targeting }: { targeting: Targeting }) {
  if (targeting.audience !== 'matching') {
    return (
      <Text variant="body" tone="soft">
        everyone
      </Text>
    )
  }

  const chips: string[] = []
  if (targeting.minAge != null || targeting.maxAge != null) {
    chips.push(
      `age ${targeting.minAge ?? '…'}–${targeting.maxAge ?? '…'}`,
    )
  }
  if (targeting.cities.length > 0) chips.push(targeting.cities.join(', '))
  if (targeting.interests.length > 0) chips.push(targeting.interests.join(', '))

  if (chips.length === 0) {
    return (
      <Text variant="body" tone="soft">
        everyone (nothing narrowed down yet)
      </Text>
    )
  }

  return (
    <View style={styles.chips}>
      {chips.map((chip) => (
        <Chip key={chip} label={chip} active color="lilac" />
      ))}
    </View>
  )
}

/** The browser origin, without pulling the DOM type library into the app. */
function webOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL
  if (configured) return configured.replace(/\/+$/, '')
  if (Platform.OS !== 'web') return ''
  const location = (globalThis as { location?: { origin?: string } }).location
  return location?.origin ?? ''
}

const styles = StyleSheet.create({
  errorWrap: {
    paddingHorizontal: layout.gutter,
  },
  error: {
    marginBottom: space.lg,
  },
  notice: {
    marginBottom: space.lg,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
  },
  shareHint: {
    marginTop: space.sm,
  },
  spacer: {
    height: space.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  sectionTitle: {
    marginTop: space.xl,
  },
  actions: {
    gap: space.md,
  },
  previewTitle: {
    marginTop: space.sm,
  },
  danger: {
    gap: space.md,
  },
  dangerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
})
