import { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// ============================================================================
// TOOL TYPES
// ============================================================================
const TOOLS = {
  PAN: 'pan',
  MEASURE: 'measure',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  FREEHAND: 'freehand',
  ERASER: 'eraser',
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff']
const STROKE_WIDTHS = [1, 2, 3, 5, 8]

// ============================================================================
// HELPER: Calculate distance given scale
// ============================================================================
function calcRealDistance(px1, py1, px2, py2, scaleRatio) {
  const pxDist = Math.sqrt((px2 - px1) ** 2 + (py2 - py1) ** 2)
  return pxDist * scaleRatio
}

function formatDistance(ft) {
  if (ft < 1) return `${(ft * 12).toFixed(1)}"`
  const wholeFeet = Math.floor(ft)
  const inches = Math.round((ft - wholeFeet) * 12)
  if (inches === 0) return `${wholeFeet}'`
  if (inches === 12) return `${wholeFeet + 1}'`
  return `${wholeFeet}'-${inches}"`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PdfMarkupViewer({ url, onClose, onSaveMeasurements }) {
  // PDF state
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.PAN)
  const [strokeColor, setStrokeColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Scale calibration state
  const [scaleMode, setScaleMode] = useState(false) // true = user is setting the scale
  const [scalePoints, setScalePoints] = useState([]) // [{x, y}] during calibration
  const [scaleKnownDist, setScaleKnownDist] = useState('') // ft
  const [scaleRatio, setScaleRatio] = useState(null) // ft per CSS-px (at current zoom)
  const [scaleBaseZoom, setScaleBaseZoom] = useState(1.0) // scale value when calibrated

  // Annotations & measurements (per page)
  const [annotations, setAnnotations] = useState({}) // { pageNum: [...shapes] }
  const [measurements, setMeasurements] = useState({}) // { pageNum: [...measurements] }

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [currentPos, setCurrentPos] = useState(null)
  const [freehandPoints, setFreehandPoints] = useState([])

  // Text input state
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState(null)
  const [showTextInput, setShowTextInput] = useState(false)

  // Pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState(null)

  // Refs
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  const pageWrapperRef = useRef(null)
  const thumbRefs = useRef({})

  // ============================================================================
  // PDF CALLBACKS
  // ============================================================================
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
    setLoadError(null)
  }

  const onDocumentLoadError = () => {
    setLoadError('Failed to load PDF.')
    setLoading(false)
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages || 1)))
  }, [numPages])

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 4.0))
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.25))

  // ============================================================================
  // FULLSCREEN
  // ============================================================================
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ============================================================================
  // GET MOUSE POSITION RELATIVE TO PAGE
  // ============================================================================
  const getCanvasPos = useCallback((e) => {
    const wrapper = pageWrapperRef.current
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // ============================================================================
  // SCALE CALIBRATION
  // ============================================================================
  const startScaleCalibration = () => {
    setScaleMode(true)
    setScalePoints([])
    setScaleKnownDist('')
    setActiveTool(TOOLS.MEASURE)
  }

  const finishCalibration = () => {
    if (scalePoints.length === 2 && scaleKnownDist > 0) {
      const pxDist = Math.sqrt(
        (scalePoints[1].x - scalePoints[0].x) ** 2 +
        (scalePoints[1].y - scalePoints[0].y) ** 2
      )
      const ratio = parseFloat(scaleKnownDist) / pxDist
      setScaleRatio(ratio)
      setScaleBaseZoom(scale)
      setScaleMode(false)
    }
  }

  const cancelCalibration = () => {
    setScaleMode(false)
    setScalePoints([])
    setScaleKnownDist('')
  }

  // Adjusted scale ratio for current zoom
  const effectiveScaleRatio = scaleRatio ? scaleRatio * (scaleBaseZoom / scale) : null

  // ============================================================================
  // MOUSE HANDLERS
  // ============================================================================
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const pos = getCanvasPos(e)
    if (!pos) return

    // Scale calibration mode
    if (scaleMode) {
      setScalePoints(prev => {
        if (prev.length < 2) return [...prev, pos]
        return [pos] // restart
      })
      return
    }

    if (activeTool === TOOLS.PAN) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      return
    }

    if (activeTool === TOOLS.TEXT) {
      setTextPos(pos)
      setShowTextInput(true)
      setTextInput('')
      return
    }

    if (activeTool === TOOLS.ERASER) {
      eraseAt(pos)
      return
    }

    setIsDrawing(true)
    setDrawStart(pos)
    setCurrentPos(pos)

    if (activeTool === TOOLS.FREEHAND) {
      setFreehandPoints([pos])
    }
  }, [activeTool, scaleMode, getCanvasPos, panOffset, scale])

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }

    if (!isDrawing) return
    const pos = getCanvasPos(e)
    if (!pos) return
    setCurrentPos(pos)

    if (activeTool === TOOLS.FREEHAND) {
      setFreehandPoints(prev => [...prev, pos])
    }
  }, [isDrawing, isPanning, panStart, activeTool, getCanvasPos])

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      return
    }

    if (!isDrawing || !drawStart) {
      setIsDrawing(false)
      return
    }

    const pos = getCanvasPos(e)
    if (!pos) { setIsDrawing(false); return }

    const page = currentPage

    if (activeTool === TOOLS.MEASURE) {
      const newMeasurement = {
        id: Date.now(),
        type: 'measure',
        x1: drawStart.x, y1: drawStart.y,
        x2: pos.x, y2: pos.y,
        color: strokeColor,
        width: strokeWidth,
        zoomAtCreation: scale,
      }
      setMeasurements(prev => ({
        ...prev,
        [page]: [...(prev[page] || []), newMeasurement]
      }))
    } else if (activeTool === TOOLS.FREEHAND) {
      const newShape = {
        id: Date.now(),
        type: 'freehand',
        points: [...freehandPoints],
        color: strokeColor,
        width: strokeWidth,
        zoomAtCreation: scale,
      }
      setAnnotations(prev => ({
        ...prev,
        [page]: [...(prev[page] || []), newShape]
      }))
      setFreehandPoints([])
    } else if ([TOOLS.LINE, TOOLS.RECT, TOOLS.CIRCLE, TOOLS.ARROW].includes(activeTool)) {
      const newShape = {
        id: Date.now(),
        type: activeTool,
        x1: drawStart.x, y1: drawStart.y,
        x2: pos.x, y2: pos.y,
        color: strokeColor,
        width: strokeWidth,
        zoomAtCreation: scale,
      }
      setAnnotations(prev => ({
        ...prev,
        [page]: [...(prev[page] || []), newShape]
      }))
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentPos(null)
  }, [isDrawing, drawStart, activeTool, currentPage, strokeColor, strokeWidth, freehandPoints, scale, getCanvasPos])

  // ============================================================================
  // TEXT PLACEMENT
  // ============================================================================
  const placeText = () => {
    if (!textInput.trim() || !textPos) return
    const newShape = {
      id: Date.now(),
      type: 'text',
      x: textPos.x, y: textPos.y,
      text: textInput,
      color: strokeColor,
      fontSize: strokeWidth * 5 + 10,
      zoomAtCreation: scale,
    }
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newShape]
    }))
    setShowTextInput(false)
    setTextInput('')
    setTextPos(null)
  }

  // ============================================================================
  // ERASER
  // ============================================================================
  const eraseAt = (pos) => {
    const page = currentPage
    const threshold = 15

    // Check annotations
    setAnnotations(prev => ({
      ...prev,
      [page]: (prev[page] || []).filter(shape => {
        if (shape.type === 'text') {
          return Math.abs(shape.x - pos.x) > threshold || Math.abs(shape.y - pos.y) > threshold
        }
        if (shape.type === 'freehand') {
          return !shape.points.some(p => Math.abs(p.x - pos.x) < threshold && Math.abs(p.y - pos.y) < threshold)
        }
        // line / rect / circle / arrow
        const cx = (shape.x1 + shape.x2) / 2
        const cy = (shape.y1 + shape.y2) / 2
        return Math.abs(cx - pos.x) > threshold * 3 || Math.abs(cy - pos.y) > threshold * 3
      })
    }))

    // Check measurements
    setMeasurements(prev => ({
      ...prev,
      [page]: (prev[page] || []).filter(m => {
        const cx = (m.x1 + m.x2) / 2
        const cy = (m.y1 + m.y2) / 2
        return Math.abs(cx - pos.x) > threshold * 3 || Math.abs(cy - pos.y) > threshold * 3
      })
    }))
  }

  // ============================================================================
  // CLEAR ALL
  // ============================================================================
  const clearPage = () => {
    setAnnotations(prev => ({ ...prev, [currentPage]: [] }))
    setMeasurements(prev => ({ ...prev, [currentPage]: [] }))
  }

  const clearAll = () => {
    setAnnotations({})
    setMeasurements({})
  }

  // ============================================================================
  // UNDO
  // ============================================================================
  const undo = () => {
    const page = currentPage
    const pageAnnotations = annotations[page] || []
    const pageMeasurements = measurements[page] || []

    // Find most recent item
    const lastAnnotation = pageAnnotations[pageAnnotations.length - 1]
    const lastMeasurement = pageMeasurements[pageMeasurements.length - 1]

    if (!lastAnnotation && !lastMeasurement) return

    const annotationId = lastAnnotation?.id || 0
    const measurementId = lastMeasurement?.id || 0

    if (annotationId > measurementId) {
      setAnnotations(prev => ({
        ...prev,
        [page]: pageAnnotations.slice(0, -1)
      }))
    } else {
      setMeasurements(prev => ({
        ...prev,
        [page]: pageMeasurements.slice(0, -1)
      }))
    }
  }

  // ============================================================================
  // CANVAS DRAWING (SVG overlay approach)
  // ============================================================================
  const renderShape = (shape, key) => {
    const zoomFactor = scale / (shape.zoomAtCreation || 1)
    const sw = shape.width || 2

    switch (shape.type) {
      case 'line':
        return (
          <line key={key}
            x1={shape.x1 * zoomFactor} y1={shape.y1 * zoomFactor}
            x2={shape.x2 * zoomFactor} y2={shape.y2 * zoomFactor}
            stroke={shape.color} strokeWidth={sw} strokeLinecap="round"
          />
        )
      case 'rect': {
        const x = Math.min(shape.x1, shape.x2) * zoomFactor
        const y = Math.min(shape.y1, shape.y2) * zoomFactor
        const w = Math.abs(shape.x2 - shape.x1) * zoomFactor
        const h = Math.abs(shape.y2 - shape.y1) * zoomFactor
        return (
          <rect key={key} x={x} y={y} width={w} height={h}
            stroke={shape.color} strokeWidth={sw} fill="none" />
        )
      }
      case 'circle': {
        const cx = ((shape.x1 + shape.x2) / 2) * zoomFactor
        const cy = ((shape.y1 + shape.y2) / 2) * zoomFactor
        const rx = (Math.abs(shape.x2 - shape.x1) / 2) * zoomFactor
        const ry = (Math.abs(shape.y2 - shape.y1) / 2) * zoomFactor
        return (
          <ellipse key={key} cx={cx} cy={cy} rx={rx} ry={ry}
            stroke={shape.color} strokeWidth={sw} fill="none" />
        )
      }
      case 'arrow': {
        const x1 = shape.x1 * zoomFactor
        const y1 = shape.y1 * zoomFactor
        const x2 = shape.x2 * zoomFactor
        const y2 = shape.y2 * zoomFactor
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLen = 15
        const ax1 = x2 - headLen * Math.cos(angle - Math.PI / 6)
        const ay1 = y2 - headLen * Math.sin(angle - Math.PI / 6)
        const ax2 = x2 - headLen * Math.cos(angle + Math.PI / 6)
        const ay2 = y2 - headLen * Math.sin(angle + Math.PI / 6)
        return (
          <g key={key}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={shape.color} strokeWidth={sw} strokeLinecap="round" />
            <line x1={x2} y1={y2} x2={ax1} y2={ay1}
              stroke={shape.color} strokeWidth={sw} strokeLinecap="round" />
            <line x1={x2} y1={y2} x2={ax2} y2={ay2}
              stroke={shape.color} strokeWidth={sw} strokeLinecap="round" />
          </g>
        )
      }
      case 'freehand': {
        if (!shape.points || shape.points.length < 2) return null
        const d = shape.points.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${p.x * zoomFactor} ${p.y * zoomFactor}`
        ).join(' ')
        return (
          <path key={key} d={d}
            stroke={shape.color} strokeWidth={sw} fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        )
      }
      case 'text':
        return (
          <text key={key}
            x={shape.x * zoomFactor} y={shape.y * zoomFactor}
            fill={shape.color} fontSize={shape.fontSize}
            fontFamily="Arial, sans-serif" fontWeight="bold"
            style={{ userSelect: 'none' }}
          >
            {shape.text}
          </text>
        )
      default:
        return null
    }
  }

  const renderMeasurement = (m, key) => {
    const zoomFactor = scale / (m.zoomAtCreation || 1)
    const x1 = m.x1 * zoomFactor
    const y1 = m.y1 * zoomFactor
    const x2 = m.x2 * zoomFactor
    const y2 = m.y2 * zoomFactor
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2

    // Calculate real distance if scale is calibrated
    let distLabel = ''
    if (effectiveScaleRatio) {
      const realDist = calcRealDistance(m.x1, m.y1, m.x2, m.y2, effectiveScaleRatio * (m.zoomAtCreation / scaleBaseZoom))
      distLabel = formatDistance(realDist)
    } else {
      const pxDist = Math.sqrt((m.x2 - m.x1) ** 2 + (m.y2 - m.y1) ** 2)
      distLabel = `${Math.round(pxDist)}px`
    }

    // Perpendicular tick marks
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const tickLen = 8
    const perpAngle = angle + Math.PI / 2

    return (
      <g key={key}>
        {/* Main line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={m.color || '#ef4444'} strokeWidth={m.width || 2}
          strokeDasharray="6 3" strokeLinecap="round" />

        {/* Start tick */}
        <line
          x1={x1 - tickLen * Math.cos(perpAngle)} y1={y1 - tickLen * Math.sin(perpAngle)}
          x2={x1 + tickLen * Math.cos(perpAngle)} y2={y1 + tickLen * Math.sin(perpAngle)}
          stroke={m.color || '#ef4444'} strokeWidth={m.width || 2} strokeLinecap="round"
        />
        {/* End tick */}
        <line
          x1={x2 - tickLen * Math.cos(perpAngle)} y1={y2 - tickLen * Math.sin(perpAngle)}
          x2={x2 + tickLen * Math.cos(perpAngle)} y2={y2 + tickLen * Math.sin(perpAngle)}
          stroke={m.color || '#ef4444'} strokeWidth={m.width || 2} strokeLinecap="round"
        />

        {/* Endpoint dots */}
        <circle cx={x1} cy={y1} r={4} fill={m.color || '#ef4444'} />
        <circle cx={x2} cy={y2} r={4} fill={m.color || '#ef4444'} />

        {/* Distance label background */}
        <rect
          x={mx - distLabel.length * 4.5 - 4} y={my - 12}
          width={distLabel.length * 9 + 8} height={20}
          rx={4} fill="white" stroke={m.color || '#ef4444'} strokeWidth={1}
          opacity={0.95}
        />
        {/* Distance label text */}
        <text x={mx} y={my + 3} textAnchor="middle"
          fill={m.color || '#ef4444'} fontSize="13" fontWeight="bold" fontFamily="Arial, sans-serif"
        >
          {distLabel}
        </text>
      </g>
    )
  }

  // ============================================================================
  // RENDER LIVE PREVIEW (current draw)
  // ============================================================================
  const renderLivePreview = () => {
    if (!isDrawing || !drawStart || !currentPos) return null

    if (activeTool === TOOLS.MEASURE) {
      return renderMeasurement({
        x1: drawStart.x, y1: drawStart.y,
        x2: currentPos.x, y2: currentPos.y,
        color: strokeColor, width: strokeWidth,
        zoomAtCreation: scale,
      }, 'live-measure')
    }

    if (activeTool === TOOLS.FREEHAND && freehandPoints.length > 1) {
      const d = freehandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      return <path d={d} stroke={strokeColor} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    }

    const liveShape = {
      type: activeTool,
      x1: drawStart.x, y1: drawStart.y,
      x2: currentPos.x, y2: currentPos.y,
      color: strokeColor, width: strokeWidth,
      zoomAtCreation: scale,
    }
    return renderShape(liveShape, 'live-shape')
  }

  // Scale calibration preview line
  const renderCalibrationPreview = () => {
    if (!scaleMode || scalePoints.length === 0) return null

    if (scalePoints.length === 1) {
      return (
        <>
          <circle cx={scalePoints[0].x} cy={scalePoints[0].y} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
          {currentPos && (
            <line x1={scalePoints[0].x} y1={scalePoints[0].y} x2={currentPos.x} y2={currentPos.y}
              stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" />
          )}
        </>
      )
    }

    if (scalePoints.length === 2) {
      const pxDist = Math.sqrt(
        (scalePoints[1].x - scalePoints[0].x) ** 2 +
        (scalePoints[1].y - scalePoints[0].y) ** 2
      )
      const mx = (scalePoints[0].x + scalePoints[1].x) / 2
      const my = (scalePoints[0].y + scalePoints[1].y) / 2
      return (
        <>
          <line x1={scalePoints[0].x} y1={scalePoints[0].y}
            x2={scalePoints[1].x} y2={scalePoints[1].y}
            stroke="#22c55e" strokeWidth={3} strokeDasharray="6 3" />
          <circle cx={scalePoints[0].x} cy={scalePoints[0].y} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
          <circle cx={scalePoints[1].x} cy={scalePoints[1].y} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
          <rect x={mx - 30} y={my - 12} width={60} height={20} rx={4} fill="#22c55e" opacity={0.9} />
          <text x={mx} y={my + 3} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
            {Math.round(pxDist)}px
          </text>
        </>
      )
    }
    return null
  }

  // ============================================================================
  // COLLECT ALL MEASUREMENTS FOR EXPORT
  // ============================================================================
  const getAllMeasurements = () => {
    const all = []
    Object.entries(measurements).forEach(([pageNum, pageMeasurements]) => {
      pageMeasurements.forEach(m => {
        if (effectiveScaleRatio) {
          const realDist = calcRealDistance(m.x1, m.y1, m.x2, m.y2,
            effectiveScaleRatio * (m.zoomAtCreation / scaleBaseZoom))
          all.push({
            page: parseInt(pageNum),
            distance_ft: parseFloat(realDist.toFixed(2)),
            formatted: formatDistance(realDist),
          })
        }
      })
    })
    return all
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  useEffect(() => {
    const handler = (e) => {
      if (showTextInput) return // don't capture when typing
      if (e.key === 'Escape') {
        if (scaleMode) { cancelCalibration(); return }
        if (onClose) onClose()
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPage(currentPage + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goToPage(currentPage - 1) }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      if (e.key === '-') { e.preventDefault(); zoomOut() }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'v') setActiveTool(TOOLS.PAN)
      if (e.key === 'm') setActiveTool(TOOLS.MEASURE)
      if (e.key === 'l') setActiveTool(TOOLS.LINE)
      if (e.key === 'r') setActiveTool(TOOLS.RECT)
      if (e.key === 'c') setActiveTool(TOOLS.CIRCLE)
      if (e.key === 'a') setActiveTool(TOOLS.ARROW)
      if (e.key === 't') setActiveTool(TOOLS.TEXT)
      if (e.key === 'f') setActiveTool(TOOLS.FREEHAND)
      if (e.key === 'e') setActiveTool(TOOLS.ERASER)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentPage, numPages, showTextInput, scaleMode])

  // ============================================================================
  // TOOL BUTTON
  // ============================================================================
  const ToolBtn = ({ tool, icon, label, shortcut }) => (
    <button
      onClick={() => setActiveTool(tool)}
      className={`relative group flex flex-col items-center px-2 py-1.5 rounded-md text-xs transition-all ${
        activeTool === tool
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
      title={`${label} (${shortcut})`}
    >
      {icon}
      <span className="mt-0.5 text-[10px] leading-none">{label}</span>
    </button>
  )

  // ============================================================================
  // CURSOR STYLE
  // ============================================================================
  const getCursor = () => {
    if (scaleMode) return 'crosshair'
    switch (activeTool) {
      case TOOLS.PAN: return isPanning ? 'grabbing' : 'grab'
      case TOOLS.MEASURE: return 'crosshair'
      case TOOLS.TEXT: return 'text'
      case TOOLS.ERASER: return 'pointer'
      default: return 'crosshair'
    }
  }

  // Count total annotations
  const totalAnnotations = Object.values(annotations).flat().length
  const totalMeasurements = Object.values(measurements).flat().length

  if (!url) return null

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-gray-900 rounded-xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[750px]'
      }`}
    >
      {/* ================================================================ */}
      {/* TOP TOOLBAR */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 border-b border-gray-700 flex-shrink-0">
        {/* Left: Page nav */}
        <div className="flex items-center space-x-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Thumbnails">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <span className="text-xs text-gray-300">
            Pg <input type="number" min={1} max={numPages || 1} value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-10 mx-1 px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-center text-white text-xs"
            /> / {numPages || '...'}
          </span>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= (numPages || 1)}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="h-5 w-px bg-gray-600 mx-1" />
          <button onClick={zoomOut} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-gray-300 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Scale indicator */}
          {scaleRatio && (
            <span className="text-[10px] text-green-400 bg-green-900/50 px-2 py-0.5 rounded">
              Scale set
            </span>
          )}
          {totalMeasurements > 0 && (
            <span className="text-[10px] text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded">
              {totalMeasurements} measurement{totalMeasurements !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={undo} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Undo (Ctrl+Z)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button onClick={clearPage} className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded" title="Clear this page">
            Clear Page
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />}
            </svg>
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* DRAWING TOOLBAR */}
      {/* ================================================================ */}
      <div className="flex items-center bg-gray-800/80 px-3 py-1 border-b border-gray-700 flex-shrink-0 gap-1 overflow-x-auto">
        {/* Tool buttons */}
        <ToolBtn tool={TOOLS.PAN} shortcut="V" label="Pan" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.MEASURE} shortcut="M" label="Measure" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        } />

        <div className="h-5 w-px bg-gray-600 mx-1" />

        <ToolBtn tool={TOOLS.LINE} shortcut="L" label="Line" icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.RECT} shortcut="R" label="Rect" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" strokeWidth={2} rx="1" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.CIRCLE} shortcut="C" label="Circle" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
          </svg>
        } />
        <ToolBtn tool={TOOLS.ARROW} shortcut="A" label="Arrow" icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="5" y1="19" x2="19" y2="5" strokeWidth={2} strokeLinecap="round" />
            <polyline points="10,5 19,5 19,14" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.FREEHAND} shortcut="F" label="Draw" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.TEXT} shortcut="T" label="Text" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 6v14m-4 0h8" />
          </svg>
        } />
        <ToolBtn tool={TOOLS.ERASER} shortcut="E" label="Erase" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        } />

        <div className="h-5 w-px bg-gray-600 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-gray-300 hover:bg-gray-700"
          >
            <div className="w-4 h-4 rounded-sm border border-gray-500"
              style={{ backgroundColor: strokeColor }} />
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl z-50">
              <div className="grid grid-cols-5 gap-1 mb-2">
                {COLORS.map(c => (
                  <button key={c}
                    onClick={() => { setStrokeColor(c); setShowColorPicker(false) }}
                    className={`w-6 h-6 rounded-sm border-2 transition-transform hover:scale-110 ${
                      strokeColor === c ? 'border-white scale-110' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400">Width:</span>
                {STROKE_WIDTHS.map(w => (
                  <button key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`w-6 h-6 rounded flex items-center justify-center ${
                      strokeWidth === w ? 'bg-blue-600' : 'hover:bg-gray-700'
                    }`}
                  >
                    <div className="rounded-full bg-gray-300" style={{ width: w + 2, height: w + 2 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-gray-600 mx-1" />

        {/* Scale calibration button */}
        <button
          onClick={scaleMode ? cancelCalibration : startScaleCalibration}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
            scaleMode
              ? 'bg-green-600 text-white animate-pulse'
              : scaleRatio
                ? 'text-green-400 hover:bg-gray-700'
                : 'text-yellow-400 hover:bg-gray-700'
          }`}
          title="Set scale: click 2 points of known distance"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          {scaleMode ? 'Setting Scale...' : scaleRatio ? 'Recalibrate' : 'Set Scale'}
        </button>
      </div>

      {/* Scale calibration panel */}
      {scaleMode && (
        <div className="bg-green-900/60 border-b border-green-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-green-200 flex-shrink-0">
            {scalePoints.length === 0
              ? 'Click the first point of a known dimension on the plan'
              : scalePoints.length === 1
                ? 'Click the second point to complete the reference line'
                : 'Enter the real-world distance between those two points:'}
          </span>
          {scalePoints.length === 2 && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Distance"
                value={scaleKnownDist}
                onChange={(e) => setScaleKnownDist(e.target.value)}
                className="w-24 px-2 py-1 bg-gray-800 border border-green-600 rounded text-white text-xs"
                autoFocus
              />
              <span className="text-xs text-green-300">feet</span>
              <button
                onClick={finishCalibration}
                disabled={!scaleKnownDist || parseFloat(scaleKnownDist) <= 0}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500 disabled:opacity-40"
              >
                Apply
              </button>
              <button onClick={cancelCalibration}
                className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MAIN AREA */}
      {/* ================================================================ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Sidebar */}
        {sidebarOpen && (
          <div className="w-44 border-r border-gray-700 overflow-y-auto flex-shrink-0" style={{ backgroundColor: '#1a1d23' }}>
            <div className="p-2 space-y-2">
              <Document file={url} onLoadSuccess={() => {}} loading="">
                {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div key={pageNum}
                    ref={(el) => { thumbRefs.current[pageNum] = el }}
                    onClick={() => goToPage(pageNum)}
                    className={`cursor-pointer rounded-lg p-1 transition-all ${
                      currentPage === pageNum ? 'bg-blue-600 ring-2 ring-blue-400' : 'hover:bg-gray-700'
                    }`}
                  >
                    <div className="bg-white rounded shadow-sm overflow-hidden">
                      <Page pageNumber={pageNum} width={140} renderTextLayer={false} renderAnnotationLayer={false} />
                    </div>
                    <p className={`text-xs text-center mt-1 ${currentPage === pageNum ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {pageNum}
                      {((annotations[pageNum]?.length || 0) + (measurements[pageNum]?.length || 0)) > 0 && (
                        <span className="ml-1 text-yellow-400">*</span>
                      )}
                    </p>
                  </div>
                ))}
              </Document>
            </div>
          </div>
        )}

        {/* Main Page View with Canvas Overlay */}
        <div className="flex-1 overflow-auto" style={{ backgroundColor: '#4a4d52' }}>
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
                <p className="text-red-300 font-medium">{loadError}</p>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 underline">
                  Open PDF in new tab
                </a>
              </div>
            </div>
          )}

          <Document file={url} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading="">
            <div className="py-4 px-2 flex justify-center">
              <div
                ref={pageWrapperRef}
                className="relative bg-white shadow-2xl"
                style={{ cursor: getCursor() }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  if (isDrawing) handleMouseUp({ clientX: 0, clientY: 0 })
                  if (isPanning) { setIsPanning(false); setPanStart(null) }
                }}
              >
                {/* PDF Page */}
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* SVG Overlay for annotations & measurements */}
                <svg
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 10 }}
                >
                  {/* Existing annotations */}
                  {(annotations[currentPage] || []).map((shape, i) => renderShape(shape, `ann-${i}`))}

                  {/* Existing measurements */}
                  {(measurements[currentPage] || []).map((m, i) => renderMeasurement(m, `meas-${i}`))}

                  {/* Live preview */}
                  {renderLivePreview()}

                  {/* Calibration preview */}
                  {renderCalibrationPreview()}
                </svg>

                {/* Text input floating box */}
                {showTextInput && textPos && (
                  <div
                    className="absolute z-20"
                    style={{ left: textPos.x, top: textPos.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-white border-2 border-blue-500 rounded shadow-lg p-1 flex">
                      <input
                        autoFocus
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') placeText()
                          if (e.key === 'Escape') { setShowTextInput(false); setTextPos(null) }
                        }}
                        placeholder="Type text..."
                        className="w-48 px-2 py-1 text-sm border-0 focus:outline-none"
                      />
                      <button onClick={placeText}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Document>
        </div>

        {/* Right sidebar: Measurements list */}
        {totalMeasurements > 0 && (
          <div className="w-56 border-l border-gray-700 overflow-y-auto flex-shrink-0 bg-gray-850"
            style={{ backgroundColor: '#1a1d23' }}>
            <div className="p-3">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">Measurements</h3>
              {Object.entries(measurements).map(([pageNum, pageMeas]) =>
                pageMeas.length > 0 && (
                  <div key={pageNum} className="mb-3">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">Page {pageNum}</p>
                    {pageMeas.map((m, i) => {
                      let dist = ''
                      if (effectiveScaleRatio) {
                        const realDist = calcRealDistance(m.x1, m.y1, m.x2, m.y2,
                          effectiveScaleRatio * (m.zoomAtCreation / scaleBaseZoom))
                        dist = formatDistance(realDist)
                      } else {
                        const pxDist = Math.sqrt((m.x2 - m.x1) ** 2 + (m.y2 - m.y1) ** 2)
                        dist = `${Math.round(pxDist)}px`
                      }
                      return (
                        <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded bg-gray-800 mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color || '#ef4444' }} />
                            <span className="text-xs text-white font-medium">{dist}</span>
                          </div>
                          <button
                            onClick={() => {
                              setMeasurements(prev => ({
                                ...prev,
                                [pageNum]: prev[pageNum].filter(x => x.id !== m.id)
                              }))
                            }}
                            className="text-gray-500 hover:text-red-400 text-xs"
                          >x</button>
                        </div>
                      )
                    })}
                  </div>
                )
              )}

              {effectiveScaleRatio && totalMeasurements > 0 && onSaveMeasurements && (
                <button
                  onClick={() => onSaveMeasurements(getAllMeasurements())}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  Save Measurements
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
