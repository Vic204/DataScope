import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Average, Bars, Columns, Donut, Legend, Stars } from '@/components/charts'
import { Button } from '@/components/controls'
import { Card, Doodle, PaperScreen, Rule } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { EmptyNote, ErrorNote, PageLoader } from '@/components/states'
import { Text, Title } from '@/components/text'
import { api, type QuestionSummary } from '@/lib/api'
import { formatDate, plural, relativeTime, responseLabel, surveyStatusLabel } from '@/lib/format'
import { useAsync } from '@/lib/use-async'
import { HIGHLIGHTERS, highlighter, layout, palette, space } from '@/theme/tokens'

/** The highlighter colours double as the chart series, so everything matches. */
const SERIES = HIGHLIGHTERS.map((name) => highlighter[name].solid)

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data, error, refreshing, refresh, reload } = useAsync(() => api.surveys.results(id), [id])

  const survey = data?.survey
  const results = data?.results

  if (!survey || !results) {
    return (
      <PaperScreen scroll={false}>
        {error ? (
          <View style={styles.errorWrap}>
            <ScreenHeader title="no results" mark="pink" onBack={() => router.replace('/mine')} />
            <ErrorNote message={error} onRetry={reload} />
          </View>
        ) : (
          <PageLoader caption="counting them up…" />
        )}
      </PaperScreen>
    )
  }

  const timeline = results.timeline.map((entry) => ({
    label: entry.date.slice(5),
    value: entry.count,
  }))

  return (
    <PaperScreen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        title={survey.title}
        subtitle={`${responseLabel(results.totalResponses)} · ${surveyStatusLabel(survey.status)}`}
        mark={survey.accent}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/mine'))}
      />

      {results.totalResponses === 0 ? (
        <>
          <EmptyNote
            doodle="✎"
            title="no answers yet"
            body="Nothing to count until somebody fills it in. Share the link and this page will start filling up."
          />
          <Button
            label="share the link"
            leading="↗"
            onPress={() => router.push({ pathname: '/survey/[id]', params: { id: survey.id } })}
            fullWidth
          />
        </>
      ) : (
        <>
          <Card tape={0} tiltDeg={-0.3}>
            <View style={styles.overview}>
              <Stat value={String(results.totalResponses)} label="responses" />
              <Stat
                value={results.lastResponseAt ? relativeTime(results.lastResponseAt) : '—'}
                label="latest"
                small
              />
              <Stat value={results.firstResponseAt ? formatDate(results.firstResponseAt) : '—'} label="first" small />
            </View>
          </Card>

          <Card tape={2} tiltDeg={0.4} style={styles.timelineCard}>
            <Title variant="h3" mark="sky" tiltDeg={-0.4}>
              when they came in
            </Title>
            <View style={styles.timelineBody}>
              <Columns data={timeline} height={88} />
            </View>
            <Text variant="tiny" tone="faint">
              the last 14 days, today on the right
            </Text>
          </Card>

          <Rule />

          {results.summary.map((summary, index) => (
            <SummaryCard key={summary.questionId} summary={summary} index={index} />
          ))}

          <Rule />

          <View style={styles.footer}>
            <Text variant="small" tone="soft" align="center">
              more answers make these charts steadier.
            </Text>
            <Button
              label="share it again"
              variant="secondary"
              leading="↗"
              onPress={() => router.push({ pathname: '/survey/[id]', params: { id: survey.id } })}
            />
          </View>
        </>
      )}
    </PaperScreen>
  )
}

function SummaryCard({ summary, index }: { summary: QuestionSummary; index: number }) {
  return (
    <View style={styles.summaryWrap}>
      <View style={styles.summaryHead}>
        <Doodle size={20} color={palette.accent} tiltDeg={-6}>
          {index + 1}
        </Doodle>
        <Text variant="h3" tone="ink" style={styles.summaryLabel}>
          {summary.label}
        </Text>
      </View>

      <Card tape={index % 5} tiltDeg={index % 2 === 0 ? -0.3 : 0.3}>
        <Body summary={summary} />
        <Text variant="tiny" tone="faint" style={styles.answeredNote}>
          {summary.answered === 0
            ? 'nobody answered this one'
            : `${plural(summary.answered, 'person')} answered this`}
        </Text>
      </Card>
    </View>
  )
}

