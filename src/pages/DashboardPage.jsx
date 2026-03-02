import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectAPI } from '../api'
import Modal from '../components/Modal'
import { LoadingSpinner, ErrorDisplay } from '../components/common'

export default function DashboardPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({ project_name: '', address: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editForm, setEditForm] = useState({ project_name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [deletingProject, setDeletingProject] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  const fetchProjects = async () => {
    try {
      const res = await projectAPI.list()
      setProjects(res.data)
    } catch (err) {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await projectAPI.create(newProject)
      setShowModal(false)
      setNewProject({ project_name: '', address: '', description: '' })
      fetchProjects()
    } catch (err) {
      setError('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (project, e) => {
    e.stopPropagation()
    setEditForm({ project_name: project.project_name || '', address: project.address || '' })
    setEditingProject(project)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await projectAPI.update(editingProject.id, editForm)
      setEditingProject(null)
      fetchProjects()
    } catch (err) {
      setError('Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (project, e) => {
    e.stopPropagation()
    setDeletingProject(project)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await projectAPI.delete(deletingProject.id)
      setDeletingProject(null)
      fetchProjects()
    } catch (err) {
      setError('Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay message={error} onRetry={fetchProjects} />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="mx-auto w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-2 text-sm text-gray-500">Create your first roofing project to get started.</p>
          <button onClick={() => setShowModal(true)} className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all cursor-pointer group relative">
              <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => openEdit(project, e)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" title="Edit project">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={(e) => confirmDelete(project, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete project">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="flex items-start justify-between pr-16">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{project.project_name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'completed' ? 'bg-green-100 text-green-800' : project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{project.status || 'New'}</span>
              </div>
              {project.address && (
                <p className="mt-2 text-sm text-gray-500 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {project.address}
                </p>
              )}
              {project.description && (<p className="mt-2 text-sm text-gray-600 line-clamp-2">{project.description}</p>)}
              <div className="mt-4 text-xs text-gray-400">Created {new Date(project.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name *</label>
            <input type="text" required value={newProject.project_name} onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="e.g., Walmart Distribution Center" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input type="text" value={newProject.address} onChange={(e) => setNewProject({ ...newProject, address: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="e.g., 123 Main St, Dallas, TX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea rows={3} value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="Brief project description..." />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={creating} className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">{creating ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name *</label>
            <input type="text" required value={editForm.project_name} onChange={(e) => setEditForm({ ...editForm, project_name: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setEditingProject(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} title="Delete Project">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-900">{deletingProject?.project_name}</span>? This action cannot be undone and all associated data will be permanently removed.</p>
          <div className="flex justify-end space-x-3 pt-4">
            <button onClick={() => setDeletingProject(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Project'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
