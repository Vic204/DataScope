import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { api, errorMessage, setAuthToken, type User, type UserProfile } from '@/lib/api'
import { clearToken, readToken, writeToken } from '@/lib/storage'

type AuthContextValue = {
  user: User | null
  /** False until the stored token has been checked against the API. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    name: string
    email: string
    password: string
    profile?: Partial<UserProfile>
  }) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (input: { name?: string; profile?: Partial<UserProfile> }) => Promise<User>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  // Restore the session once, on boot: read the token, then verify it by
  // fetching the profile. A stale or revoked token simply signs the user out.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      const token = await readToken()
      if (!token) {
        if (!cancelled) setReady(true)
        return
      }

      setAuthToken(token)
      try {
        const { user: me } = await api.auth.me()
        if (!cancelled) setUser(me)
      } catch {
        setAuthToken(null)
        await clearToken()
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: me } = await api.auth.login({ email, password })
    setAuthToken(token)
    await writeToken(token)
    setUser(me)
  }, [])

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string; profile?: Partial<UserProfile> }) => {
      const { token, user: me } = await api.auth.register(input)
      setAuthToken(token)
      await writeToken(token)
      setUser(me)
    },
    [],
  )

  const signOut = useCallback(async () => {
    setAuthToken(null)
    await clearToken()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const { user: me } = await api.auth.me()
    setUser(me)
  }, [])

  const updateProfile = useCallback(
    async (input: { name?: string; profile?: Partial<UserProfile> }) => {
      const { user: me } = await api.users.updateMe(input)
      setUser(me)
      return me
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signUp, signOut, refresh, updateProfile, setUser }),
    [user, ready, signIn, signUp, signOut, refresh, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

export { errorMessage }
