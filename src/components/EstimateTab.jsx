import { useState, useEffect, useCallback } from 'react'
import { estimateAPI } from '../api'
import { LoadingSpinner } from './common'

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)
const fmtNum = (v) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
const UNIT_LABELS = { sqft: 'SF', lnft: 'LF', each: 'EA', gallon: 'GAL', roll: 'Roll', box: 'Box' }
const fmtUnit = (u) => UNIT_LABELS[u] || (u || '').toUpperCase()


// ============================================================================
// INLINE EDITABLE CELL
// ============================================================================
function EditableCell({ value, onSave, formatter, className, prefix, suffix, type = 'number' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleStart = () => {
    setDraft(value)
    setEditing(true)
  }

  const handleSave = () => {
    setEditing(false)
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed !== value) {
      onSave(parsed)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        type={type}
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${className || ''}`}
      />
    )
  }

  return (
    <span
      onClick={handleStart}
      className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1 py-0.5 transition-colors border border-transparent hover:border-blue-200 ${className || ''}`}
      title="Click to edit"
    >
      {prefix}{formatter ? formatter(value) : value}{suffix}
    </span>
  )
}

// Category display order and labels
const CATEGORY_ORDER = [
  'membrane', 'adhesive', 'sealant', 'base_sheet',
  'insulation', 'coverboard',
  'fastener',
  'flashing',
  'accessory'
]
const CATEGORY_LABELS = {
  membrane: 'MEMBRANE & ACCESSORIES',
  adhesive: 'MEMBRANE & ACCESSORIES',
  sealant: 'MEMBRANE & ACCESSORIES',
  base_sheet: 'MEMBRANE & ACCESSORIES',
  insulation: 'INSULATION',
  coverboard: 'INSULATION',
  fastener: 'FASTENERS & PLATES',
  flashing: 'WALL FLASHING & DETAILS',
  accessory: 'ACCESSORIES'
}

// Group categories into display sections
function groupIntoSections(materials) {
  const sections = {}
  const sectionOrder = []

  materials.forEach(mat => {
    const cat = mat.material_category || 'accessory'
    const sectionLabel = CATEGORY_LABELS[cat] || cat.toUpperCase()

    if (!sections[sectionLabel]) {
      sections[sectionLabel] = []
      sectionOrder.push(sectionLabel)
    }
    sections[sectionLabel].push(mat)
  })

  return { sections, sectionOrder }
}

// Determine if a material is a "metal" (goes on Page 3) vs flat roof material (Page 2)
function isMetalItem(mat) {
  const name = (mat.material_name || '').toLowerCase()
  const cat = (mat.material_category || '').toLowerCase()
  const metalKeywords = ['coping', 'edge metal', 'drip edge', 'gutter', 'downspout', 'scupper', 'collector head', 'reglet']
  return cat === 'metal' || metalKeywords.some(k => name.includes(k))
}


