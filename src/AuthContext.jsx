import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('authToken'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      setUser({ authenticated: true })
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    const newToken = res.data.access_token
    localStorage.setItem('authToken', newToken)
    setToken(newToken)
    setUser({ authenticated: true, email })
    return res
  }

  const register = async (email, password) => {
    const res = await authAPI.register(email, password)
    // Auto-login after registration
    await login(email, password)
    return res
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
  }

  const value = { user, token, loading, login, register, logout, isAuthenticated: !!token }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
