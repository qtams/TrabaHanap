import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth.js'
import { AuthContext } from './context.js'

// Knows who is signed in. An expired session anywhere (API 401) signs the app out.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    authApi.me().then(setUser, () => setUser(null))
    const expired = () => setUser(null)
    window.addEventListener('auth:expired', expired)
    return () => window.removeEventListener('auth:expired', expired)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, setUser, signOut }), [user, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
