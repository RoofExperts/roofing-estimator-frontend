import { useState, useEffect } from 'react'
import api from '../api'

// ============= DASHBOARD TAB =============
function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/v1/platform/dashboard')
      setStats(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load dashboard')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  const totalOrgs = stats?.total_organizations || 0
  const totalUsers = stats?.total_users || 0
  const totalProjects = stats?.total_projects || 0
  const totalProposals = stats?.total_proposals || 0
  const last30Days = stats?.last_30_days || {}
  const avgTeamSize = stats?.average_team_size || 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium">Total Organizations</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{totalOrgs}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium">Total Users</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium">Total Projects</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{totalProjects}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium">Total Proposals</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{totalProposals}</p>
        </div>
      </div>

      {/* Last 30 Days Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 30 Days</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">New Organizations</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{last30Days.new_organizations || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">New Users</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{last30Days.new_users || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">New Projects</p>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{last30Days.new_projects || 0}</p>
          </div>
        </div>
      </div>

      {/* Average Team Size */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <p className="text-sm text-gray-600 font-medium">Average Team Size</p>
        <p className="text-4xl font-bold text-indigo-600 mt-2">{avgTeamSize.toFixed(2)}</p>
        <p className="text-sm text-gray-500 mt-2">Members per organization</p>
      </div>
    </div>
  )
}

