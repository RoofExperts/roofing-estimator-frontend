import { useState, useRef } from 'react'
import { projectAPI } from '../api'

export default function SpecificationsTab({ projectId, project, onProjectUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleUpload = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    setUploading(true)
    setError('')
    try {
      await projectAPI.uploadSpec(projectId, file)
      if (onProjectUpdate) onProjectUpdate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload specification')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleUpload(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    handleUpload(file)
  }

  const specUrl = project?.spec_file_url
  const hasSpec = !!specUrl

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Specifications</h2>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-white'
        }`}
      >
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 mb-2">
          {hasSpec ? 'Upload a new specification to replace the current one, or' : 'Drag and drop a PDF specification here, or'}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </>
          ) : 'Browse Files'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Current Spec Display */}
      {hasSpec && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Specification Uploaded
          </h3>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-10 h-10 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Specification Document</p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
            </div>
            <a
              href={specUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View PDF
            </a>
          </div>

          {/* Analysis Status */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
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
                   project?.analysis_status === 'failed' ? 'Failed' :
                   'Not Started'}
                </span>
              </div>
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
