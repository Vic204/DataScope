import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Token persistence. AsyncStorage has a web implementation backed by
 * localStorage, so one API covers iOS, Android and the browser.
 *
 * A JWT in AsyncStorage is not encrypted at rest. That is an acceptable
 * trade-off for this app (the token is short-lived and only grants access to
 * survey data); a production build handling anything more sensitive should move
 * to expo-secure-store on native.
 */

const TOKEN_KEY = 'datascope.token'

export async function readToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function writeToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage being unavailable should not block a sign-in that already worked.
  }
}

export async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore - the in-memory token is cleared by the auth provider regardless.
  }
}