// ============================================================================
// PAGE 1: PROJECT SUMMARY
// ============================================================================
function ProjectSummaryPage({ summary, totals, pricing, onPricingChange }) {
  if (!summary) return null

  const specRows = [
    { label: 'System Type:', value: summary.system_type || '—' },
    { label: 'Roof Area:', value: summary.roof_area_sf ? `${fmtNum(summary.roof_area_sf)} SF (${fmtNum(summary.roof_area_sq)} SQ)` : '—' },
  ]

  const t = totals

  const costRows = [
    { label: 'Flat Roof Materials (Page 2):', value: t.flatTotal },
    { label: 'Roof Related Metals (Page 3):', value: t.metalTotal },
    { label: 'Labor & General Conditions (Page 4):', value: t.laborTotal },
    ...(t.equipmentTotal > 0 ? [{ label: 'Equipment:', value: t.equipmentTotal }] : []),
    { label: 'SUBTOTAL:', value: t.subtotal, bold: true },
    null,
    { label: `Profit Markup (${pricing.markupPct}%):`, value: t.markup },
    { label: 'SUBTOTAL WITH MARKUP:', value: t.subtotalWithMarkup, bold: true },
    null,
  ]

  // Tax rows
  if (pricing.taxMode === 'group') {
    if (pricing.materialTaxPct > 0) {
      costRows.push({ label: `Material Tax (${pricing.materialTaxPct}%):`, value: t.materialTotal * (1 + t.markupPct) * (pricing.materialTaxPct / 100) })
    }
    if (pricing.laborTaxPct > 0) {
      costRows.push({ label: `Labor Tax (${pricing.laborTaxPct}%):`, value: t.laborTotal * (1 + t.markupPct) * (pricing.laborTaxPct / 100) })
    }
    if (pricing.equipmentTaxPct > 0) {
      costRows.push({ label: `Equipment Tax (${pricing.equipmentTaxPct}%):`, value: t.equipmentTotal * (1 + t.markupPct) * (pricing.equipmentTaxPct / 100) })
    }
    costRows.push({ label: 'TOTAL TAX:', value: t.tax, bold: true })
  } else {
    costRows.push({ label: `Sales Tax (${pricing.projectTaxPct}%):`, value: t.tax })
  }

  if (t.bond > 0) {
    costRows.push(null)
    costRows.push({ label: `P&P Bond (${pricing.bondPct}%):`, value: t.bond })
  }

  costRows.push({ label: 'GRAND TOTAL:', value: t.grandTotal, bold: true, grand: true })

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
        <h2 className="text-xl font-bold tracking-wide">PROJECT SUMMARY — ROOFING ESTIMATE</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Project Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Project</span>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{summary.project_name || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Address</span>
            <p className="text-base text-gray-700 mt-0.5">{summary.address || '—'}</p>
          </div>
        </div>

        {/* Roof System Specifications */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
            Roof System Specifications
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            {specRows.map((r, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-medium text-gray-800">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
            Cost Summary
          </h3>
          <div className="space-y-1">
            {costRows.map((r, i) => {
              if (!r) return <div key={i} className="h-2" />
              return (
                <div
                  key={i}
                  className={`flex justify-between py-1.5 px-3 rounded ${
                    r.grand
                      ? 'bg-green-50 border-2 border-green-300 mt-2'
                      : r.bold
                        ? 'bg-gray-50 font-semibold'
                        : ''
                  }`}
                >
                  <span className={`text-sm ${r.grand ? 'text-green-900 font-bold' : r.bold ? 'text-gray-800' : 'text-gray-600'}`}>
                    {r.label}
                  </span>
                  <span className={`text-sm font-mono ${r.grand ? 'text-green-800 font-bold text-lg' : r.bold ? 'text-gray-900' : 'text-gray-700'}`}>
                    {fmt(r.value)}
                  </span>
                </div>
              )
            })}
          </div>

          {summary.roof_area_sq > 0 && (
            <div className="mt-3 text-right text-xs text-gray-500 font-mono">
              Cost per Square: {fmt(t.grandTotal / summary.roof_area_sq)}/sq
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ============================================================================
// PAGE 2: FLAT ROOF MATERIALS
// ============================================================================
function FlatRoofMaterialsPage({ materials, onUpdateMaterial }) {
  // Filter out metals (they go on Page 3)
  const flatMats = (materials || []).filter(m => !isMetalItem(m))

  if (flatMats.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">No flat roof materials in estimate</div>
  }

  // Sort by category order
  flatMats.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.material_category || 'accessory')
    const bi = CATEGORY_ORDER.indexOf(b.material_category || 'accessory')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const { sections, sectionOrder } = groupIntoSections(flatMats)
  const pageTotal = flatMats.reduce((s, m) => {
    const hasPU = m.purchase_unit && m.units_per_purchase
    const pQty = m.purchase_qty || Math.ceil(m.total_qty)
    const perUnit = hasPU
      ? (m.units_per_purchase * (m.unit_cost + (m.labor_cost || 0)))
      : (m.unit_cost + (m.labor_cost || 0))
    return s + (perUnit * pQty)
  }, 0)

  let lineNum = 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-800 px-6 py-4">
        <h2 className="text-lg font-bold text-white tracking-wide">FLAT ROOF MATERIALS</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-24" />
            <col className="w-16" />
            <col className="w-16" />
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-600">#</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-600">Description</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-600">Item Count</th>
              <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">Waste %</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-600">Qty</th>
              <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">Unit</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-600">Unit Cost</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-600">Extended Cost</th>
            </tr>
          </thead>
          {sectionOrder.map((sectionLabel) => {
            const items = sections[sectionLabel]
            return (
              <tbody key={sectionLabel}>
                {/* Section Header */}
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td colSpan={8} className="px-3 py-2.5 text-xs font-bold text-blue-800 uppercase tracking-wider">
                    {sectionLabel}
                  </td>
                </tr>
                {items.map((mat) => {
                  lineNum++
                  const hasPurchaseUnit = mat.purchase_unit && mat.units_per_purchase
                  const displayName = mat.product_name || mat.material_name
                  const purchaseQty = mat.purchase_qty || Math.ceil(mat.total_qty)
                  const displayUnit = hasPurchaseUnit ? mat.purchase_unit : fmtUnit(mat.unit)
                  const itemCount = hasPurchaseUnit ? fmtNum(mat.total_qty) + ' ' + fmtUnit(mat.unit) : null
                  const perUnitCost = hasPurchaseUnit
                    ? (mat.units_per_purchase * (mat.unit_cost + (mat.labor_cost || 0)))
                    : (mat.unit_cost + (mat.labor_cost || 0))
                  const extCost = perUnitCost * purchaseQty
                  const wastePct = mat.waste_pct || 0

                  // Find the original index in the full materials array for callbacks
                  const matKey = mat._idx

                  return (
                    <tr key={mat.material_name + mat.unit} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{lineNum}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-800">{displayName}</div>
                        {hasPurchaseUnit && (
                          <div className="text-xs text-gray-400">
                            {fmtNum(mat.units_per_purchase)} {fmtUnit(mat.unit)} per {mat.purchase_unit.toLowerCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-500">
                        {itemCount || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <EditableCell
                          value={Math.round(wastePct * 100)}
                          onSave={(v) => onUpdateMaterial(matKey, 'waste_pct', v / 100)}
                          suffix="%"
                          className="text-xs font-mono"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">
                        {fmtNum(purchaseQty)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{displayUnit}</td>
                      <td className="px-3 py-2.5 text-right">
                        <EditableCell
                          value={parseFloat(perUnitCost.toFixed(2))}
                          onSave={(v) => {
                            // Convert per-purchase-unit cost back to per-base-unit cost
                            const baseCost = hasPurchaseUnit
                              ? (v / mat.units_per_purchase) - (mat.labor_cost || 0)
                              : v - (mat.labor_cost || 0)
                            onUpdateMaterial(matKey, 'unit_cost', Math.max(0, baseCost))
                          }}
                          prefix="$"
                          className="font-mono text-gray-700"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">
                        {extCost > 0 ? fmt(extCost) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )
          })}
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td colSpan={7} className="px-3 py-3 text-right text-sm font-bold text-gray-700 uppercase">
                Page 2 Total:
              </td>
              <td className="px-3 py-3 text-right font-mono font-bold text-gray-900 text-base">
                {fmt(pageTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ============================================================================
// PAGE 3: ROOF RELATED METALS
// ============================================================================
function RoofMetalsPage({ materials, onUpdateMaterial }) {
  const metals = (materials || []).filter(m => isMetalItem(m))

  if (metals.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white tracking-wide">ROOF RELATED METALS</h2>
        </div>
        <div className="text-center py-8 text-gray-400 text-sm">No metal items in estimate</div>
      </div>
    )
  }

  const pageTotal = metals.reduce((s, m) => {
    const hasPU = m.purchase_unit && m.units_per_purchase
    const pQty = m.purchase_qty || Math.ceil(m.total_qty)
    const perUnit = hasPU
      ? (m.units_per_purchase * (m.unit_cost + (m.labor_cost || 0)))
      : (m.unit_cost + (m.labor_cost || 0))
    return s + (perUnit * pQty)
  }, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-800 px-6 py-4">
        <h2 className="text-lg font-bold text-white tracking-wide">ROOF RELATED METALS</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Description</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 w-16">Waste %</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-20">Qty</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 w-16">Unit</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-24">Unit Cost</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-28">Extended Cost</th>
            </tr>
          </thead>
          <tbody>
            {metals.map((mat, i) => {
              const hasPurchaseUnit = mat.purchase_unit && mat.units_per_purchase
              const displayName = mat.product_name || mat.material_name
              const purchaseQty = mat.purchase_qty || Math.ceil(mat.total_qty)
              const displayUnit = hasPurchaseUnit ? mat.purchase_unit : fmtUnit(mat.unit)
              const perUnitCost = hasPurchaseUnit
                ? (mat.units_per_purchase * (mat.unit_cost + (mat.labor_cost || 0)))
                : (mat.unit_cost + (mat.labor_cost || 0))
              const extCost = perUnitCost * purchaseQty
              const wastePct = mat.waste_pct || 0
              const matKey = mat._idx

              return (
                <tr key={mat.material_name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-800">{displayName}</div>
                    {hasPurchaseUnit && (
                      <div className="text-xs text-gray-400">
                        {fmtNum(mat.units_per_purchase)} {fmtUnit(mat.unit)} per {mat.purchase_unit.toLowerCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <EditableCell
                      value={Math.round(wastePct * 100)}
                      onSave={(v) => onUpdateMaterial(matKey, 'waste_pct', v / 100)}
                      suffix="%"
                      className="text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-700">{fmtNum(purchaseQty)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{displayUnit}</td>
                  <td className="px-4 py-2.5 text-right">
                    <EditableCell
                      value={parseFloat(perUnitCost.toFixed(2))}
                      onSave={(v) => {
                        const baseCost = hasPurchaseUnit
                          ? (v / mat.units_per_purchase) - (mat.labor_cost || 0)
                          : v - (mat.labor_cost || 0)
                        onUpdateMaterial(matKey, 'unit_cost', Math.max(0, baseCost))
                      }}
                      prefix="$"
                      className="font-mono text-gray-700"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">{extCost > 0 ? fmt(extCost) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-700 uppercase">
                Page 3 Total:
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-base">
                {fmt(pageTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ============================================================================
// PAGE 4: LABOR & GENERAL CONDITIONS
// ============================================================================
function LaborPage({ summary }) {
  if (!summary) return null

  const laborRate = 85.00
  const squares = summary.roof_area_sq || 0
  const laborTotal = squares * laborRate

  const laborRows = [
    {
      section: 'LABOR',
      items: [
        { desc: 'Flat Roof Installation Labor', qty: fmtNum(squares), unit: 'SQ', rate: fmt(laborRate), total: laborTotal },
      ]
    },
    {
      section: 'EQUIPMENT RENTAL',
      items: [
        { desc: 'Telehandler / Crane (if needed)', qty: 'TBD', unit: 'Rental', rate: '—', total: 0 },
      ]
    },
    {
      section: 'SITE FACILITIES',
      items: [
        { desc: 'Portable Toilets', qty: 'TBD', unit: 'Month', rate: '—', total: 0 },
        { desc: 'Dumpster - 30 Yard', qty: 'TBD', unit: 'Month', rate: '—', total: 0 },
      ]
    },
    {
      section: 'PERMITS & FEES',
      items: [
        { desc: 'Building Permit', qty: 'TBD', unit: 'LS', rate: 'Owner to verify', total: 0 },
      ]
    },
  ]

  const pageTotal = laborTotal
  let lineNum = 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-800 px-6 py-4">
        <h2 className="text-lg font-bold text-white tracking-wide">LABOR & GENERAL CONDITIONS</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">Description</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-20">Qty</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 w-16">Unit</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-24">Rate/Cost</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 w-28">Total</th>
            </tr>
          </thead>
          {laborRows.map(({ section, items }) => (
            <tbody key={section}>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td colSpan={6} className="px-4 py-2.5 text-xs font-bold text-blue-800 uppercase tracking-wider">
                  {section}
                </td>
              </tr>
              {items.map((item) => {
                lineNum++
                return (
                  <tr key={lineNum} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs w-10">{lineNum}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.desc}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 w-20">{item.qty}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 w-16">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 w-24">{item.rate}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900 w-28">
                      {item.total > 0 ? fmt(item.total) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-gray-700 uppercase">
                Page 4 Total:
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 text-base">
                {fmt(pageTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}


// ============================================================================
// PAGE 5: RECAP
// ============================================================================
function RecapPage({ materials, summary, pricing, onPricingChange }) {
  const allMats = materials || []
  const t = computeTotals(allMats, summary, pricing)

  return (
    <div>
      {/* Project Totals */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-lg font-bold text-white tracking-wide">PROJECT TOTALS</h2>
        </div>

        <div className="p-6">
          <table className="w-full text-sm">
            <tbody>
              {/* Cost Groups */}
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">Flat Roof Materials</td>
                <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.flatTotal)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">Roof Related Metals</td>
                <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.metalTotal)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">Labor & General Conditions</td>
                <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.laborTotal)}</td>
              </tr>
              {t.equipmentTotal > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-600">Equipment</td>
                  <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.equipmentTotal)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <td className="py-3 font-bold text-gray-800">SUBTOTAL</td>
                <td className="py-3 text-right font-mono font-bold text-gray-900">{fmt(t.subtotal)}</td>
              </tr>

              {/* Editable Markup */}
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">
                  Profit Markup{' '}
                  <span className="inline-flex items-center">
                    (<EditableCell
                      value={pricing.markupPct}
                      onSave={(v) => onPricingChange({ ...pricing, markupPct: v })}
                      suffix="%"
                      className="text-xs font-mono"
                    />)
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.markup)}</td>
              </tr>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <td className="py-3 font-bold text-gray-800">SUBTOTAL WITH MARKUP</td>
                <td className="py-3 text-right font-mono font-bold text-gray-900">{fmt(t.subtotalWithMarkup)}</td>
              </tr>

              {/* Sales Tax Section */}
              <tr className="border-b border-gray-100">
                <td colSpan={2} className="py-3">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-gray-700 font-medium text-sm">Sales Tax</span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onPricingChange({ ...pricing, taxMode: 'project' })}
                        className={`px-2.5 py-1 rounded-md border transition-colors ${
                          pricing.taxMode === 'project'
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        Project Level
                      </button>
                      <button
                        onClick={() => onPricingChange({ ...pricing, taxMode: 'group' })}
                        className={`px-2.5 py-1 rounded-md border transition-colors ${
                          pricing.taxMode === 'group'
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        By Group
                      </button>
                    </div>
                  </div>

                  {pricing.taxMode === 'project' ? (
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-gray-600 text-sm">
                        Project Tax{' '}
                        <span className="inline-flex items-center">
                          (<EditableCell
                            value={pricing.projectTaxPct}
                            onSave={(v) => onPricingChange({ ...pricing, projectTaxPct: v })}
                            suffix="%"
                            className="text-xs font-mono"
                          />)
                        </span>
                      </span>
                      <span className="font-mono text-gray-800">{fmt(t.tax)}</span>
                    </div>
                  ) : (
                    <div className="space-y-1 pl-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Material Tax{' '}
                          <span className="inline-flex items-center">
                            (<EditableCell
                              value={pricing.materialTaxPct}
                              onSave={(v) => onPricingChange({ ...pricing, materialTaxPct: v })}
                              suffix="%"
                              className="text-xs font-mono"
                            />)
                          </span>
                        </span>
                        <span className="font-mono text-gray-800 text-sm">
                          {fmt(t.materialTotal * (1 + t.markupPct) * (pricing.materialTaxPct / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Labor Tax{' '}
                          <span className="inline-flex items-center">
                            (<EditableCell
                              value={pricing.laborTaxPct}
                              onSave={(v) => onPricingChange({ ...pricing, laborTaxPct: v })}
                              suffix="%"
                              className="text-xs font-mono"
                            />)
                          </span>
                        </span>
                        <span className="font-mono text-gray-800 text-sm">
                          {fmt(t.laborTotal * (1 + t.markupPct) * (pricing.laborTaxPct / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Equipment Tax{' '}
                          <span className="inline-flex items-center">
                            (<EditableCell
                              value={pricing.equipmentTaxPct}
                              onSave={(v) => onPricingChange({ ...pricing, equipmentTaxPct: v })}
                              suffix="%"
                              className="text-xs font-mono"
                            />)
                          </span>
                        </span>
                        <span className="font-mono text-gray-800 text-sm">
                          {fmt(t.equipmentTotal * (1 + t.markupPct) * (pricing.equipmentTaxPct / 100))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200 font-medium">
                        <span className="text-gray-700 text-sm">Total Tax</span>
                        <span className="font-mono text-gray-900">{fmt(t.tax)}</span>
                      </div>
                    </div>
                  )}
                </td>
              </tr>

              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <td className="py-3 font-bold text-gray-800">SUBTOTAL WITH TAX</td>
                <td className="py-3 text-right font-mono font-bold text-gray-900">{fmt(t.subtotalWithTax)}</td>
              </tr>

              {/* P&P Bond */}
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-600">
                  P&P Bond{' '}
                  <span className="inline-flex items-center">
                    (<EditableCell
                      value={pricing.bondPct}
                      onSave={(v) => onPricingChange({ ...pricing, bondPct: v })}
                      suffix="%"
                      className="text-xs font-mono"
                    />)
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-gray-800">{fmt(t.bond)}</td>
              </tr>

              {/* Grand Total */}
              <tr className="bg-green-50 border-2 border-green-300">
                <td className="py-4 px-3 font-bold text-green-900 text-base">GRAND TOTAL</td>
                <td className="py-4 px-3 text-right font-mono font-bold text-green-800 text-lg">{fmt(t.grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          {summary?.roof_area_sq > 0 && (
            <div className="mt-3 text-right text-xs text-gray-500 font-mono">
              Cost per Square: {fmt(t.grandTotal / summary.roof_area_sq)}/sq
            </div>
          )}
        </div>
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
// PAGE TABS
// ============================================================================
const PAGES = [
  { key: 'summary', label: 'Project Summary', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'flat', label: 'Flat Roof Materials', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { key: 'metals', label: 'Roof Metals', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z' },
  { key: 'labor', label: 'Labor & GC', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'recap', label: 'Recap', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z' },
]

// Default pricing configuration
const DEFAULT_PRICING = {
  markupPct: 25,
  taxMode: 'project',       // 'project' or 'group'
  projectTaxPct: 8.25,
  materialTaxPct: 8.25,
  laborTaxPct: 0,
  equipmentTaxPct: 0,
  bondPct: 0,
}

// Shared helper: compute extended cost for a material
function calcExtCostShared(m) {
  const hasPU = m.purchase_unit && m.units_per_purchase
  const pQty = m.purchase_qty || Math.ceil(m.total_qty)
  const perUnit = hasPU
    ? (m.units_per_purchase * (m.unit_cost + (m.labor_cost || 0)))
    : (m.unit_cost + (m.labor_cost || 0))
  return perUnit * pQty
}

// Compute all totals from materials, summary, and pricing
function computeTotals(materials, summary, pricing) {
  const flatTotal = (materials || [])
    .filter(m => !isMetalItem(m))
    .reduce((s, m) => s + calcExtCostShared(m), 0)

  const metalTotal = (materials || [])
    .filter(m => isMetalItem(m))
    .reduce((s, m) => s + calcExtCostShared(m), 0)

  const materialTotal = flatTotal + metalTotal
  const laborTotal = summary?.labor_total || 0
  const equipmentTotal = summary?.equipment_total || 0
  const subtotal = materialTotal + laborTotal + equipmentTotal

  const markupPct = (pricing.markupPct || 0) / 100
  const markup = subtotal * markupPct
  const subtotalWithMarkup = subtotal + markup

  // Tax calculation
  let tax = 0
  if (pricing.taxMode === 'group') {
    tax += materialTotal * (1 + markupPct) * ((pricing.materialTaxPct || 0) / 100)
    tax += laborTotal * (1 + markupPct) * ((pricing.laborTaxPct || 0) / 100)
    tax += equipmentTotal * (1 + markupPct) * ((pricing.equipmentTaxPct || 0) / 100)
  } else {
    tax = subtotalWithMarkup * ((pricing.projectTaxPct || 0) / 100)
  }

  const subtotalWithTax = subtotalWithMarkup + tax

  // P&P Bond
  const bondPct = (pricing.bondPct || 0) / 100
  const bond = subtotalWithTax * bondPct

  const grandTotal = subtotalWithTax + bond

  return {
    flatTotal, metalTotal, materialTotal,
    laborTotal, equipmentTotal, subtotal,
    markupPct, markup, subtotalWithMarkup,
    tax, subtotalWithTax,
    bondPct, bond, grandTotal,
  }
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
  const [activePage, setActivePage] = useState('summary')
  const [savedStatus, setSavedStatus] = useState(null)
  const [pricing, setPricing] = useState({ ...DEFAULT_PRICING })

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

  // Save estimate snapshot (includes pricing)
  const handleSave = async () => {
    if (!estimate) return
    setSaving(true)
    try {
      const dataToSave = { ...estimate, pricing }
      await estimateAPI.save(projectId, dataToSave)
      setSavedStatus('Saved!')
      setTimeout(() => setSavedStatus(null), 3000)
    } catch {
      setError('Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

  // Load previously saved estimate (restores pricing)
  const handleLoadSaved = async () => {
    try {
      const res = await estimateAPI.load(projectId)
      if (res.data?.estimate_data) {
        const loaded = res.data.estimate_data
        if (loaded.pricing) {
          setPricing({ ...DEFAULT_PRICING, ...loaded.pricing })
        }
        setEstimate(loaded)
        setSavedStatus('Loaded saved estimate')
        setTimeout(() => setSavedStatus(null), 3000)
      }
    } catch {
      setError('No saved estimate found')
    }
  }

  // Handle inline edits to a consolidated material row
  const handleUpdateMaterial = (idx, field, value) => {
    if (!estimate?.consolidated_materials) return

    const updated = { ...estimate }
    const mats = [...updated.consolidated_materials]
    const mat = { ...mats[idx] }

    if (field === 'unit_cost') {
      mat.unit_cost = value
    } else if (field === 'waste_pct') {
      // Recalculate total_qty from base_qty and new waste %
      const baseQty = mat.base_qty || (mat.total_qty / (1 + (mat.waste_pct || 0)))
      mat.waste_pct = value
      mat.total_qty = Math.round(baseQty * (1 + value) * 100) / 100
    }

    // Recalculate derived values
    const unitCost = mat.unit_cost || 0
    const laborCost = mat.labor_cost || 0
    mat.total_cost = Math.round(mat.total_qty * (unitCost + laborCost) * 100) / 100

    const pUnit = mat.purchase_unit
    const pPer = mat.units_per_purchase
    if (pUnit && pPer && pPer > 0) {
      mat.purchase_qty = Math.ceil(mat.total_qty / pPer)
      mat.purchase_cost = Math.round(mat.purchase_qty * pPer * (unitCost + laborCost) * 100) / 100
    } else {
      mat.purchase_qty = Math.ceil(mat.total_qty)
      mat.purchase_cost = mat.total_cost
    }

    mats[idx] = mat
    updated.consolidated_materials = mats
    setEstimate(updated)
  }

  if (loading) return <LoadingSpinner />

  // Tag each material with its index so sub-pages can call back
  const taggedMaterials = estimate?.consolidated_materials?.map((m, i) => ({
    ...m,
    _idx: i,
    base_qty: m.base_qty || (m.total_qty / (1 + (m.waste_pct || 0)))
  }))

  return (
    <div>
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
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
        <div className="space-y-4">
          {/* Errors */}
          <ErrorsPanel errors={estimate.errors} />

          {/* Page Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {PAGES.map(page => (
              <button
                key={page.key}
                onClick={() => setActivePage(page.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activePage === page.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={page.icon} />
                </svg>
                {page.label}
              </button>
            ))}
          </div>

          {/* Page Content */}
          {activePage === 'summary' && (
            <ProjectSummaryPage
              summary={estimate.summary}
              totals={computeTotals(taggedMaterials, estimate.summary, pricing)}
              pricing={pricing}
              onPricingChange={setPricing}
            />
          )}
          {activePage === 'flat' && (
            <FlatRoofMaterialsPage materials={taggedMaterials} onUpdateMaterial={handleUpdateMaterial} />
          )}
          {activePage === 'metals' && (
            <RoofMetalsPage materials={taggedMaterials} onUpdateMaterial={handleUpdateMaterial} />
          )}
          {activePage === 'labor' && (
            <LaborPage summary={estimate.summary} />
          )}
          {activePage === 'recap' && (
            <RecapPage
              materials={taggedMaterials}
              summary={estimate.summary}
              pricing={pricing}
              onPricingChange={setPricing}
            />
          )}
        </div>
      )}
    </div>
  )
}
