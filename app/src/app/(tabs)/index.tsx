import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Field, StickyNote } from '@/components/controls'
import { FadeIn } from '@/components/motion'
import { Doodle, PaperScreen, Rule } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { EmptyNote, ErrorNote, Loading } from '@/components/states'
import { SurveyCard } from '@/components/survey-card'
import { Text, Title } from '@/components/text'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useAsync } from '@/lib/use-async'
import { space } from '@/theme/tokens'

/** The feed: surveys written by other people that this profile qualifies for. */
export default function DiscoverScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data, error, loading, refreshing, refresh, reload } = useAsync(() => api.feed.list(), [])

  // Memoised so the filtered list below is not rebuilt on every keystroke-less
  // render just because `?? []` handed it a fresh array.
  const all = useMemo(() => data?.surveys ?? [], [data])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return all
    return all.filter((survey) =>
      `${survey.title} ${survey.description} ${survey.ownerName ?? ''}`.toLowerCase().includes(needle),
    )
  }, [all, search])

  const profile = user?.profile
  const profileEmpty =
    !profile?.age && !profile?.city && (profile?.interests?.length ?? 0) === 0

  return (
    <PaperScreen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        title="discover"
        subtitle="surveys that fit the profile you wrote down"
        mark="yellow"
        onBack={false}
        right={<Doodle size={22} tiltDeg={8}>✦</Doodle>}
      />

      <View style={styles.dearDiary}>
        <Title variant="h3" tone="accent" tiltDeg={-1.4}>
          dear diary,
        </Title>
        <Text variant="body">
          today {all.length === 0 ? 'nobody is asking anything yet' : `people are asking ${all.length} thing${all.length === 1 ? '' : 's'}`}.
        </Text>
      </View>

      {profileEmpty ? (
        <StickyNote color="lilac" style={styles.notice}>
          <Text variant="small" tone="soft">
            your profile is still blank, so surveys written for a particular age, city or interest
            cannot find you.
          </Text>
          <Button
            label="fill in my profile"
            size="sm"
            variant="secondary"
            onPress={() => router.replace('/profile')}
            style={styles.noticeButton}
          />
        </StickyNote>
      ) : null}

      {all.length > 0 ? (
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="search titles and people…"
          autoCapitalize="none"
          style={styles.search}
        />
      ) : null}

      {loading ? (
        <Loading caption="looking through the pages…" />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} style={styles.error} />
      ) : visible.length === 0 ? (
        <EmptyNote
          doodle={search ? '?' : '✧'}
          title={search ? 'nothing by that name' : 'no surveys match you yet'}
          body={
            search
              ? 'Try a different word, or clear the search.'
              : profileEmpty
                ? 'Fill in your profile, or write the first survey yourself.'
                : 'Nobody has written anything for your profile yet. You could be first.'
          }
          action={
            <Button
              label="write a survey"
              leading="✎"
              size="sm"
              onPress={() => router.push({ pathname: '/builder/[id]', params: { id: 'new' } })}
            />
          }
        />
      ) : (
        <>
          <Rule />
          {visible.map((survey, index) => (
            <FadeIn key={survey.id} delay={index * 55}>
              <SurveyCard
                survey={survey}
                index={index}
                onPress={() => router.push({ pathname: '/s/[slug]', params: { slug: survey.slug } })}
              />
            </FadeIn>
          ))}
          <Text variant="tiny" tone="faint" align="center" style={styles.footnote}>
            only surveys you have not answered yet appear here
          </Text>
        </>
      )}
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  dearDiary: {
    marginBottom: space.lg,
    gap: 2,
  },
  notice: {
    marginBottom: space.lg,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    marginTop: space.md,
  },
  search: {
    marginBottom: space.md,
  },
  error: {
    marginTop: space.lg,
  },
  footnote: {
    marginTop: space.sm,
    marginBottom: space.lg,
  },
})
