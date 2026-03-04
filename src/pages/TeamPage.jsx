import { useState, useEffect } from 'react'
import { orgAPI } from '../api'
import { useAuth } from '../AuthContext'

export default function TeamPage() {
  const { user, org, isOwner } = useAuth()
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('estimator')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        orgAPI.members(),
        orgAPI.invites()
      ])
      setMembers(membersRes.data)
      setInvites(invitesRes.data)
    } catch (err) {
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setError('')
    setSuccess('')
    try {
      const res = await orgAPI.invite(inviteEmail, inviteRole)
      setSuccess(`Invite sent to ${inviteEmail}. Share this link: ${window.location.origin}/login?invite=${res.data.invite_token}`)
      setInviteEmail('')
      setInviteRole('estimator')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (memberId, email) => {
    if (!confirm(`Remove ${email} from the team?`)) return
    try {
      await orgAPI.removeMember(memberId)
      setSuccess(`${email} has been removed`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove member')
    }
  }

  const roleColors = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    estimator: 'bg-green-100 text-green-800',
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-sm text-gray-500 mt-1">{org?.name} — Manage your team members and invitations</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700 font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
          <button onClick={() => setSuccess('')} className="float-right text-green-500 hover:text-green-700 font-bold">x</button>
        </div>
      )}

      {/* Invite Form */}
      {isOwner && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h2>
          <form onSubmit={handleInvite} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="team@example.com"
              />
            </div>
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="estimator">Estimator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Members ({members.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
                  {member.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.email}</p>
                  <p className="text-xs text-gray-500">Joined {new Date(member.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${roleColors[member.role] || 'bg-gray-100 text-gray-700'}`}>
                  {member.role}
                </span>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(member.id, member.email)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Invites ({invites.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {invites.map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    Expires {new Date(inv.expires_at).toLocaleDateString()} —
                    <span className="ml-1 text-blue-600 cursor-pointer" onClick={() => {
                      const link = `${window.location.origin}/login?invite=${inv.token}`
                      navigator.clipboard.writeText(link)
                      setSuccess('Invite link copied to clipboard!')
                    }}>
                      Copy link
                    </span>
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${roleColors[inv.role] || 'bg-gray-100 text-gray-700'}`}>
                  {inv.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
