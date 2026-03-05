import { useState, useEffect, useCallback } from 'react'
import { estimateAPI } from '../api'
import { LoadingSpinner } from './common'

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)
const fmtNum = (v) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
const UNIT_LABELS = { sqft: 'SF', lnft: 'LF', each: 'EA' }
const fmtUnit = (u) => UNIT_LABELS[u] || u

// ============================================================================
// COST SUMMARY CARD
// ============================================================================
function CostSummary({ summary }) {
  if (!summary) return null
  const rows = [
    { label: 'Materials', value: summary.materials_total, bold: false },
    { label: 'Labor', value: summary.labor_total, sub: summary.roof_area_sq ? `${fmtNum(summary.roof_area_sq)} squares @ $85/sq` : null },
    { label: 'Subtotal', value: summary.subtotal, bold: true },
    { label: `Markup (${((summary.markup_pct || 0) * 100).toFixed(0)}%)`, value: summary.markup },
    { label: 'Subtotal + Markup', value: summary.subtotal_with_markup, bold: true },
    { label: `Tax (${((summary.tax_pct || 0) * 100).toFixed(1)}%)`, value: summary.tax, sub: 'On materials only' },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{summary.project_name || 'Estimate'}</h3>
            {summary.address && <p className="text-blue-100 text-sm mt-0.5">{summary.address}</p>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{fmt(summary.grand_total)}</div>
            <div className="text-blue-200 text-xs mt-1">
              {summary.system_type && <span className="bg-white/20 px-2 py-0.5 rounded mr-2">{summary.system_type}</span>}
              {summary.roof_area_sf > 0 && <span>{fmtNum(summary.roof_area_sf)} SF</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 px-5 py-1">
        {rows.map((row, i) => (
          <div key={i} className={`flex items-center justify-between py-2.5 ${row.bold ? 'font-semibold' : ''}`}>
            <div>
              <span className="text-sm text-gray-700">{row.label}</span>
              {row.sub && <span className="text-xs text-gray-400 ml-2">{row.sub}</span>}
            </div>
            <span className="text-sm font-mono text-gray-900">{fmt(row.value)}</span>
          </div>
        ))}
      </div>

      <div className="bg-green-50 border-t-2 border-green-200 px-5 py-4 flex items-center justify-between">
        <span className="text-base font-bold text-green-900">Grand Total</span>
        <span className="text-2xl font-bold text-green-800 font-mono">{fmt(summary.grand_total)}</span>
      </div>

      {/* Per-Square Cost */}
      {summary.roof_area_sq > 0 && (
        <div className="px-5 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
          <span>Cost per Square</span>
          <span className="font-mono">{fmt(summary.grand_total / summary.roof_area_sq)}/sq</span>
        </div>
      )}
    </div>
  )
}


// ============================================================================
// CONDITIONS BREAKDOWN VIEW (By-Condition accordion)
// ============================================================================
function ConditionsBreakdown({ breakdown }) {
  const [expandedIds, setExpandedIds] = useState(new Set())

  const toggle = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedIds(new Set(breakdown.map(b => b.condition.id)))
  const collapseAll = () => setExpandedIds(new Set())

  if (!breakdown || breakdown.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No conditions in estimate</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">By Condition</h3>
        <div className="flex gap-2 text-xs">
          <button onClick={expandAll} className="text-primary-600 hover:underline">Expand All</button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-primary-600 hover:underline">Collapse All</button>
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.map((item) => {
          const c = item.condition
          const expanded = expandedIds.has(c.id)
          const includedMats = item.materials.filter(m => m.is_included)

          return (
            <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggle(c.id)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div>
                    <span className="font-semibold text-sm text-gray-900">{c.label || c.type}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {fmtNum(c.measurement)} {fmtUnit(c.unit)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs text-gray-500">{includedMats.length} items</span>
                  <span className="font-mono font-semibold text-gray-900">{fmt(item.condition_total)}</span>
                </div>
              </div>

              {/* Materials */}
              {expanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Material</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-14">Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-24">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-24">Labor</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">Extended</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {item.materials.map((mat) => (
                        <tr key={mat.id} className={!mat.is_included ? 'opacity-40' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-800">{mat.material_name}</div>
                            <div className="text-xs text-gray-400">{mat.material_category}</div>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{fmtUnit(mat.unit)}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-700">
                            {mat.is_included ? fmtNum(mat.qty_calculated) : '—'}
                            {mat.override_quantity != null && (
                              <span className="text-xs text-amber-600 ml-1" title="Manual override">*</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-700">
                            {mat.unit_cost > 0 ? fmt(mat.unit_cost) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-gray-700">
                            {mat.labor_cost > 0 ? fmt(mat.labor_cost) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">
                            {mat.is_included ? fmt(mat.extended) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={5} className="px-4 py-2 text-right text-xs font-semibold text-gray-600">
                          Condition Total
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-gray-900">
                          {fmt(item.condition_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ============================================================================
// CONSOLIDATED MATERIALS VIEW (for purchasing)
// ============================================================================
function ConsolidatedMaterials({ materials }) {
  if (!materials || materials.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No consolidated materials</div>
  }

  // Group by category
  const grouped = {}
  materials.forEach(m => {
    const cat = m.material_category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m)
  })

  const grandTotal = materials.reduce((s, m) => s + (m.total_cost || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Consolidated Materials (for Purchasing)</h3>
        <span className="text-sm font-mono font-semibold text-gray-900">{fmt(grandTotal)}</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Material</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-14">Unit</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Total Qty</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Unit Cost</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-24">Labor/Unit</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-28">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([category, items]) => (
              <tbody key={category}>
                {/* Category Header */}
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {category}
                  </td>
                </tr>
                {items.map((mat, i) => (
                  <tr key={i} className="hover:bg-gray-50 border-t border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{mat.material_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtUnit(mat.unit)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-800 font-semibold">{fmtNum(mat.total_qty)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">{fmt(mat.unit_cost)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">{mat.labor_cost > 0 ? fmt(mat.labor_cost) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">{fmt(mat.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                Materials Total
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-base">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ============================================================================
// ERRORS PANEL
// ============================================================================
function ErrorsPanel({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Missing Cost Data ({errors.length})
      </h4>
      <ul className="space-y-1">
        {errors.map((err, i) => (
          <li key={i} className="text-xs text-amber-700">{err}</li>
        ))}
      </ul>
      <p className="text-xs text-amber-600 mt-2">
        Add these materials to the Cost Database (Admin &gt; Cost Database) to get accurate pricing.
      </p>
    </div>
  )
}


// ============================================================================
// MAIN ESTIMATE TAB
// ============================================================================
export default function EstimateTab({ projectId }) {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('conditions') // 'conditions' | 'consolidated'
  const [savedStatus, setSavedStatus] = useState(null)

  // Load saved estimate on mount
  const loadEstimate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await estimateAPI.get(projectId)
      if (res.data && res.data.status === 'success') {
        setEstimate(res.data)
      }
    } catch {
      // No estimate yet — that's fine
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadEstimate() }, [loadEstimate])

  // Calculate estimate from conditions
  const handleCalculate = async () => {
    setCalculating(true)
    setError('')
    setSavedStatus(null)
    try {
      const res = await estimateAPI.calculate(projectId)
      if (res.data?.status === 'error') {
        setError(res.data.message)
      } else {
        setEstimate(res.data)
      }
    } catch (err) {
      setError('Failed to calculate estimate: ' + (err.response?.data?.detail || err.message))
    } finally {
      setCalculating(false)
    }
  }

  // Save estimate snapshot
  const handleSave = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      await estimateAPI.save(projectId, estimate)
      setSavedStatus('Saved!')
      setTimeout(() => setSavedStatus(null), 3000)
    } catch {
      setError('Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

  // Load previously saved estimate
  const handleLoadSaved = async () => {
    try {
      const res = await estimateAPI.load(projectId)
      if (res.data?.estimate_data) {
        setEstimate(res.data.estimate_data)
        setSavedStatus('Loaded saved estimate')
        setTimeout(() => setSavedStatus(null), 3000)
      }
    } catch {
      setError('No saved estimate found')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Estimate</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Calculated from conditions and materials. Go to the Conditions tab to adjust.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedStatus && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">{savedStatus}</span>
          )}
          <button
            onClick={handleLoadSaved}
            className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Load Saved
          </button>
          <button
            onClick={handleSave}
            disabled={!estimate || saving}
            className={`px-3 py-2 text-xs font-medium rounded-lg ${
              !estimate || saving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {saving ? 'Saving...' : 'Save Estimate'}
          </button>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg shadow-sm ${
              calculating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {calculating ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Calculating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculate Estimate
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
        </div>
      )}

      {!estimate ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Estimate Yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Set up your conditions and materials in the Conditions tab, then click "Calculate Estimate" to generate pricing.
          </p>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="inline-flex items-center px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculate Estimate
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Errors */}
          <ErrorsPanel errors={estimate.errors} />

          {/* Cost Summary */}
          <CostSummary summary={estimate.summary} />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('conditions')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'conditions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              By Condition
            </button>
            <button
              onClick={() => setViewMode('consolidated')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'consolidated'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Consolidated
            </button>
          </div>

          {/* Detail Views */}
          {viewMode === 'conditions' ? (
            <ConditionsBreakdown breakdown={estimate.conditions_breakdown} />
          ) : (
            <ConsolidatedMaterials materials={estimate.consolidated_materials} />
          )}
        </div>
      )}
    </div>
  )
}
