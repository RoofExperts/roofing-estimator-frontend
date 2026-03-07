import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://roof-estimator-backend.onrender.com'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============= AUTH =============
export const authAPI = {
  login: (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    return api.post('/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  register: (email, password, companyName) => api.post('/register', { email, password, company_name: companyName }),
  acceptInvite: (token, password, email) => api.post('/accept-invite', { token, password, email }),
}

// ============= ORGANIZATION / TEAM =============
export const orgAPI = {
  get: () => api.get('/api/v1/org'),
  update: (data) => api.put('/api/v1/org', data),
  members: () => api.get('/api/v1/org/members'),
  invite: (email, role) => api.post('/api/v1/org/invite', { email, role }),
  removeMember: (memberId) => api.delete(`/api/v1/org/members/${memberId}`),
  invites: () => api.get('/api/v1/org/invites'),
}

// ============= PROJECTS =============
export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  uploadSpec: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/projects/${id}/upload-spec`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  analyzeSpec: (id) => api.post(`/projects/${id}/analyze-spec`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
}

// ============= CONDITIONS =============
export const conditionAPI = {
  list: (projectId) => api.get(`/api/v1/projects/${projectId}/conditions`),
  listWithMaterials: (projectId) => api.get(`/api/v1/projects/${projectId}/conditions-with-materials`),
  get: (id) => api.get(`/api/v1/conditions/${id}`),
  create: (projectId, data) => api.post(`/api/v1/projects/${projectId}/conditions`, data),
  update: (id, data) => api.put(`/api/v1/conditions/${id}`, data),
  delete: (id) => api.delete(`/api/v1/conditions/${id}`),
  smartBuild: (projectId) => api.post(`/api/v1/projects/${projectId}/smart-build-conditions`),
  populateMaterials: (projectId) => api.post(`/api/v1/projects/${projectId}/populate-materials`),
  // Condition Materials CRUD
  listMaterials: (conditionId) => api.get(`/api/v1/conditions/${conditionId}/materials`),
  addMaterial: (conditionId, data) => api.post(`/api/v1/conditions/${conditionId}/materials`, data),
  updateMaterial: (materialId, data) => api.put(`/api/v1/condition-materials/${materialId}`, data),
  deleteMaterial: (materialId) => api.delete(`/api/v1/condition-materials/${materialId}`),
  searchCostDatabase: (q = '', category = '') => {
    const params = new URLSearchParams()
    if (q) params.append('q', q)
    if (category) params.append('category', category)
    return api.get(`/api/v1/cost-database/search?${params.toString()}`)
  },
}

// ============= VISION / PLANS =============
export const planAPI = {
  upload: (projectId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/api/v1/projects/${projectId}/upload-plan`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  list: (projectId) => api.get(`/api/v1/projects/${projectId}/plan-files`),
  get: (id) => api.get(`/api/v1/plan-files/${id}`),
  status: (id) => api.get(`/api/v1/plan-files/${id}/status`),
  extractions: (id) => api.get(`/api/v1/plan-files/${id}/extractions`),
  updateExtraction: (id, data) => api.put(`/api/v1/extractions/${id}`, data),
  deleteExtraction: (id) => api.delete(`/api/v1/extractions/${id}`),
  regenerateConditions: (id) => api.post(`/api/v1/plan-files/${id}/regenerate-conditions`),
  reanalyze: (id) => api.post(`/api/v1/plan-files/${id}/reanalyze`),
  // Markups
  saveMarkups: (planId, markups) => api.post(`/api/v1/plan-files/${planId}/markups`, { markups }),
  getMarkups: (planId) => api.get(`/api/v1/plan-files/${planId}/markups`),
  deleteMarkup: (markupId) => api.delete(`/api/v1/markups/${markupId}`),
}

// ============= ESTIMATES =============
export const estimateAPI = {
  calculate: (projectId) => api.post(`/api/v1/projects/${projectId}/calculate-estimate`),
  get: (projectId) => api.get(`/api/v1/projects/${projectId}/estimate`),
  takeoff: (projectId) => api.get(`/api/v1/projects/${projectId}/takeoff`),
  save: (projectId, estimateData) => api.post(`/api/v1/projects/${projectId}/save-estimate`, { estimate_data: estimateData }),
  load: (projectId) => api.get(`/api/v1/projects/${projectId}/saved-estimate`),
}

// ============= PROPOSALS =============
export const proposalAPI = {
  generate: (projectId, data) => api.post(`/api/v1/projects/${projectId}/generate-proposal`, data, {
    responseType: 'blob'
  }),
  defaults: (projectId) => api.get(`/api/v1/projects/${projectId}/proposal-defaults`),
}

// ============= ADMIN =============
export const adminAPI = {
  getCompany: () => api.get('/api/v1/admin/company'),
  updateCompany: (data) => api.put('/api/v1/admin/company', data),
  uploadLogo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/v1/admin/company/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deleteLogo: () => api.delete('/api/v1/admin/company/logo'),
}

// ============= CUSTOMERS =============
export const customerAPI = {
  list: (search) => api.get('/api/v1/customers', { params: search ? { search } : {} }),
  get: (id) => api.get(`/api/v1/customers/${id}`),
  create: (data) => api.post('/api/v1/customers', data),
  update: (id, data) => api.put(`/api/v1/customers/${id}`, data),
  delete: (id) => api.delete(`/api/v1/customers/${id}`),
}

// ============= SAVED PROPOSALS =============
export const savedProposalAPI = {
  list: (projectId) => api.get(`/api/v1/projects/${projectId}/proposals`),
  get: (id) => api.get(`/api/v1/proposals/${id}`),
  save: (projectId, data) => api.post(`/api/v1/projects/${projectId}/proposals`, data),
  update: (id, data) => api.put(`/api/v1/proposals/${id}`, data),
  delete: (id) => api.delete(`/api/v1/proposals/${id}`),
  generatePdf: (id) => api.get(`/api/v1/proposals/${id}/generate-pdf`, { responseType: 'blob' }),
  batchGenerate: (projectId, data) => api.post(`/api/v1/projects/${projectId}/generate-batch-proposals`, data),
}

// ============= PROPOSAL TYPES =============
export const proposalTypeAPI = {
  list: () => api.get('/api/v1/proposal-types'),
  get: (type) => api.get(`/api/v1/proposal-types/${type}`),
}

// ============= REFERENCE DATA =============
export const referenceAPI = {
  conditionTypes: () => api.get('/api/v1/reference/condition-types'),
  materialsForType: (type) => api.get(`/api/v1/reference/condition-types/${type}/materials`),
  materialTemplates: () => api.get('/api/v1/material-templates'),
  costDatabase: () => api.get('/api/v1/cost-database'),
  uploadPricing: (formData) => {
    return api.post('/api/v1/cost-database/upload-pricing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

// ============= COST DATABASE =============
export const costDatabaseAPI = {
  list: (category = '', includeInactive = false) => {
    const params = new URLSearchParams()
    if (category) params.append('material_category', category)
    if (!includeInactive) params.append('is_active', 'true')
    return api.get(`/api/v1/cost-database?${params.toString()}`)
  },
  get: (id) => api.get(`/api/v1/cost-database/${id}`),
  create: (data) => api.post('/api/v1/cost-database', data),
  update: (id, data) => api.put(`/api/v1/cost-database/${id}`, data),
  delete: (id) => api.delete(`/api/v1/cost-database/${id}`),
  search: (q = '', category = '') => {
    const params = new URLSearchParams()
    if (q) params.append('q', q)
    if (category) params.append('category', category)
    return api.get(`/api/v1/cost-database/search?${params.toString()}`)
  },
  uploadPricing: (formData) => {
    return api.post('/api/v1/cost-database/upload-pricing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  resync: (updatePricing = false) => api.post(`/api/v1/cost-database/resync?update_pricing=${updatePricing}`),
}

export default api