function Body({ summary }: { summary: QuestionSummary }) {
  switch (summary.type) {
    case 'short_text':
    case 'long_text':
      return <TextAnswers summary={summary} />

    case 'single_choice': {
      const slices = summary.options
        .filter((option) => option.count > 0)
        .map((option, index) => ({
          label: option.label,
          value: option.count,
          percent: option.percent,
          color: SERIES[index % SERIES.length] as string,
        }))

      return (
        <View style={styles.choiceRow}>
          <Donut
            data={slices.map((slice) => ({
              label: slice.label,
              value: slice.value,
              color: slice.color,
            }))}
            centerLabel={String(summary.answered)}
            centerSub="answers"
          />
          <Legend items={slices} />
        </View>
      )
    }

    case 'multi_choice':
      return (
        <>
          <Bars
            data={summary.options.map((option) => ({
              label: option.label,
              count: option.count,
              percent: option.percent,
            }))}
            color="mint"
          />
          <Text variant="tiny" tone="faint" style={styles.chartNote}>
            percentages are of the {summary.options.reduce((total, option) => total + option.count, 0)}{' '}
            boxes ticked, so they add up past 100%
          </Text>
        </>
      )

    case 'rating':
    case 'scale':
      return (
        <View>
          <View style={styles.numericHead}>
            <Average
              value={summary.average}
              max={summary.max}
              caption={summary.type === 'rating' ? 'average stars' : 'average'}
            />
            {summary.type === 'rating' ? (
              <Stars value={summary.average ?? 0} max={summary.max} size={28} />
            ) : null}
          </View>
          <View style={styles.distribution}>
            <Bars
              data={summary.distribution.map((bucket) => ({
                label: `${bucket.value}`,
                count: bucket.count,
                percent: 0,
              }))}
              color="lilac"
              showPercent={false}
            />
          </View>
        </View>
      )

    default:
      return null
  }
}

function TextAnswers({
  summary,
}: {
  summary: Extract<QuestionSummary, { type: 'short_text' | 'long_text' }>
}) {
  if (summary.texts.length === 0) {
    return (
      <Text variant="small" tone="faint">
        nothing written down yet.
      </Text>
    )
  }

  return (
    <View style={styles.quotes}>
      {summary.texts.map((entry, index) => (
        <View key={`${entry.submittedAt}-${index}`} style={styles.quote}>
          <Text variant="h3" tone="accent" style={styles.quoteMark}>
            “
          </Text>
          <View style={styles.quoteBody}>
            <Text variant="body" tone="ink">
              {entry.value}
            </Text>
            <Text variant="tiny" tone="faint">
              {relativeTime(entry.submittedAt)}
            </Text>
          </View>
        </View>
      ))}
      {summary.truncated ? (
        <Text variant="tiny" tone="faint">
          showing the {summary.texts.length} most recent
        </Text>
      ) : null}
    </View>
  )
}

function Stat({ value, label, small = false }: { value: string; label: string; small?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text variant={small ? 'h3' : 'h1'} tone="accent" align="center">
        {value}
      </Text>
      <Text variant="tiny" tone="soft" align="center">
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  errorWrap: {
    paddingHorizontal: layout.gutter,
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  timelineCard: {
    marginTop: space.lg,
  },
  timelineBody: {
    marginTop: space.md,
    marginBottom: space.sm,
  },
  summaryWrap: {
    marginBottom: space.md,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
    marginTop: space.lg,
  },
  summaryLabel: {
    flex: 1,
  },
  answeredNote: {
    marginTop: space.md,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    flexWrap: 'wrap',
  },
  chartNote: {
    marginTop: space.md,
  },
  numericHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    flexWrap: 'wrap',
    marginBottom: space.lg,
  },
  distribution: {
    marginTop: space.xs,
  },
  quotes: {
    gap: space.lg,
  },
  quote: {
    flexDirection: 'row',
    gap: space.sm,
  },
  quoteMark: {
    marginTop: -4,
  },
  quoteBody: {
    flex: 1,
    gap: 2,
  },
  footer: {
    gap: space.md,
    marginBottom: space.xl,
  },
})
