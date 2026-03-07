import { useState, useEffect, useRef } from 'react'
import { planAPI } from '../api'
import { LoadingSpinner, StatusBadge } from './common'
import PdfMarkupViewer from './PdfMarkupViewer'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://roof-estimator-backend.onrender.com'

const COMMON_SCALES = [
  { label: '1/16" = 1\'-0"', notation: '1/16 inch = 1 foot', ratio: 192 },
  { label: '3/32" = 1\'-0"', notation: '3/32 inch = 1 foot', ratio: 128 },
  { label: '1/8" = 1\'-0"', notation: '1/8 inch = 1 foot', ratio: 96 },
  { label: '3/16" = 1\'-0"', notation: '3/16 inch = 1 foot', ratio: 64 },
  { label: '1/4" = 1\'-0"', notation: '1/4 inch = 1 foot', ratio: 48 },
  { label: '3/8" = 1\'-0"', notation: '3/8 inch = 1 foot', ratio: 32 },
  { label: '1/2" = 1\'-0"', notation: '1/2 inch = 1 foot', ratio: 24 },
  { label: '3/4" = 1\'-0"', notation: '3/4 inch = 1 foot', ratio: 16 },
  { label: '1" = 1\'-0"', notation: '1 inch = 1 foot', ratio: 12 },
]

