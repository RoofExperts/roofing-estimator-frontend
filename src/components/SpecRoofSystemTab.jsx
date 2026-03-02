import { useState } from 'react'
import { projectAPI } from '../api'

export default function SpecRoofSystemTab({ projectId, project, onProjectUpdate }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const analysisStatus = project?.analysis_status || 'not_started'
  const hasSpec = !!project?.spec_file_url
  let analysisResult = null

  if (project?.analysis_result) {
    try {
      analysisResult = typeof project.analysis_result === 'string'
        ? JSON.parse(project.analysis_result)
        : project.analysis_result
    } catch {
      analysisResult = { raw: project.analysis_result }
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      await projectAPI.analyzeSpec(projectId)
      if (onProjectUpdate) onProjectUpdate()
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const res = await projectAPI.get(projectId)
          if (res.data.analysis_status !== 'processing') {
            clearInterval(poll)
            setAnalyzing(false)
            if (onProjectUpdate) onProjectUpdate()
          }
        } catch {
          clearInterval(poll)
          setAnalyzing(false)
        }
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const isProcessing = analysisStatus === 'processing' || analyzing

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Spec Roof System</h2>
        {hasSpec && analysisStatus !== 'processing' && (
          <button
            onClick={handleAnalyze}
            disabled={isProcessing}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {analysisStatus === 'complete' ? 'Re-Analyze' : 'Analyze Specification'}
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* No spec uploaded */}
      {!hasSpec && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium mb-1">No Specification Uploaded</p>
          <p className="text-sm text-gray-500">Upload a specification in the Specifications tab first, then come back here to analyze it.</p>
        </div>
      )}

      {/* Processing state */}
      {hasSpec && isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <svg className="animate-spin mx-auto h-10 w-10 text-yellow-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-yellow-800 font-medium mb-1">Analyzing Specification...</p>
          <p className="text-sm text-yellow-600">ChatGPT is reading your specification and identifying the roof system. This may take a minute.</p>
        </div>
      )}

      {/* Failed state */}
      {hasSpec && analysisStatus === 'failed' && !isProcessing && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-medium mb-1">Analysis Failed</p>
          <p className="text-sm text-red-600 mb-3">Something went wrong analyzing the specification. Please try again.</p>
        </div>
      )}

      {/* Not started state */}
      {hasSpec && analysisStatus === 'not_started' && !isProcessing && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-primary-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-gray-700 font-medium mb-1">Ready to Analyze</p>
          <p className="text-sm text-gray-500 mb-4">Your specification has been uploaded. Click the button above to have AI analyze it and identify the roof system.</p>
        </div>
      )}

      {/* Results */}
      {hasSpec && analysisStatus === 'complete' && analysisResult && !isProcessing && (
        <div className="space-y-4">
          {/* Main result card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
              <h3 className="text-md font-semibold text-primary-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Identified Roof System
              </h3>
            </div>
            <div className="p-6">
              {/* If result is a structured object */}
              {analysisResult.roof_system && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Roof System Type</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{analysisResult.roof_system}</p>
                </div>
              )}

              {analysisResult.manufacturer && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Manufacturer</span>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{analysisResult.manufacturer}</p>
                </div>
              )}

              {analysisResult.membrane_type && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Membrane Type</span>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{analysisResult.membrane_type}</p>
                </div>
              )}

              {analysisResult.insulation && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Insulation</span>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{analysisResult.insulation}</p>
                </div>
              )}

              {analysisResult.attachment && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Attachment Method</span>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{analysisResult.attachment}</p>
                </div>
              )}

              {analysisResult.warranty && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Warranty</span>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{analysisResult.warranty}</p>
                </div>
              )}

              {/* Components list */}
              {analysisResult.components && Array.isArray(analysisResult.components) && (
                <div className="mt-4">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">System Components</span>
                  <ul className="mt-2 space-y-2">
                    {analysisResult.components.map((comp, i) => (
                      <li key={i} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{typeof comp === 'string' ? comp : comp.name || JSON.stringify(comp)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary / notes */}
              {analysisResult.summary && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Summary</span>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{analysisResult.summary}</p>
                </div>
              )}

              {analysisResult.notes && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-yellow-700 uppercase tracking-wide">Notes</span>
                  <p className="text-yellow-800 mt-1 whitespace-pre-wrap">{analysisResult.notes}</p>
                </div>
              )}

              {/* Raw fallback if no structured fields */}
              {analysisResult.raw && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Analysis Result</span>
                  <pre className="text-gray-700 mt-2 whitespace-pre-wrap text-sm font-mono">{analysisResult.raw}</pre>
                </div>
              )}

              {/* Catch-all for unknown structures */}
              {!analysisResult.roof_system && !analysisResult.summary && !analysisResult.raw && !analysisResult.components && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Analysis Result</span>
                  <pre className="text-gray-700 mt-2 whitespace-pre-wrap text-sm font-mono">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
        }
