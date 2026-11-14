import { createContext, useContext } from 'react'

// { user, setUser, signOut }; user is null when signed out, undefined while checking.
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)