export default function PlansTab({ projectId }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [extractions, setExtractions] = useState({})
  const [editingExtraction, setEditingExtraction] = useState(null)
  const [editValue, setEditValue] = useState('')
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [viewingPlan, setViewingPlan] = useState(null)
  const [viewMode, setViewMode] = useState('markup') // 'markup' or 'basic'
  const [progressMap, setProgressMap] = useState({}) // planId -> { progress_message, detected_scale }
  const [settingScale, setSettingScale] = useState(null) // planId currently changing scale

  const fetchPlans = async () => {
    try {
      const res = await planAPI.list(projectId)
      setPlans(res.data)
    } catch (err) {
      setError('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [projectId])

  // Poll progress for any plans in processing/pending state
  useEffect(() => {
    const processingPlans = plans.filter(p => ['processing', 'pending'].includes(p.upload_status || p.status))
    if (processingPlans.length === 0) return

    const interval = setInterval(async () => {
      let shouldRefresh = false
      for (const plan of processingPlans) {
        try {
          const res = await planAPI.status(plan.id)
          const data = res.data
          setProgressMap(prev => ({ ...prev, [plan.id]: data }))
          // If status changed to completed or failed, refresh the plans list
          if (data.status === 'completed' || data.status === 'failed') {
            shouldRefresh = true
          }
        } catch (err) {
          console.error('Failed to poll plan status:', err)
        }
      }
      if (shouldRefresh) {
        fetchPlans()
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [plans])

  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }
    setUploading(true)
    setError('')
    try {
      // Wake up backend first (Render free tier sleeps after inactivity)
      try {
        await fetch(`${API_BASE_URL}/api/v1/vision-version`, { signal: AbortSignal.timeout(60000) })
      } catch (e) {
        // If wake-up fails, still try upload — backend may just be slow
        console.warn('Backend wake-up ping failed, attempting upload anyway:', e.message)
      }
      await planAPI.upload(projectId, file)
      await fetchPlans()
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Unknown error'
      setError(`Upload failed: ${detail}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const fetchExtractions = async (planId) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null)
      return
    }
    try {
      const res = await planAPI.extractions(planId)
      setExtractions(prev => ({ ...prev, [planId]: res.data }))
      setExpandedPlan(planId)
    } catch (err) {
      setError('Failed to load extractions')
    }
  }

  const updateExtraction = async (extractionId) => {
    try {
      await planAPI.updateExtraction(extractionId, { measurement_value: parseFloat(editValue) })
      setEditingExtraction(null)
      if (expandedPlan) {
        setExpandedPlan(null)
        setTimeout(() => fetchExtractions(expandedPlan), 100)
      }
    } catch (err) {
      setError('Failed to update extraction')
    }
  }

  const regenerateConditions = async (planId) => {
    try {
      await planAPI.regenerateConditions(planId)
      setError('')
      alert('Conditions regenerated successfully!')
    } catch (err) {
      setError('Failed to regenerate conditions')
    }
  }

  const handleDeletePlan = async (planId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this plan and all its extractions/conditions?')) return
    try {
      await planAPI.delete(planId)
      if (viewingPlan?.id === planId) setViewingPlan(null)
      if (expandedPlan === planId) setExpandedPlan(null)
      await fetchPlans()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete plan')
    }
  }

  const handleReanalyze = async (planId, e) => {
    e.stopPropagation()
    try {
      await planAPI.reanalyze(planId)
      await fetchPlans()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to re-analyze plan')
    }
  }

  const handleScaleChange = async (planId, scaleValue, e) => {
    e.stopPropagation()
    setSettingScale(planId)
    try {
      if (scaleValue === 'auto') {
        // Clear manual override
        await planAPI.setScale(planId, { clear: true })
      } else {
        const scale = COMMON_SCALES.find(s => String(s.ratio) === scaleValue)
        if (scale) {
          await planAPI.setScale(planId, {
            scale_notation: scale.notation,
            scale_ratio: scale.ratio,
          })
        }
      }
      await fetchPlans()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set scale')
    } finally {
      setSettingScale(null)
    }
  }

  const getPlanProxyUrl = (plan) => {
    return `${API_BASE_URL}/plans/${plan.id}/file`
  }

  const handleSaveMeasurements = (measurements) => {
    // TODO: save measurements to backend
    console.log('Measurements to save:', measurements)
    alert(`Saved ${measurements.length} measurement(s):\n${measurements.map(m => `Page ${m.page}: ${m.formatted}`).join('\n')}`)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">x</button>
        </div>
      )}

      {/* Plan Viewer */}
      {viewingPlan && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-gray-700">
                {viewingPlan.filename || `Plan #${viewingPlan.id}`}
              </h3>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">
                Click "Set Scale" in toolbar, then pick 2 points of a known dimension to enable real measurements
              </span>
            </div>
            <button onClick={() => setViewingPlan(null)} className="text-sm text-gray-500 hover:text-gray-700">
              Close Viewer
            </button>
          </div>
          <PdfMarkupViewer
            url={getPlanProxyUrl(viewingPlan)}
            onClose={() => setViewingPlan(null)}
            onSaveMeasurements={handleSaveMeasurements}
          />
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <svg className="mx-auto w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600 mb-2">
          {uploading ? 'Uploading & splitting pages... (may take a moment if server is waking up)' : 'Drag and drop a PDF roof plan here, or'}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]) }}
        />
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => fetchExtractions(plan.id)}>
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{plan.file_name || plan.filename || `Plan #${plan.id}`}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{plan.page_count === 1 ? '1 page' : `${plan.page_count || '?'} pages`}</span>
                    {plan.upload_status === 'completed' && (
                      <>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-500">Scale:</span>
                        <select
                          value={plan.manual_scale_ratio ? String(plan.manual_scale_ratio) : 'auto'}
                          onChange={(e) => handleScaleChange(plan.id, e.target.value, e)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={settingScale === plan.id}
                          className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="auto">
                            Auto{plan.detected_scale ? ` (${plan.detected_scale})` : ''}
                          </option>
                          {COMMON_SCALES.map(s => (
                            <option key={s.ratio} value={String(s.ratio)}>{s.label}</option>
                          ))}
                        </select>
                        {plan.manual_scale && (
                          <span className="text-xs text-amber-600 font-medium">Manual</span>
                        )}
                      </>
                    )}
                  </div>
                  {/* Live progress indicator */}
                  {['processing', 'pending'].includes(plan.upload_status || plan.status) && progressMap[plan.id] && (
                    <div className="mt-1">
                      {progressMap[plan.id].progress_message && (
                        <p className="text-xs text-blue-600 font-medium flex items-center">
                          <svg className="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {progressMap[plan.id].progress_message}
                        </p>
                      )}
                      {progressMap[plan.id].detected_scale && (
                        <p className="text-xs text-green-600">Scale: {progressMap[plan.id].detected_scale}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewingPlan(viewingPlan?.id === plan.id ? null : plan) }}
                  className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewingPlan?.id === plan.id
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {viewingPlan?.id === plan.id ? 'Hide' : 'View & Markup'}
                </button>
                {['failed', 'pending', 'completed'].includes(plan.upload_status || plan.status) && (
                  <button
                    onClick={(e) => handleReanalyze(plan.id, e)}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                    title="Re-analyze this plan with current scale setting"
                  >
                    Re-Analyze
                  </button>
                )}
                <button
                  onClick={(e) => handleDeletePlan(plan.id, e)}
                  className="inline-flex items-center px-2 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"
                  title="Delete this plan"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <StatusBadge status={plan.upload_status || plan.status} />
                {plan.error_message && (
                  <span className="text-xs text-red-500 max-w-xs truncate" title={plan.error_message}>
                    {plan.error_message}
                  </span>
                )}
                <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedPlan === plan.id ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {expandedPlan === plan.id && (
              <div className="border-t border-gray-200 p-4">
                {(extractions[plan.id]?.length > 0) ? (
                  <>
                    <table className="min-w-full divide-y divide-gray-200 mb-4">
                      <thead><tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {extractions[plan.id].map((ext) => (
                          <tr key={ext.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{ext.extraction_type || ext.type}</td>
                            <td className="px-4 py-2 text-sm">
                              {editingExtraction === ext.id ? (
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 px-2 py-1 border rounded text-sm" autoFocus />
                              ) : (<span className="font-medium">{ext.measurement_value ?? ext.value}</span>)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{ext.measurement_unit || ext.unit}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                (ext.confidence_score ?? ext.confidence) > 0.8 ? 'bg-green-100 text-green-800' :
                                (ext.confidence_score ?? ext.confidence) > 0.5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>{(((ext.confidence_score ?? ext.confidence) || 0) * 100).toFixed(0)}%</span>
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              {editingExtraction === ext.id ? (
                                <><button onClick={() => updateExtraction(ext.id)} className="text-green-600 hover:text-green-800 mr-2">Save</button>
                                <button onClick={() => setEditingExtraction(null)} className="text-gray-600">Cancel</button></>
                              ) : (
                                <button onClick={() => { setEditingExtraction(ext.id); setEditValue(ext.measurement_value ?? ext.value) }}
                                  className="text-primary-600 hover:text-primary-800">Edit</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button onClick={() => regenerateConditions(plan.id)}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                      Regenerate Conditions
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    {['processing', 'pending'].includes(plan.upload_status || plan.status) ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-blue-600 font-medium">
                            {progressMap[plan.id]?.progress_message || 'Analysis in progress...'}
                          </span>
                        </div>
                        {progressMap[plan.id]?.detected_scale && (
                          <p className="text-xs text-green-600">Scale detected: {progressMap[plan.id].detected_scale}</p>
                        )}
                        <p className="text-xs text-gray-400">This may take several minutes for large plans</p>
                      </div>
                    ) : 'No extractions found.'}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
