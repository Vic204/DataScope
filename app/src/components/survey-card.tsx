import { StyleSheet, View } from 'react-native'

import { Card } from '@/components/paper'
import { Text } from '@/components/text'
import type { Survey } from '@/lib/api'
import { clamp, relativeTime, responseLabel } from '@/lib/format'
import { highlighter, palette, space, tapeColors } from '@/theme/tokens'
import type { ReactNode } from 'react'

/**
 * One survey, as it appears in a list. Used by the feed, "mine" and "answered"
 * so a survey looks the same everywhere it shows up.
 */
export function SurveyCard({
  survey,
  index = 0,
  meta,
  actionLabel = 'answer this',
  onPress,
}: {
  survey: Pick<Survey, 'title' | 'description' | 'accent' | 'questions' | 'ownerName' | 'responseCount'>
  index?: number
  /** A line of context, e.g. when it was answered. */
  meta?: string
  actionLabel?: string
  onPress: () => void
}) {
  const accent = highlighter[survey.accent] ?? highlighter.yellow

  return (
    <Card
      onPress={onPress}
      tape={index % tapeColors.length}
      tiltDeg={index % 2 === 0 ? -0.35 : 0.35}
      accent={accent.solid}
      style={styles.card}
    >
      <Text variant="h3" tone="ink">
        {survey.title}
      </Text>

      {survey.description ? (
        <Text variant="small" tone="soft" style={styles.description}>
          {clamp(survey.description, 130)}
        </Text>
      ) : null}

      <View style={styles.tags}>
        <Tag>{`${survey.questions.length} ${survey.questions.length === 1 ? 'question' : 'questions'}`}</Tag>
        <Tag>{responseLabel(survey.responseCount)}</Tag>
        {survey.ownerName ? <Tag>by {survey.ownerName}</Tag> : null}
      </View>

      {meta ? (
        <Text variant="tiny" tone="faint" style={styles.meta}>
          {meta}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text variant="small" tone="accent">
          {actionLabel}
        </Text>
        <Text variant="small" tone="accent">
          →
        </Text>
      </View>
    </Card>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <View style={styles.tag}>
      <Text variant="tiny" tone="soft">
        {children}
      </Text>
    </View>
  )
}

/** A tiny "3 days ago" style line for a card footer. */
export function sinceLabel(iso: string | null | undefined): string {
  return relativeTime(iso)
}

const styles = StyleSheet.create({
  card: {
    marginBottom: space.lg,
  },
  description: {
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 52, 68, 0.06)',
  },
  meta: {
    marginTop: space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.md,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: 'rgba(59, 52, 68, 0.12)',
    paddingTop: space.sm,
  },
})

export { palette }