// ============= ORGANIZATIONS TAB =============
function OrganizationsTab() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingName, setEditingName] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const limit = 50

  useEffect(() => {
    loadOrganizations()
  }, [searchTerm, offset])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/v1/platform/organizations', {
        params: {
          search: searchTerm,
          limit,
          offset,
        }
      })
      setOrgs(res.data.organizations || [])
      setHasMore((res.data.total || 0) > offset + limit)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load organizations')
      console.error('Organizations error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrgDetails = async (orgId) => {
    try {
      setDetailLoading(true)
      const res = await api.get(`/api/v1/platform/organizations/${orgId}`)
      setSelectedOrg(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load organization details')
      console.error('Org details error:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleEditName = (org) => {
    setEditingName(org.id)
    setEditingValue(org.name)
  }

  const saveName = async (orgId) => {
    try {
      setActionLoading(orgId)
      await api.put(`/api/v1/platform/organizations/${orgId}`, {
        name: editingValue
      })
      setOrgs(orgs.map(o => o.id === orgId ? { ...o, name: editingValue } : o))
      if (selectedOrg?.id === orgId) {
        setSelectedOrg({ ...selectedOrg, name: editingValue })
      }
      setEditingName(null)
      setEditingValue('')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update organization name')
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async (orgId) => {
    try {
      setActionLoading(orgId)
      const res = await api.post(`/api/v1/platform/impersonate/${orgId}`)
      const token = res.data.token
      localStorage.setItem('authToken', token)
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to impersonate organization')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeactivate = async (orgId) => {
    if (!window.confirm('Are you sure you want to deactivate this organization? This action cannot be undone.')) {
      return
    }
    try {
      setActionLoading(orgId)
      await api.delete(`/api/v1/platform/organizations/${orgId}`)
      setOrgs(orgs.filter(o => o.id !== orgId))
      setSelectedOrg(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to deactivate organization')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && orgs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading organizations...</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Organizations List */}
      <div className="lg:col-span-2 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search organizations by name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setOffset(0)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Owner Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Members</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Projects</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Created</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <button
                      onClick={() => loadOrgDetails(org.id)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {org.name}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{org.owner_email || 'N/A'}</td>
                  <td className="px-6 py-3">
                    <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded text-xs font-medium">
                      {org.member_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{org.project_count || 0}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => {
                        setEditingName(org.id)
                        setEditingValue(org.name)
                      }}
                      disabled={actionLoading === org.id}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleImpersonate(org.id)}
                      disabled={actionLoading === org.id}
                      className="text-xs text-green-600 hover:text-green-700 disabled:opacity-50 mr-2"
                    >
                      Impersonate
                    </button>
                    <button
                      onClick={() => handleDeactivate(org.id)}
                      disabled={actionLoading === org.id}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No organizations found
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Showing {offset + 1} to {offset + orgs.length}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={!hasMore}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Edit Name Modal */}
        {editingName && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Organization Name</h3>
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingName(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveName(editingName)}
                  disabled={actionLoading === editingName}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading === editingName ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Organization Details Panel */}
      {selectedOrg && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 h-fit">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{selectedOrg.name}</h3>
            <button
              onClick={() => setSelectedOrg(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Owner */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Owner</p>
                <p className="text-sm text-gray-900 mt-1">{selectedOrg.owner_email || 'N/A'}</p>
              </div>

              {/* Members List */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Members</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedOrg.members && selectedOrg.members.length > 0 ? (
                    selectedOrg.members.map((member, idx) => (
                      <div key={idx} className="text-sm text-gray-700 flex justify-between">
                        <span>{member.email}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          {member.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No members</p>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Usage</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Projects:</span>
                    <span className="font-medium text-gray-900">{selectedOrg.project_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Proposals:</span>
                    <span className="font-medium text-gray-900">{selectedOrg.proposal_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Created</p>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============= USERS TAB =============
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const limit = 50

  useEffect(() => {
    loadUsers()
  }, [searchTerm, offset])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/v1/platform/users', {
        params: {
          search: searchTerm,
          limit,
          offset,
        }
      })
      setUsers(res.data.users || [])
      setHasMore((res.data.total || 0) > offset + limit)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load users')
      console.error('Users error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMakeSuperadmin = async (userId) => {
    try {
      setActionLoading(userId)
      await api.post(`/api/v1/platform/users/${userId}/make-superadmin`)
      setUsers(users.map(u => u.id === userId ? { ...u, is_superadmin: true } : u))
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to make user superadmin')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (userId) => {
    try {
      setActionLoading(userId)
      const res = await api.post(`/api/v1/platform/users/${userId}/reset-password`)
      const tempPassword = res.data.temporary_password
      alert(`Temporary password for this user: ${tempPassword}\n\nShare this with them securely.`)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to reset password')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search users by email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setOffset(0)
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Organizations</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Superadmin</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Created</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-900">{user.email}</td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    {user.organizations && user.organizations.length > 0 ? (
                      user.organizations.map((org, idx) => (
                        <span key={idx} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {org}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                    user.is_superadmin
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.is_superadmin ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-3">
                  {!user.is_superadmin && (
                    <button
                      onClick={() => handleMakeSuperadmin(user.id)}
                      disabled={actionLoading === user.id}
                      className="text-xs text-green-600 hover:text-green-700 disabled:opacity-50 mr-2"
                    >
                      Make Superadmin
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(user.id)}
                    disabled={actionLoading === user.id}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Showing {offset + 1} to {offset + users.length}
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={!hasMore}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ============= SETTINGS TAB =============
function SettingsTab() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleMakeSuperadmin = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      await api.post('/api/v1/platform/users/make-superadmin', {
        user_email: email
      })
      setMessage({ type: 'success', text: `Successfully made ${email} a superadmin` })
      setEmail('')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to make user superadmin'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Setup</h3>
        <p className="text-gray-600 text-sm mb-6">
          Use this section to set up your first superadmin account or promote existing users to superadmin.
        </p>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the email of the user you want to make a superadmin
            </p>
          </div>

          <button
            onClick={handleMakeSuperadmin}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : 'Make Superadmin'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============= MAIN COMPONENT =============
export default function PlatformAdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Platform Administration</h1>
          <p className="text-indigo-100 text-sm mt-1">Manage organizations, users, and platform settings</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8 bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'organizations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Organizations
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg p-8">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'organizations' && <OrganizationsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}
