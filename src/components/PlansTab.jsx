import { useState, useEffect, useRef } from 'react'
import { planAPI } from '../api'
import { LoadingSpinner, StatusBadge } from './common'

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

  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }
    setUploading(true)
    setError('')
    try {
      await planAPI.upload(projectId, file)
      fetchPlans()
    } catch (err) {
      setError('Failed to upload plan')
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
      await planAPI.updateExtraction(extractionId, { value: parseFloat(editValue) })
      setEditingExtraction(null)
      if (expandedPlan) fetchExtractions(expandedPlan)
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

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">x</button>
        </div>
      )}

      {/* Upload Area */}
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
          {uploading ? 'Uploading...' : 'Drag and drop a PDF roof plan here, or'}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]) }}
        />
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No plans uploaded yet.</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => fetchExtractions(plan.id)}
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{plan.filename || `Plan #${plan.id}`}</p>
                    <p className="text-xs text-gray-500">{plan.page_count || '?'} pages</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={plan.status} />
                  <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedPlan === plan.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="border-t border-gray-200 p-4">
                  {extractions[plan.id]?.length > 0 ? (
                    <>
                      <table className="min-w-full divide-y divide-gray-200 mb-4">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {extractions[plan.id].map((ext) => (
                            <tr key={ext.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{ext.extraction_type || ext.type}</td>
                              <td className="px-4 py-2 text-sm">
                                {editingExtraction === ext.id ? (
                                  <input type="number" value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-24 px-2 py-1 border rounded text-sm" />
                                ) : (
                                  <span className="text-gray-700">{ext.value}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">{ext.unit}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`${ext.confidence >= 0.8 ? 'text-green-600' : ext.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {Math.round((ext.confidence || 0) * 100)}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-sm">
                                {editingExtraction === ext.id ? (
                                  <>
                                    <button onClick={() => updateExtraction(ext.id)} className="text-green-600 hover:text-green-800 mr-2">Save</button>
                                    <button onClick={() => setEditingExtraction(null)} className="text-gray-600">Cancel</button>
                                  </>
                                ) : (
                                  <button onClick={() => { setEditingExtraction(ext.id); setEditValue(ext.value) }}
                                    className="text-primary-600 hover:text-primary-800">Edit</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() => regenerateConditions(plan.id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Regenerate Conditions
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {plan.status === 'processing' ? 'Analysis in progress...' : 'No extractions found.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
    }
