import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from './api'

const AuthContext = createContext(null)

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('authToken'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const payload = decodeJWT(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser({
          authenticated: true,
          id: payload.user_id,
          email: payload.sub,
          role: payload.role || 'estimator',
          is_superadmin: payload.is_superadmin || false,
        })
        setOrg({
          id: payload.org_id,
          name: localStorage.getItem('orgName') || '',
        })
      } else {
        // Token expired
        localStorage.removeItem('authToken')
        localStorage.removeItem('orgName')
        setToken(null)
        setUser(null)
        setOrg(null)
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    const newToken = res.data.access_token
    localStorage.setItem('authToken', newToken)
    if (res.data.org_name) {
      localStorage.setItem('orgName', res.data.org_name)
    }
    setToken(newToken)
    setUser({
      authenticated: true,
      id: res.data.user_id,
      email,
      role: res.data.role || 'estimator',
    })
    setOrg({
      id: res.data.org_id,
      name: res.data.org_name || '',
    })
    return res
  }

  const register = async (email, password, companyName) => {
    const res = await authAPI.register(email, password, companyName)
    const newToken = res.data.access_token
    localStorage.setItem('authToken', newToken)
    if (res.data.org_name) {
      localStorage.setItem('orgName', res.data.org_name)
    }
    setToken(newToken)
    setUser({
      authenticated: true,
      id: res.data.user_id,
      email,
      role: res.data.role || 'owner',
    })
    setOrg({
      id: res.data.org_id,
      name: res.data.org_name || companyName || '',
    })
    return res
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('orgName')
    setToken(null)
    setUser(null)
    setOrg(null)
  }

  const value = {
    user,
    org,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'owner' || user?.role === 'admin',
    isSuperadmin: user?.is_superadmin || false,
  }

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
