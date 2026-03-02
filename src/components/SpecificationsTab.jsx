import { useState, useRef } from 'react'
import { projectAPI } from '../api'
import PdfViewer from './PdfViewer'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://roof-estimator-backend.onrender.com'

export default function SpecificationsTab({ project, onProjectUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const fileInputRef = useRef(null)

  const hasSpec = project?.spec_file_url
  const specUrl = hasSpec ? project.spec_file_url : null
  const proxyUrl = project?.id ? `${API_BASE_URL}/projects/${project.id}/spec-file` : null

  const handleUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }
    setUploading(true)
    setError('')
    try {
      await projectAPI.uploadSpec(project.id, file)
      if (onProjectUpdate) onProjectUpdate()
    } catch (err) {
      setError('Failed to upload specification')
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>
        {hasSpec && (
          <button
            onClick={() => setShowViewer(!showViewer)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showViewer
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {showViewer ? 'Hide Viewer' : 'View Specification'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">x</button>
        </div>
      )}

      {showViewer && hasSpec && (
        <div className="mb-6">
          <PdfViewer url={proxyUrl} onClose={() => setShowViewer(false)} />
        </div>
      )}

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
          {uploading ? 'Uploading...' : hasSpec ? 'Upload a new specification to replace the current one, or' : 'Drag and drop a PDF specification here, or'}
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

      {hasSpec && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Specification Uploaded</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowViewer(true)}
                className="inline-flex items-center px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View PDF
              </button>
              <a
                href={specUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                New Tab
              </a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <span className="text-gray-500 mr-2">Analysis Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project?.analysis_status === 'complete' ? 'bg-green-100 text-green-800' :
                project?.analysis_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                project?.analysis_status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project?.analysis_status === 'complete' ? 'Complete' :
                  project?.analysis_status === 'processing' ? 'Processing...' :
                  project?.analysis_status === 'failed' ? 'Failed' : 'Not Started'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!hasSpec && (
        <p className="mt-4 text-center text-sm text-gray-500">
          No specification uploaded yet. Upload a PDF to get started.
        </p>
      )}
    </div>
  )
    }
