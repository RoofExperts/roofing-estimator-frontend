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
  register: (email, password) => api.post('/register', { email, password }),
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
}

// ============= CONDITIONS =============
export const conditionAPI = {
  list: (projectId) => api.get(`/api/v1/projects/${projectId}/conditions`),
  get: (id) => api.get(`/api/v1/conditions/${id}`),
  create: (projectId, data) => api.post(`/api/v1/projects/${projectId}/conditions`, data),
  update: (id, data) => api.put(`/api/v1/conditions/${id}`, data),
  delete: (id) => api.delete(`/api/v1/conditions/${id}`),
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
}

// ============= ESTIMATES =============
export const estimateAPI = {
  calculate: (projectId) => api.post(`/api/v1/projects/${projectId}/calculate-estimate`),
  get: (projectId) => api.get(`/api/v1/projects/${projectId}/estimate`),
}

// ============= REFERENCE DATA =============
export const referenceAPI = {
  conditionTypes: () => api.get('/api/v1/reference/condition-types'),
  materialsForType: (type) => api.get(`/api/v1/reference/condition-types/${type}/materials`),
  materialTemplates: () => api.get('/api/v1/material-templates'),
  costDatabase: () => api.get('/api/v1/cost-database'),
}

export default api
