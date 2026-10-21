import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Chip, Field, StickyNote } from '@/components/controls'
import { Card, KeyValue, PaperScreen, Rule } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote } from '@/components/states'
import { Text, Title } from '@/components/text'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, joinList, splitList } from '@/lib/format'
import { space } from '@/theme/tokens'

/**
 * The profile page.
 *
 * It is not just settings: age, city and interests are exactly the fields the
 * matching rules read, so this page is also how a user unlocks more surveys in
 * the feed.
 */
export default function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth()
  const router = useRouter()

  // This screen only renders once the session is ready, so the server copy of
  // the profile is already here: seed the fields from it rather than syncing
  // them in an effect after the first paint.
  const [name, setName] = useState(user?.name ?? '')
  const [age, setAge] = useState(user?.profile?.age ? String(user.profile.age) : '')
  const [city, setCity] = useState(user?.profile?.city ?? '')
  const [occupation, setOccupation] = useState(user?.profile?.occupation ?? '')
  const [interests, setInterests] = useState(joinList(user?.profile?.interests))

  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const interestList = splitList(interests)

  async function save() {
    const parsedAge = age.trim() ? Number(age.trim()) : null

    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 10 || parsedAge > 120)) {
      setError('Age should be a whole number between 10 and 120.')
      return
    }
    if (name.trim().length < 2) {
      setError('A name of at least two letters, please.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await updateProfile({
        name: name.trim(),
        profile: {
          age: parsedAge,
          city: city.trim() || null,
          occupation: occupation.trim() || null,
          interests: interestList,
        },
      })
      setNotice('saved. your feed has been re-read.')
    } catch (problem) {
      setError(errorMessage(problem))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PaperScreen>
      <ScreenHeader
        title="me"
        subtitle="who is holding the pen"
        mark="lilac"
        lead="♡"
        onBack={false}
      />

      <Card tape={0} tiltDeg={-0.35}>
        <Field label="name" value={name} onChangeText={setName} placeholder="Your name" />

        <KeyValue label="email">
          <Text variant="body" tone="soft">
            {user?.email ?? '—'}
          </Text>
        </KeyValue>

        <View style={styles.spacer} />

        <KeyValue label="joined">
          <Text variant="body" tone="soft">
            {user ? formatDate(user.createdAt) : '—'}
          </Text>
        </KeyValue>
      </Card>

      <Title variant="h2" mark="sky" tiltDeg={-0.5} style={styles.sectionTitle}>
        the part that matters
      </Title>

      <Text variant="small" tone="soft" style={styles.sectionNote}>
        Surveys can be aimed at an age range, a city, or an interest. Anything you leave blank simply
        cannot be matched.
      </Text>

      <Card tape={2} tiltDeg={0.4}>
        <View style={styles.pair}>
          <Field
            label="age"
            value={age}
            onChangeText={setAge}
            placeholder="22"
            keyboardType="number-pad"
            style={styles.pairItem}
          />
          <Field
            label="city"
            value={city}
            onChangeText={setCity}
            placeholder="Kochi"
            autoCapitalize="words"
            style={styles.pairItem}
          />
        </View>

        <Field
          label="occupation"
          value={occupation}
          onChangeText={setOccupation}
          placeholder="MCA student"
        />

        <Field
          label="interests"
          value={interests}
          onChangeText={setInterests}
          placeholder="music, cricket, design"
          hint="separate with commas"
        />

        {interestList.length > 0 ? (
          <View style={styles.chips}>
            {interestList.map((interest) => (
              <Chip
                key={interest}
                label={interest}
                color="mint"
                onRemove={() =>
                  setInterests(joinList(interestList.filter((entry) => entry !== interest)))
                }
              />
            ))}
          </View>
        ) : (
          <StickyNote color="yellow" tiltDeg={-0.5}>
            <Text variant="small" tone="soft">
              no interests yet — these are the quickest way to make surveys find you.
            </Text>
          </StickyNote>
        )}
      </Card>

      {error ? <ErrorNote message={error} style={styles.feedback} /> : null}

      {notice ? (
        <View style={styles.saved}>
          <Text variant="body" tone="good">
            ✓ {notice}
          </Text>
        </View>
      ) : null}

      <Button label="save my profile" onPress={save} loading={saving} fullWidth style={styles.save} />

      <Rule />

      <View style={styles.signOut}>
        <Text variant="small" tone="faint">
          done for today?
        </Text>
        <Button
          label="sign out"
          variant="ghost"
          size="sm"
          onPress={async () => {
            await signOut()
            router.replace('/welcome')
          }}
        />
      </View>
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  spacer: {
    height: space.md,
  },
  sectionTitle: {
    marginTop: space.xl,
  },
  sectionNote: {
    marginTop: space.xs,
    marginBottom: space.lg,
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
  feedback: {
    marginTop: space.lg,
  },
  saved: {
    marginTop: space.lg,
  },
  save: {
    marginTop: space.lg,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.lg,
  },
})
