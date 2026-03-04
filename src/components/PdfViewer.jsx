import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// Build file source with auth headers for protected backend URLs
function getAuthenticatedFile(url) {
  if (!url) return null
  const token = localStorage.getItem('authToken')
  if (token && !url.startsWith('blob:')) {
    return {
      url,
      httpHeaders: { Authorization: `Bearer ${token}` },
    }
  }
  return url
}

export default function PdfViewer({ url, onClose }) {
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const mainRef = useRef(null)
  const containerRef = useRef(null)
  const thumbRefs = useRef({})

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
    setLoadError(null)
  }

  const onDocumentLoadError = (error) => {
    setLoadError('Failed to load PDF. The file may be corrupted or inaccessible.')
    setLoading(false)
  }

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3.0))
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.25))
  const zoomFit = () => setScale(1.0)
  const zoomActual = () => setScale(1.5)

  // Page navigation
  const goToPage = useCallback((page) => {
    const p = Math.max(1, Math.min(page, numPages || 1))
    setCurrentPage(p)
  }, [numPages])

  const prevPage = () => goToPage(currentPage - 1)
  const nextPage = () => goToPage(currentPage + 1)

  // Scroll thumbnail into view
  useEffect(() => {
    const thumb = thumbRefs.current[currentPage]
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentPage])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage() }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      if (e.key === '-') { e.preventDefault(); zoomOut() }
      if (e.key === 'Escape' && onClose) { onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentPage, numPages])

  const fileSource = useMemo(() => getAuthenticatedFile(url), [url])

  if (!url) return null

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-gray-900 rounded-xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[700px]'
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700 flex-shrink-0">
        {/* Left: sidebar toggle + page info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Toggle thumbnails"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <span className="text-sm text-gray-300">
            Page <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 mx-1 px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-center text-white text-sm"
            /> of {numPages || '...'}
          </span>
          <div className="flex items-center space-x-1">
            <button onClick={prevPage} disabled={currentPage <= 1}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-700"
              title="Previous page">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={nextPage} disabled={currentPage >= (numPages || 1)}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-700"
              title="Next page">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center: zoom controls */}
        <div className="flex items-center space-x-2">
          <button onClick={zoomOut}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Zoom out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-300 w-14 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Zoom in">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={zoomFit}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Fit to width">Fit</button>
          <button onClick={zoomActual}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Actual size">150%</button>
        </div>

        {/* Right: fullscreen + close */}
        <div className="flex items-center space-x-2">
          <button onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              )}
            </svg>
          </button>
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Close viewer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main area: sidebar + page view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Sidebar */}
        {sidebarOpen && (
          <div className="w-48 bg-gray-850 border-r border-gray-700 overflow-y-auto flex-shrink-0"
               style={{ backgroundColor: '#1a1d23' }}>
            <div className="p-2 space-y-2">
              <Document file={fileSource} onLoadSuccess={() => {}} loading="">
                {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    ref={(el) => { thumbRefs.current[pageNum] = el }}
                    onClick={() => goToPage(pageNum)}
                    className={`cursor-pointer rounded-lg p-1.5 transition-all ${
                      currentPage === pageNum
                        ? 'bg-primary-600 ring-2 ring-primary-400'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <div className="bg-white rounded shadow-sm overflow-hidden">
                      <Page
                        pageNumber={pageNum}
                        width={156}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                    <p className={`text-xs text-center mt-1 ${
                      currentPage === pageNum ? 'text-white font-medium' : 'text-gray-400'
                    }`}>
                      {pageNum}
                    </p>
                  </div>
                ))}
              </Document>
            </div>
          </div>
        )}

        {/* Main Page View */}
        <div ref={mainRef} className="flex-1 overflow-auto bg-gray-600 flex justify-center"
             style={{ backgroundColor: '#4a4d52' }}>
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="animate-spin mx-auto h-8 w-8 text-white mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-300 text-sm">Loading PDF...</p>
              </div>
            </div>
          )}

          {loadError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <svg className="mx-auto h-12 w-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300 font-medium">{loadError}</p>
                <a href={url} target="_blank" rel="noopener noreferrer"
                   className="inline-block mt-3 text-sm text-primary-400 hover:text-primary-300 underline">
                  Open PDF in new tab instead
                </a>
              </div>
            </div>
          )}

          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <div className="py-4 px-2">
              <div className="bg-white shadow-2xl mx-auto" style={{ width: 'fit-content' }}>
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            </div>
          </Document>
        </div>
      </div>
    </div>
  )
    }
