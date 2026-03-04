import { useState, useEffect, useCallback } from 'react'
import { conditionAPI, referenceAPI, planAPI, projectAPI } from '../api'
import { LoadingSpinner, ErrorDisplay } from './common'
import Modal from './Modal'

// ============================================================================
// PLAN ANALYSIS SECTION
// ============================================================================
function PlanAnalysisSection({ projectId, onConditionsChanged }) {
  const [planFiles, setPlanFiles] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [extractions, setExtractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingConditions, setGeneratingConditions] = useState(false)
  const [pollingId, setPollingId] = useState(null)
  const [editingExtraction, setEditingExtraction] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [error, setError] = useState('')

  const fetchPlans = useCallback(async () => {
    try {
      const res = await planAPI.list(projectId)
      const plans = res.data || []
      setPlanFiles(plans)

      // Auto-select first plan if none selected
      if (plans.length > 0 && !selectedPlan) {
        setSelectedPlan(plans[0])
      }
    } catch (err) {
      // Plans endpoint may not exist yet, that's okay
      setPlanFiles([])
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedPlan])

  const fetchExtractions = useCallback(async (planFileId) => {
    try {
      const res = await planAPI.extractions(planFileId)
      setExtractions(res.data || [])
    } catch (err) {
      setExtractions([])
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    if (selectedPlan?.id) {
      fetchExtractions(selectedPlan.id)
    }
  }, [selectedPlan, fetchExtractions])

  // Poll for analysis status when a plan is being analyzed
  useEffect(() => {
    if (!pollingId) return

    const interval = setInterval(async () => {
      try {
        const res = await planAPI.status(pollingId)
        const status = res.data?.status

        if (status === 'completed' || status === 'failed') {
          clearInterval(interval)
          setPollingId(null)
          setAnalyzing(false)
          fetchPlans()
          fetchExtractions(pollingId)

          if (status === 'failed') {
            setError(`Analysis failed: ${res.data?.error_message || 'Unknown error'}`)
          }
        }
      } catch (err) {
        // Keep polling on network errors
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [pollingId, fetchPlans, fetchExtractions])

  const handleAnalyzePlan = async (planFile) => {
    setAnalyzing(true)
    setError('')

    // If the plan is already uploaded but pending, we just need to poll
    // The backend auto-starts analysis on upload
    if (planFile.upload_status === 'pending' || planFile.upload_status === 'processing') {
      setPollingId(planFile.id)
      return
    }

    // For completed plans, trigger re-analysis
    try {
      await planAPI.reanalyze(planFile.id)
      setPollingId(planFile.id)
    } catch (err) {
      setError('Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const handleGenerateConditions = async () => {
    if (!selectedPlan) return
    setGeneratingConditions(true)
    setError('')

    try {
      const res = await planAPI.regenerateConditions(selectedPlan.id)
      // Refresh extractions to see linked condition IDs
      await fetchExtractions(selectedPlan.id)
      // Notify parent to refresh conditions list
      onConditionsChanged()
    } catch (err) {
      setError('Failed to generate conditions from extractions')
    } finally {
      setGeneratingConditions(false)
    }
  }

  const handleEditExtraction = (extraction) => {
    setEditingExtraction(extraction.id)
    setEditValues({
      measurement_value: extraction.measurement_value,
      measurement_unit: extraction.measurement_unit,
      notes: extraction.notes || ''
    })
  }

  const handleSaveExtraction = async (extractionId) => {
    try {
      await planAPI.updateExtraction(extractionId, {
        measurement_value: parseFloat(editValues.measurement_value),
        measurement_unit: editValues.measurement_unit,
        notes: editValues.notes
      })
      setEditingExtraction(null)
      fetchExtractions(selectedPlan.id)
    } catch (err) {
      setError('Failed to update extraction')
    }
  }

  const handleDeleteExtraction = async (extractionId) => {
    if (!window.confirm('Delete this extraction and its linked condition?')) return
    try {
      await planAPI.deleteExtraction(extractionId)
      fetchExtractions(selectedPlan.id)
      onConditionsChanged()
    } catch (err) {
      setError('Failed to delete extraction')
    }
  }

  if (loading) return <LoadingSpinner />

  // No plans uploaded yet
  if (planFiles.length === 0) {
    return (
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            No roof plans uploaded yet. Go to the <strong>Plans</strong> tab to upload architectural plans, then come back here to analyze and build conditions.
          </p>
        </div>
      </div>
    )
  }

  const pendingExtractions = extractions.filter(e => !e.condition_id)
  const linkedExtractions = extractions.filter(e => e.condition_id)
  const isPlanProcessing = selectedPlan && (selectedPlan.upload_status === 'pending' || selectedPlan.upload_status === 'processing')

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Plan Analysis
        </h3>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Plan File Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">Select Plan File</label>
          {selectedPlan && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              selectedPlan.upload_status === 'completed' ? 'bg-green-100 text-green-800' :
              selectedPlan.upload_status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {selectedPlan.upload_status === 'completed' ? 'Analyzed' :
               selectedPlan.upload_status === 'failed' ? 'Failed' :
               'Processing...'}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <select
            value={selectedPlan?.id || ''}
            onChange={(e) => {
              const plan = planFiles.find(p => p.id === parseInt(e.target.value))
              setSelectedPlan(plan || null)
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {planFiles.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.file_name} — {plan.upload_status}
                {plan.page_count ? ` (${plan.page_count} pages)` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => selectedPlan && handleAnalyzePlan(selectedPlan)}
            disabled={analyzing || !selectedPlan || isPlanProcessing}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              analyzing || !selectedPlan || isPlanProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {analyzing || isPlanProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyze Plans
              </>
            )}
          </button>
        </div>

        {/* Plan details */}
        {selectedPlan && selectedPlan.upload_status === 'completed' && (
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            {selectedPlan.page_count && <span>{selectedPlan.page_count} pages</span>}
            {selectedPlan.detected_scale && <span>Scale: {selectedPlan.detected_scale}</span>}
            <span>{extractions.length} extractions found</span>
            <span>{linkedExtractions.length} linked to conditions</span>
          </div>
        )}
      </div>

      {/* Extractions List */}
      {extractions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Extracted Measurements ({extractions.length})
            </h4>
            {pendingExtractions.length > 0 && (
              <button
                onClick={handleGenerateConditions}
                disabled={generatingConditions}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  generatingConditions
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {generatingConditions ? (
                  <>
                    <svg className="animate-spin w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Generate Conditions ({pendingExtractions.length})
                  </>
                )}
              </button>
            )}
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Measurement</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {extractions.map((ext) => (
                <tr key={ext.id} className={`hover:bg-gray-50 ${ext.condition_id ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {ext.extraction_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {editingExtraction === ext.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.measurement_value}
                        onChange={(e) => setEditValues({...editValues, measurement_value: e.target.value})}
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      ext.measurement_value?.toLocaleString()
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {editingExtraction === ext.id ? (
                      <select
                        value={editValues.measurement_unit}
                        onChange={(e) => setEditValues({...editValues, measurement_unit: e.target.value})}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="sqft">SF</option>
                        <option value="lnft">LF</option>
                        <option value="each">EA</option>
                      </select>
                    ) : (
                      ext.measurement_unit
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {ext.confidence_score != null && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        ext.confidence_score >= 0.8 ? 'bg-green-100 text-green-800' :
                        ext.confidence_score >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(ext.confidence_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={ext.source_description}>
                    {ext.source_description || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {ext.condition_id ? (
                      <span className="inline-flex items-center text-xs text-green-700">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-yellow-700">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm space-x-2">
                    {editingExtraction === ext.id ? (
                      <>
                        <button
                          onClick={() => handleSaveExtraction(ext.id)}
                          className="text-green-600 hover:text-green-800 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingExtraction(null)}
                          className="text-gray-600 hover:text-gray-800 text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditExtraction(ext)}
                          className="text-primary-600 hover:text-primary-800 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExtraction(ext.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No extractions message for completed plans */}
      {selectedPlan?.upload_status === 'completed' && extractions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            Analysis completed but no roofing measurements were extracted. The plan may not contain recognizable roof details, or you can try re-uploading with a clearer scan.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DIVIDER
// ============================================================================
function SectionDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-gray-50 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
          Manual Conditions
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN CONDITIONS TAB
// ============================================================================
export default function ConditionsTab({ projectId }) {
  const [conditions, setConditions] = useState([])
  const [conditionTypes, setConditionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [smartBuilding, setSmartBuilding] = useState(false)
  const [smartBuildResult, setSmartBuildResult] = useState(null)
  const [projectData, setProjectData] = useState(null)
  const [newCondition, setNewCondition] = useState({
    condition_type: '',
    measurement_value: '',
    measurement_unit: 'sqft',
    wind_zone: '1'
  })

  const fetchConditions = useCallback(async () => {
    try {
      const [condRes, typesRes, projRes] = await Promise.all([
        conditionAPI.list(projectId),
        referenceAPI.conditionTypes().catch(() => ({ data: { condition_types: [] } })),
        projectAPI.get(projectId).catch(() => ({ data: null }))
      ])
      setConditions(condRes.data)
      setConditionTypes(typesRes.data?.condition_types || typesRes.data || [])
      setProjectData(projRes.data)
    } catch (err) {
      setError('Failed to load conditions')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleSmartBuild = async () => {
    setSmartBuilding(true)
    setError('')
    setSmartBuildResult(null)
    try {
      const res = await conditionAPI.smartBuild(projectId)
      setSmartBuildResult(res.data)
      fetchConditions()
    } catch (err) {
      setError('Smart Build failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSmartBuilding(false)
    }
  }

  useEffect(() => {
    fetchConditions()
  }, [fetchConditions])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await conditionAPI.create(projectId, {
        ...newCondition,
        measurement_value: parseFloat(newCondition.measurement_value)
      })
      setShowAddModal(false)
      setNewCondition({ condition_type: '', measurement_value: '', measurement_unit: 'sqft', wind_zone: '1' })
      fetchConditions()
    } catch (err) {
      setError('Failed to add condition')
    }
  }

  const startEdit = (condition) => {
    setEditingId(condition.id)
    setEditValues({
      measurement_value: condition.measurement_value,
      measurement_unit: condition.measurement_unit,
      wind_zone: condition.wind_zone
    })
  }

  const saveEdit = async (id) => {
    try {
      await conditionAPI.update(id, {
        ...editValues,
        measurement_value: parseFloat(editValues.measurement_value)
      })
      setEditingId(null)
      fetchConditions()
    } catch (err) {
      setError('Failed to update condition')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this condition?')) return
    try {
      await conditionAPI.delete(id)
      fetchConditions()
    } catch (err) {
      setError('Failed to delete condition')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Plan Analysis Section */}
      <PlanAnalysisSection
        projectId={projectId}
        onConditionsChanged={fetchConditions}
      />

      {/* Smart Build Section */}
      <div className="my-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-blue-900 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Smart Build Conditions
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Reads your spec analysis + plan extractions to automatically detect the roofing system
              (TPO/EPDM/PVC), build conditions with the right materials, and estimate perimeter from roof area.
            </p>
            {projectData && (
              <div className="mt-2 flex gap-3 text-xs text-blue-600">
                <span>System: <strong>{projectData.system_type || 'Auto-detect'}</strong></span>
                <span>Spec: <strong>{projectData.analysis_status === 'complete' ? 'Analyzed' : projectData.analysis_status || 'None'}</strong></span>
              </div>
            )}
          </div>
          <button
            onClick={handleSmartBuild}
            disabled={smartBuilding}
            className={`ml-4 inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              smartBuilding
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {smartBuilding ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Building...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Build
              </>
            )}
          </button>
        </div>

        {/* Smart Build Results */}
        {smartBuildResult && (
          <div className="mt-4 bg-white/80 rounded-lg border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-blue-900">
                Build Result: {smartBuildResult.system_type} System
              </h4>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                {smartBuildResult.conditions_created} conditions created
              </span>
            </div>

            {/* Spec Summary */}
            {smartBuildResult.spec_data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {smartBuildResult.spec_data.membrane && (
                  <div className="text-xs"><span className="text-gray-500">Membrane:</span> <strong>{smartBuildResult.spec_data.membrane}</strong></div>
                )}
                {smartBuildResult.spec_data.thickness && (
                  <div className="text-xs"><span className="text-gray-500">Thickness:</span> <strong>{smartBuildResult.spec_data.thickness}</strong></div>
                )}
                {smartBuildResult.spec_data.attachment && (
                  <div className="text-xs"><span className="text-gray-500">Attachment:</span> <strong>{smartBuildResult.spec_data.attachment}</strong></div>
                )}
                {smartBuildResult.spec_data.insulation && (
                  <div className="text-xs"><span className="text-gray-500">Insulation:</span> <strong>{smartBuildResult.spec_data.insulation}</strong></div>
                )}
                {smartBuildResult.spec_data.cover_board && (
                  <div className="text-xs"><span className="text-gray-500">Cover Board:</span> <strong>{smartBuildResult.spec_data.cover_board}</strong></div>
                )}
                {smartBuildResult.spec_data.warranty && (
                  <div className="text-xs"><span className="text-gray-500">Warranty:</span> <strong>{smartBuildResult.spec_data.warranty} yr</strong></div>
                )}
                {smartBuildResult.spec_data.manufacturer && (
                  <div className="text-xs col-span-2"><span className="text-gray-500">Manufacturer:</span> <strong>{
                    Array.isArray(smartBuildResult.spec_data.manufacturer)
                      ? smartBuildResult.spec_data.manufacturer.join(', ')
                      : smartBuildResult.spec_data.manufacturer
                  }</strong></div>
                )}
              </div>
            )}

            {/* Created Conditions Preview */}
            {smartBuildResult.conditions && smartBuildResult.conditions.length > 0 && (
              <div className="space-y-1">
                {smartBuildResult.conditions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                    <span className="font-medium text-gray-700">{c.type}</span>
                    <span className="text-gray-500">{c.extraction_type}</span>
                    <span className="font-mono text-gray-900">{c.value?.toLocaleString()} {c.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SectionDivider />

      {/* Manual Conditions Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roof Conditions</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Condition
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {conditions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No conditions yet. Analyze a plan above or add conditions manually.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Measurement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wind Zone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conditions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.condition_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                    {c.description || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.measurement_value}
                        onChange={(e) => setEditValues({...editValues, measurement_value: e.target.value})}
                        className="w-24 px-2 py-1 border rounded"
                      />
                    ) : (
                      c.measurement_value?.toLocaleString()
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <select
                        value={editValues.measurement_unit}
                        onChange={(e) => setEditValues({...editValues, measurement_unit: e.target.value})}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="sqft">SF</option>
                        <option value="lnft">LF</option>
                        <option value="each">EA</option>
                      </select>
                    ) : (
                      c.measurement_unit
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <select
                        value={editValues.wind_zone}
                        onChange={(e) => setEditValues({...editValues, wind_zone: e.target.value})}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="1">Zone 1</option>
                        <option value="2">Zone 2</option>
                        <option value="3">Zone 3</option>
                      </select>
                    ) : (
                      c.wind_zone ? `Zone ${c.wind_zone}` : '—'
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    {editingId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} className="text-green-600 hover:text-green-800">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="text-primary-600 hover:text-primary-800">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Conditions Summary */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">{conditions.length} condition{conditions.length !== 1 ? 's' : ''} total</span>
            <div className="flex gap-3 text-xs text-gray-500">
              {(() => {
                const totalSF = conditions
                  .filter(c => c.measurement_unit === 'sqft')
                  .reduce((sum, c) => sum + (c.measurement_value || 0), 0)
                const totalLF = conditions
                  .filter(c => c.measurement_unit === 'lnft')
                  .reduce((sum, c) => sum + (c.measurement_value || 0), 0)
                const totalEA = conditions
                  .filter(c => c.measurement_unit === 'each')
                  .reduce((sum, c) => sum + (c.measurement_value || 0), 0)
                return (
                  <>
                    {totalSF > 0 && <span>{totalSF.toLocaleString()} SF</span>}
                    {totalLF > 0 && <span>{totalLF.toLocaleString()} LF</span>}
                    {totalEA > 0 && <span>{totalEA.toLocaleString()} EA</span>}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Condition Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Condition">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Type *</label>
            <select
              required
              value={newCondition.condition_type}
              onChange={(e) => setNewCondition({...newCondition, condition_type: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select type...</option>
              {conditionTypes.length > 0 ? (
                conditionTypes.map(t => <option key={t} value={t}>{t}</option>)
              ) : (
                <>
                  <option value="field_of_roof">Field of Roof</option>
                  <option value="perimeter">Perimeter</option>
                  <option value="corners">Corners</option>
                  <option value="penetrations">Penetrations</option>
                  <option value="drains">Drains</option>
                  <option value="scuppers">Scuppers</option>
                  <option value="curbs">Curbs</option>
                  <option value="parapets">Parapets</option>
                  <option value="expansion_joints">Expansion Joints</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={newCondition.description || ''}
              onChange={(e) => setNewCondition({...newCondition, description: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Main roof field area"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newCondition.measurement_value}
                onChange={(e) => setNewCondition({...newCondition, measurement_value: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select
                value={newCondition.measurement_unit}
                onChange={(e) => setNewCondition({...newCondition, measurement_unit: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="sqft">SF (Square Feet)</option>
                <option value="lnft">LF (Linear Feet)</option>
                <option value="each">EA (Each)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Wind Zone</label>
            <select
              value={newCondition.wind_zone}
              onChange={(e) => setNewCondition({...newCondition, wind_zone: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1">Zone 1 (Field)</option>
              <option value="2">Zone 2 (Perimeter)</option>
              <option value="3">Zone 3 (Corner)</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Add Condition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
