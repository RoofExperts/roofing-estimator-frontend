import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import AdminPage from './pages/AdminPage'
import MaterialDatabasePage from './pages/MaterialDatabasePage'
import CompanyAdminPage from './pages/CompanyAdminPage'
import TeamPage from './pages/TeamPage'
import PlatformAdminPage from './pages/PlatformAdminPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

function Layout({ children }) {
  const { logout, user, org, isAdmin, isSuperadmin } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/projects" className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <span className="text-xl font-bold text-gray-900">Roof Estimator</span>
                {org?.name && (
                  <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {org.name}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex items-center space-x-1">
              {isAdmin && (
                <>
                  <Link
                    to="/company-admin"
                    className={`text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-1 ${
                      location.pathname === '/company-admin'
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Company Admin
                  </Link>
                  <Link
                    to="/team"
                    className={`text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-1 ${
                      location.pathname === '/team'
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Team
                  </Link>
                </>
              )}
              {isSuperadmin && (
                <Link
                  to="/platform-admin"
                  className={`text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-1 ${
                    location.pathname === '/platform-admin'
                      ? 'text-indigo-700 bg-indigo-50 font-medium'
                      : 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Platform
                </Link>
              )}
              <div className="mx-2 h-6 w-px bg-gray-200"></div>
              <span className="text-xs text-gray-400 px-1">
                {user?.email}
                {user?.role && <span className="ml-1 text-blue-500 capitalize">({user.role})</span>}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <Layout><ProjectDetailPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company-admin"
        element={
          <ProtectedRoute>
            <Layout><CompanyAdminPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/materials" element={<Navigate to="/company-admin" />} />
      <Route path="/admin" element={<Navigate to="/company-admin" />} />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <Layout><TeamPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-admin"
        element={
          <ProtectedRoute>
            <Layout><PlatformAdminPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/projects" />} />
      <Route path="*" element={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-400 mb-4">404</h1>
            <p className="text-gray-500 mb-4">Page not found</p>
            <Link to="/projects" className="text-primary-600 hover:text-primary-700">Go to Dashboard</Link>
          </div>
        </div>
      } />
    </Routes>
  )
}
