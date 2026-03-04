import { useState } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { authAPI } from '../api'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login, register, invite
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Check for invite token in URL
  const inviteToken = searchParams.get('invite')

  if (isAuthenticated && !inviteToken) return <Navigate to="/projects" />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (mode === 'register' && !companyName.trim()) {
      setError('Company name is required')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        await register(email, password, companyName)
        navigate('/projects')
      } else if (inviteToken) {
        // Accept invite
        const res = await authAPI.acceptInvite(inviteToken, password, email)
        localStorage.setItem('authToken', res.data.access_token)
        if (res.data.org_name) localStorage.setItem('orgName', res.data.org_name)
        window.location.href = '/projects'
      } else {
        await login(email, password)
        navigate('/projects')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <svg className="mx-auto w-16 h-16 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">Roof Estimator</h2>
          <p className="mt-2 text-sm text-gray-600">
            {inviteToken ? 'Accept your team invite' : mode === 'register' ? 'Create your company account' : 'Sign in to your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Company Name - only on register */}
            {mode === 'register' && (
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your Roofing Company"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your password"
              />
            </div>
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm your password"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Please wait...' : inviteToken ? 'Accept Invite & Sign In' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>

          {!inviteToken && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
