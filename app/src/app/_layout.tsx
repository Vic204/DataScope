import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider, useAuth } from '@/lib/auth'
import { palette } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync().catch(() => {
  // Nothing to do - the splash simply stays until the first frame renders.
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

/**
 * Two things must be true before the first screen is drawn: the handwriting
 * fonts are loaded, and the stored session has been checked against the API.
 * Anything else would flash the wrong screen on launch.
 *
 * Auth gating itself is declarative - `Stack.Protected` redirects a signed-out
 * visitor to /welcome and a signed-in one away from it, so no screen has to
 * remember to check.
 */
function RootNavigator() {
  const { user, ready } = useAuth()
  const [fontsLoaded, fontError] = useFonts({
    Caveat: require('@/assets/fonts/Caveat.ttf'),
    PatrickHand: require('@/assets/fonts/PatrickHand.ttf'),
  })

  const booted = (fontsLoaded || Boolean(fontError)) && ready

  useEffect(() => {
    if (booted) SplashScreen.hideAsync().catch(() => undefined)
  }, [booted])

  if (!booted) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.paper },
        }}
      >
        {/* Only while signed out */}
        <Stack.Protected guard={!user} redirectTo="/">
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>

        {/* Only while signed in */}
        <Stack.Protected guard={Boolean(user)} redirectTo="/welcome">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="builder/[id]" />
          <Stack.Screen name="survey/[id]" />
          <Stack.Screen name="results/[id]" />
        </Stack.Protected>

        {/* A share link works whether or not you are signed in */}
        <Stack.Screen name="s/[slug]" options={{ presentation: 'card' }} />
      </Stack>
    </>
  )
}
