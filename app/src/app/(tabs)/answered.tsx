import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Card, Doodle, PaperScreen, Rule } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { EmptyNote, ErrorNote, Loading } from '@/components/states'
import { Text } from '@/components/text'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/use-async'
import { relativeTime, surveyStatusLabel } from '@/lib/format'
import { space, tapeColors } from '@/theme/tokens'

/** A record of everything this user has answered. */
export default function AnsweredScreen() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh, reload } = useAsync(() => api.feed.answered(), [])

  const responses = data?.responses ?? []

  return (
    <PaperScreen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        title="answered"
        subtitle="what you filled in for other people"
        mark="mint"
        onBack={false}
        right={<Doodle size={22} tiltDeg={6}>✓</Doodle>}
      />

      {loading ? (
        <Loading caption="checking your answers…" />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} style={styles.error} />
      ) : responses.length === 0 ? (
        <EmptyNote
          doodle="✓"
          title="you have not answered anything yet"
          body="Surveys that match your profile appear on the discover page."
          action={null}
        />
      ) : (
        <>
          <Text variant="body" tone="soft" style={styles.summary}>
            {responses.length} filled in. Thank you for helping people out.
          </Text>
          <Rule />
          {responses.map((entry, index) => (
            <Card
              key={entry.id}
              tape={index % tapeColors.length}
              tiltDeg={index % 2 === 0 ? 0.3 : -0.3}
              onPress={() =>
                router.push({ pathname: '/s/[slug]', params: { slug: entry.survey.slug } })
              }
              style={styles.card}
            >
              <Text variant="h3" tone="ink">
                {entry.survey.title}
              </Text>
              <View style={styles.meta}>
                <Text variant="tiny" tone="soft">
                  {surveyStatusLabel(entry.survey.status)}
                </Text>
                <Text variant="tiny" tone="faint">
                  ·
                </Text>
                <Text variant="tiny" tone="soft">
                  {entry.answerCount} answer{entry.answerCount === 1 ? '' : 's'}
                </Text>
                <Text variant="tiny" tone="faint">
                  ·
                </Text>
                <Text variant="tiny" tone="soft">
                  filled in {relativeTime(entry.submittedAt)}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: space.md,
  },
  card: {
    marginBottom: space.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
    flexWrap: 'wrap',
  },
  error: {
    marginTop: space.lg,
  },
})
