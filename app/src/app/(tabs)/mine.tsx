import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/controls'
import { FadeIn } from '@/components/motion'
import { Doodle, PaperScreen, Rule } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { EmptyNote, ErrorNote, Loading } from '@/components/states'
import { SurveyCard } from '@/components/survey-card'
import { Text } from '@/components/text'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/use-async'
import { relativeTime, surveyStatusLabel } from '@/lib/format'
import { space } from '@/theme/tokens'

/** Everything this user has written, in any state. */
export default function MineScreen() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh, reload } = useAsync(() => api.surveys.list(), [])

  const surveys = data?.surveys ?? []
  const drafts = surveys.filter((survey) => survey.status === 'draft').length
  const collected = surveys.reduce((total, survey) => total + (survey.responseCount ?? 0), 0)

  return (
    <PaperScreen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        title="mine"
        subtitle="the pages you wrote"
        mark="pink"
        onBack={false}
        right={<Doodle size={22} tiltDeg={-7}>✎</Doodle>}
      />

      <View style={styles.summary}>
        <Text variant="body" tone="soft">
          {surveys.length === 0
            ? 'your notebook is empty so far.'
            : `${surveys.length} survey${surveys.length === 1 ? '' : 's'} · ${drafts} still a draft · ${collected} response${collected === 1 ? '' : 's'} collected`}
        </Text>
      </View>

      <Button
        label="new survey"
        leading="✎"
        onPress={() => router.push({ pathname: '/builder/[id]', params: { id: 'new' } })}
        fullWidth
        tiltDeg={-0.3}
        style={styles.newButton}
      />

      {loading ? (
        <Loading caption="finding your pages…" />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} style={styles.error} />
      ) : surveys.length === 0 ? (
        <EmptyNote
          doodle="✎"
          title="nothing written yet"
          body="A survey can be one question long. Start with something you are actually curious about."
        />
      ) : (
        <>
          <Rule />
          {surveys.map((survey, index) => (
            <FadeIn key={survey.id} delay={index * 55}>
              <SurveyCard
                survey={survey}
                index={index}
                meta={`${surveyStatusLabel(survey.status)} · written ${relativeTime(survey.createdAt)}${
                  survey.lastResponseAt ? ` · last answer ${relativeTime(survey.lastResponseAt)}` : ''
                }`}
                actionLabel={survey.status === 'draft' ? 'keep writing' : 'share & results'}
                onPress={() => router.push({ pathname: '/survey/[id]', params: { id: survey.id } })}
              />
            </FadeIn>
          ))}
        </>
      )}
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: space.lg,
  },
  newButton: {
    marginBottom: space.xl,
  },
  error: {
    marginTop: space.lg,
  },
})
