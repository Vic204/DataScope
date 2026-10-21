import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Field } from '@/components/controls'
import { Card, PaperScreen } from '@/components/paper'
import { ScreenHeader } from '@/components/screen-header'
import { ErrorNote } from '@/components/states'
import { Text } from '@/components/text'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { space } from '@/theme/tokens'

export default function SignInScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  /** Set when a share link sent a signed-out visitor here. */
  const { next } = useLocalSearchParams<{ next?: string }>()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password first.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      // If a question started this, finish it. The auth guard would otherwise
      // drop the user on the feed.
      router.replace(next ? (next as `/s/${string}`) : '/')
    } catch (problem) {
      setError(errorMessage(problem))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PaperScreen contentStyle={styles.page}>
      <ScreenHeader
        title="welcome back"
        subtitle="pick up where you left off"
        mark="mint"
        lead="♡"
        onBack={() => router.replace('/welcome')}
      />

      <Card tape={1} tiltDeg={0.4}>
        <Field
          label="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
        <Field
          label="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {error ? <ErrorNote message={error} style={styles.error} /> : null}

        <Button label="sign in" trailing="→" onPress={submit} loading={busy} fullWidth style={styles.submit} />
      </Card>

      <View style={styles.footer}>
        <Text variant="small" tone="soft">
          no diary yet?
        </Text>
        <Button label="make one" variant="ghost" size="sm" onPress={() => router.replace('/sign-up')} />
      </View>

      <View style={styles.demo}>
        <Button
          label="use the demo account"
          variant="ghost"
          size="sm"
          leading="✦"
          onPress={() => {
            setEmail('amal@datascope.dev')
            setPassword('password123')
            setError(null)
          }}
        />
      </View>
    </PaperScreen>
  )
}

const styles = StyleSheet.create({
  page: {
    paddingTop: space.xl,
  },
  error: {
    marginBottom: space.md,
  },
  submit: {
    marginTop: space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xl,
  },
  demo: {
    alignItems: 'center',
    marginTop: space.md,
  },
})
