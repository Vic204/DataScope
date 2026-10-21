import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Field, StickyNote } from '@/components/controls'
import { Card, PaperScreen } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote } from '@/components/states'
import { Text } from '@/components/text'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { splitList } from '@/lib/format'
import { space } from '@/theme/tokens'

/**
 * Sign-up doubles as profile setup, because the feed only works once the
 * profile has something to match against. Age, city and interests are the three
 * things targeting rules can use, so they are asked for here - all optional, all
 * editable later on the profile page.
 */
export default function SignUpScreen() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [interests, setInterests] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (name.trim().length < 2) {
      setError('What should we call you?')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('That email address does not look right.')
      return
    }
    if (password.length < 8) {
      setError('Passwords need at least 8 characters.')
      return
    }

    const parsedAge = age.trim() ? Number(age.trim()) : undefined
    if (parsedAge !== undefined && (!Number.isInteger(parsedAge) || parsedAge < 10 || parsedAge > 120)) {
      setError('Age should be a whole number between 10 and 120.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        profile: {
          age: parsedAge,
          city: city.trim() || undefined,
          interests: splitList(interests),
        },
      })
      router.replace('/')
    } catch (problem) {
      setError(errorMessage(problem))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PaperScreen contentStyle={styles.page}>
      <ScreenHeader
        title="a fresh page"
        subtitle="two minutes and you are in"
        mark="lilac"
        lead="✿"
        onBack={() => router.replace('/welcome')}
      />

      <Card tape={2} tiltDeg={-0.4}>
        <Field
          label="what should we call you?"
          value={name}
          onChangeText={setName}
          placeholder="Amal Krishna"
          autoCapitalize="words"
        />
        <Field
          label="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="password"
          value={password}
          onChangeText={setPassword}
          placeholder="at least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          hint="kept as a bcrypt hash, never in plain text"
        />
      </Card>

      <View style={styles.section}>
        <Text variant="label" tone="soft">
          about you — optional, but it is how surveys find you
        </Text>
      </View>

      <Card tape={3} tiltDeg={0.3}>
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
          label="interests"
          value={interests}
          onChangeText={setInterests}
          placeholder="music, cricket, design"
          hint="separate with commas"
        />

        <StickyNote color="sky" tiltDeg={-0.6}>
          <Text variant="small" tone="soft">
            surveys can be written for a particular age, city or interest. Fill these in and they
            will show up in your feed.
          </Text>
        </StickyNote>
      </Card>

      {error ? <ErrorNote message={error} style={styles.error} /> : null}

      <Button label="open my diary" trailing="→" onPress={submit} loading={busy} fullWidth style={styles.submit} />

      <View style={styles.footer}>
        <Text variant="small" tone="soft">
          already have one?
        </Text>
        <Button label="sign in" variant="ghost" size="sm" onPress={() => router.replace('/sign-in')} />
      </View>
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  page: {
    paddingTop: space.xl,
  },
  section: {
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  pair: {
    flexDirection: 'row',
    gap: space.md,
  },
  pairItem: {
    flex: 1,
  },
  error: {
    marginTop: space.lg,
  },
  submit: {
    marginTop: space.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.lg,
  },
})
