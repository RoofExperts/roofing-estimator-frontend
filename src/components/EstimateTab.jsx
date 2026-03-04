import { useState, useEffect } from 'react'
import { estimateAPI } from '../api'
import { LoadingSpinner } from './common'

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)
const fmtNum = (v) => v != null ? Number(v).toLocaleString() : '—'

// ============================================================================
// MATERIAL TABLE - Reusable table for each page's material groups
// ============================================================================
function MaterialTable({ groups, pageTotal, pageTotalLabel, onEdit, tabKey }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-12">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Description</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-20">Qty</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-20">Unit</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-28">Unit Cost</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-32">Extended Cost</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <GroupRows key={gi} group={group} groupIndex={gi} onEdit={onEdit} tabKey={tabKey} />
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 border-t-2 border-gray-300">
            <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">
              {pageTotalLabel || 'PAGE TOTAL:'}
            </td>
            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{fmt(pageTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function GroupRows({ group, groupIndex, onEdit, tabKey }) {
  if (!group.items || group.items.length === 0) return null

  const handleQtyChange = (itemIndex, value) => {
    const numValue = parseFloat(value) || 0
    onEdit(tabKey, groupIndex, itemIndex, 'qty', numValue)
  }

  const handleUnitCostChange = (itemIndex, value) => {
    const numValue = parseFloat(value) || 0
    onEdit(tabKey, groupIndex, itemIndex, 'unit_cost', numValue)
  }

  return (
    <>
      {/* Category header row */}
      <tr className="bg-blue-50 border-t border-gray-200">
        <td colSpan={6} className="px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
          {group.category}
        </td>
      </tr>
      {/* Item rows */}
      {group.items.map((item, idx) => (
        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-2 text-sm text-gray-500 text-center">{item.line}</td>
          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
          <td className="px-4 py-2 text-sm text-gray-700 text-right font-mono">
            <input
              type="number"
              value={typeof item.qty === 'number' ? item.qty : 0}
              onChange={(e) => handleQtyChange(idx, e.target.value)}
              className="w-16 px-2 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              step="0.01"
            />
          </td>
          <td className="px-4 py-2 text-sm text-gray-500">{item.unit}</td>
          <td className="px-4 py-2 text-sm text-gray-700 text-right font-mono">
            <input
              type="number"
              value={item.unit_cost || 0}
              onChange={(e) => handleUnitCostChange(idx, e.target.value)}
              className="w-24 px-2 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              step="0.01"
              min="0"
            />
          </td>
          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right font-mono">
            {fmt(item.extended || 0)}
          </td>
        </tr>
      ))}
      {/* Spacer after group */}
      <tr><td colSpan={6} className="h-1"></td></tr>
    </>
  )
}


// ============================================================================
// PROJECT SUMMARY TAB
// ============================================================================
function ProjectSummaryTab({ summary }) {
  if (!summary) return null
  const cs = summary.cost_summary || {}

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          PROJECT SUMMARY — ROOFING ESTIMATE
        </h3>
        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
          <span className="text-gray-500 font-medium">PROJECT:</span>
          <span className="text-gray-900 font-semibold">{summary.project_name}</span>
          <span className="text-gray-500 font-medium">ADDRESS:</span>
          <span className="text-gray-900">{summary.address || '—'}</span>
          <span className="text-gray-500 font-medium">DATE:</span>
          <span className="text-gray-900">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* System Specs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Roof System Specifications</h4>
        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
          <span className="text-gray-500">System Type:</span>
          <span className="text-gray-900 font-medium">{summary.system_description}</span>
          <span className="text-gray-500">Manufacturer:</span>
          <span className="text-gray-900">{summary.manufacturer}</span>
          <span className="text-gray-500">Membrane:</span>
          <span className="text-gray-900">{summary.membrane}</span>
          <span className="text-gray-500">Insulation:</span>
          <span className="text-gray-900">{summary.insulation || '—'}</span>
          {summary.cover_board && (
            <>
              <span className="text-gray-500">Cover Board:</span>
              <span className="text-gray-900">{summary.cover_board}</span>
            </>
          )}
          <span className="text-gray-500">Warranty:</span>
          <span className="text-gray-900">{summary.warranty}</span>
          <span className="text-gray-500">Roof Area:</span>
          <span className="text-gray-900 font-medium">{fmtNum(summary.roof_area_sf)} SF ({summary.roof_area_sq} SQ)</span>
          <span className="text-gray-500">Perimeter:</span>
          <span className="text-gray-900">{fmtNum(summary.perimeter_lf)} LF</span>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Cost Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Flat Roof Materials (Page 2):</span>
            <span className="font-mono text-gray-900">{fmt(cs.flat_materials)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Roof Related Metals (Page 3):</span>
            <span className="font-mono text-gray-900">{fmt(cs.metals)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Labor & General Conditions (Page 4):</span>
            <span className="font-mono text-gray-900">{fmt(cs.labor)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Warranty:</span>
            <span className="font-mono text-gray-900">{fmt(cs.warranty)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 font-semibold">
            <span className="text-gray-700">SUBTOTAL:</span>
            <span className="font-mono text-gray-900">{fmt(cs.subtotal)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-gray-600">Profit Markup ({((cs.markup_pct || 0.25) * 100).toFixed(0)}%):</span>
            <span className="font-mono text-gray-900">{fmt(cs.markup)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 font-semibold">
            <span className="text-gray-700">SUBTOTAL WITH MARKUP:</span>
            <span className="font-mono text-gray-900">{fmt(cs.subtotal_with_markup)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-gray-600">Sales Tax ({((cs.tax_pct || 0.0825) * 100).toFixed(2)}%):</span>
            <span className="font-mono text-gray-900">{fmt(cs.tax)}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
            <span className="text-lg font-bold text-gray-900">GRAND TOTAL:</span>
            <span className="text-lg font-bold text-blue-700 font-mono">{fmt(cs.grand_total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================================
// MAIN ESTIMATE TAB
// ============================================================================
export default function EstimateTab({ projectId }) {
  const [takeoff, setTakeoff] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')

  const fetchTakeoff = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await estimateAPI.takeoff(projectId)
      setTakeoff(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to generate takeoff. Make sure you have conditions (run Smart Build first).')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle editing items in takeoff tables
  const handleItemEdit = (tabKey, groupIndex, itemIndex, field, value) => {
    setTakeoff(prevTakeoff => {
      const updated = JSON.parse(JSON.stringify(prevTakeoff)) // Deep clone
      const groups = updated[tabKey] || []

      if (!groups[groupIndex] || !groups[groupIndex].items) return prevTakeoff

      const item = groups[groupIndex].items[itemIndex]
      if (!item) return prevTakeoff

      // Update the field
      item[field] = value

      // Recalculate extended cost
      item.extended = (item.qty || 0) * (item.unit_cost || 0)

      // Recalculate group total
      if (groups[groupIndex].items) {
        groups[groupIndex].total = groups[groupIndex].items.reduce((sum, it) => sum + (it.extended || 0), 0)
      }

      // Recalculate page totals
      const flatTotal = updated.flat_materials?.reduce((sum, group) => sum + (group.total || 0), 0) || 0
      const metalsTotal = updated.metals?.reduce((sum, group) => sum + (group.total || 0), 0) || 0
      const laborTotal = updated.labor?.reduce((sum, group) => sum + (group.total || 0), 0) || 0

      updated.flat_materials_total = flatTotal
      updated.metals_total = metalsTotal
      updated.labor_total = laborTotal

      // Recalculate cost summary
      const subtotal = flatTotal + metalsTotal + laborTotal + (updated.warranty_cost || 0)
      const markupPct = updated.summary?.cost_summary?.markup_pct || 0.25
      const markup = subtotal * markupPct
      const subtotalWithMarkup = subtotal + markup
      const taxPct = updated.summary?.cost_summary?.tax_pct || 0.0825
      const tax = subtotalWithMarkup * taxPct
      const grandTotal = subtotalWithMarkup + tax

      if (updated.summary && updated.summary.cost_summary) {
        updated.summary.cost_summary.flat_materials = flatTotal
        updated.summary.cost_summary.metals = metalsTotal
        updated.summary.cost_summary.labor = laborTotal
        updated.summary.cost_summary.subtotal = subtotal
        updated.summary.cost_summary.markup = markup
        updated.summary.cost_summary.subtotal_with_markup = subtotalWithMarkup
        updated.summary.cost_summary.tax = tax
        updated.summary.cost_summary.grand_total = grandTotal
      }

      return updated
    })
  }

  const tabs = [
    { id: 'summary', label: 'Project Summary' },
    { id: 'materials', label: 'Flat Roof Materials' },
    { id: 'metals', label: 'Roof Related Metals' },
    { id: 'labor', label: 'Labor & General Conditions' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Material Takeoff & Estimate</h2>
        <button
          onClick={fetchTakeoff}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {takeoff ? 'Regenerate Takeoff' : 'Generate Takeoff'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {!takeoff ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Takeoff Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Upload specs and plans, run the AI analysis, then Smart Build conditions.
            Once you have conditions, click "Generate Takeoff" to produce a full material takeoff and estimate.
          </p>
        </div>
      ) : (
        <div>
          {/* Grand Total Banner */}
          <div className="mb-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-blue-200 uppercase tracking-wider">Grand Total</p>
              <p className="text-2xl font-bold">{fmt(takeoff.summary?.cost_summary?.grand_total)}</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-blue-200">Materials</p>
                <p className="text-sm font-semibold">{fmt(takeoff.flat_materials_total + takeoff.metals_total)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Labor</p>
                <p className="text-sm font-semibold">{fmt(takeoff.labor_total)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">System</p>
                <p className="text-sm font-semibold">{takeoff.summary?.system_type}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Area</p>
                <p className="text-sm font-semibold">{fmtNum(takeoff.summary?.roof_area_sf)} SF</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white border border-b-0 border-gray-200 text-blue-700 -mb-px'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'summary' && (
              <ProjectSummaryTab summary={takeoff.summary} />
            )}

            {activeTab === 'materials' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Flat Roof Materials</h3>
                <MaterialTable
                  groups={takeoff.flat_materials || []}
                  pageTotal={takeoff.flat_materials_total}
                  pageTotalLabel="PAGE 2 TOTAL:"
                  onEdit={handleItemEdit}
                  tabKey="flat_materials"
                />
              </div>
            )}

            {activeTab === 'metals' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Roof Related Metals</h3>
                <MaterialTable
                  groups={takeoff.metals || []}
                  pageTotal={takeoff.metals_total}
                  pageTotalLabel="PAGE 3 TOTAL:"
                  onEdit={handleItemEdit}
                  tabKey="metals"
                />
              </div>
            )}

            {activeTab === 'labor' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Labor & General Conditions</h3>
                <MaterialTable
                  groups={takeoff.labor || []}
                  pageTotal={takeoff.labor_total}
                  pageTotalLabel="PAGE 4 TOTAL:"
                  onEdit={handleItemEdit}
                  tabKey="labor"
                />
                {/* Warranty line */}
                {takeoff.warranty_cost > 0 && (
                  <div className="mt-3 bg-white rounded-lg border border-gray-200 px-4 py-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{takeoff.warranty_description}</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{fmt(takeoff.warranty_cost)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
